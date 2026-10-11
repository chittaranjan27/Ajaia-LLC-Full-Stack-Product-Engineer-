# AI Pair Programming Workflow & Engineering Log

This document reflects the AI-assisted pair programming methodology, engineering workflow, prompt progression, and iterative verification loops utilized during the development of **Ajaia Docs**.

---

## 1. Development Methodology & Phased Progression

The project was executed through disciplined, incremental phases to ensure modularity, architectural integrity, and verification at each milestone:

```
Phase 1: UI Foundation & Design System (React + Tailwind CSS)
   │
   ▼
Phase 2: Database Schema & Supabase Client Integration
   │
   ▼
Phase 3: Authentication & Document Management CRUD
   │
   ▼
Phase 4: ProseMirror / Tiptap Rich Text Editor & Autosave
   │
   ▼
Phase 5: File Import Engine (.txt / .md Parsing & AST Generation)
   │
   ▼
Phase 6: Secure Document Sharing & Enterprise Row Level Security (RLS)
   │
   ▼
Phase 7: Comprehensive Security Audit, Testing & Submission Preparation
```

---

## 2. Iterative Prompting & Verification Cycles

### Prompting Strategy
1. **Explicit Constraints**: Each phase maintained clear boundaries (e.g., "Do not overwrite working editor code", "Do not expose service-role keys", "Enforce permissions in Supabase RLS, not just frontend buttons").
2. **Context Preservation**: Avoided monolithic rewrites. Each change was targeted to specific domain modules (`fileImport.ts`, `documentService.ts`, `ShareModal.tsx`).
3. **Verification Before Progression**: Every step was accompanied by automated tests and compilation checks before marking complete.

---

## 3. Key Technical Challenges & AI-Assisted Resolutions

### Challenge 1: PostgreSQL RLS Infinite Recursion (Error `42P17`)
- **Problem**: When `documents` RLS policies query `document_shares`, and `document_shares` RLS policies query `documents` to verify ownership, PostgreSQL triggers:
  ```
  ERROR: 42P17: infinite recursion detected in policy for relation "documents"
  ```
- **Resolution**:
  - Structured `SECURITY DEFINER` helper functions (`is_document_owner` and `can_edit_document`) with a fixed `SET search_path = public`.
  - These execute in a stable context that bypasses caller RLS evaluation, breaking the circular dependency while upholding strict security boundaries.

### Challenge 2: Autosave Concurrency & Out-of-Order Network Responses
- **Problem**: In debounced cloud autosave, rapid user typing causes overlapping asynchronous HTTP requests. If Request #1 (older edit) experiences higher network latency and completes after Request #2 (newer edit), it risks overwriting the newer state.
- **Resolution**:
  - Implemented monotonic revision numbering in the persistence controller.
  - Delayed responses with lower revision IDs than the confirmed revision are safely ignored.
  - Automated tests in `test/editor-persistence.test.mjs` explicitly simulate and assert this race-condition guard.

### Challenge 3: User Directory Privacy vs. Sharing by Email
- **Problem**: Allowing document owners to share by email normally requires querying the user database. However, exposing `auth.users` directly to the client browser is an unacceptable security hazard and privacy breach.
- **Resolution**:
  - Implemented the PostgreSQL RPC `lookup_user_by_email` restricted to authenticated callers (`auth.uid() IS NOT NULL`).
  - Queries `auth.users` using exact, case-insensitive equality, returning only the recipient's `id` and `email` for the specific match.
  - Prevents listing or scraping of registered users.

### Challenge 4: ProseMirror AST Corruption & Browser Incompatibilities
- **Problem**: Inconsistent markdown syntax or corrupted string representations stored in `content_json` can cause Tiptap's ProseMirror schema parser to fail and freeze the editor.
- **Resolution**:
  - Implemented `normalizeTiptapContent` as a defensive gatekeeper: safely verifies object trees or parses JSON strings, falling back to a canonical `DEFAULT_TIPTAP_DOC` if corrupted.
  - Implemented resilient Markdown parsing with fallback for empty or missing browser MIME types during file import.

---

## 4. Test-Driven Verification Loop

Every iteration concluded with a 3-tier validation pipeline:

1. **Static Analysis & Type Checking**:
   ```bash
   npm run build  # executes: tsc -b && vite build
   ```
   Ensures zero TypeScript compiler errors or mismatched interfaces.

2. **Code Quality Linting**:
   ```bash
   npm run lint   # executes: oxlint
   ```
   Ensures zero ESLint / Oxlint warnings and prevents dead code or memory leaks.

3. **Automated Unit & E2E Simulation Testing**:
   ```bash
   npm test       # executes: tsx --test test/...
   ```
   Simulates all 8 requirements of multi-user access control, file import edge cases, and ProseMirror serialization.

---

## 5. Engineering Reflections

- **Defense in Depth**: Frontend UI controls (disabled inputs, hidden buttons) are purely for user experience. True security must always be enforced at the database layer through PostgreSQL Row Level Security.
- **Zero Trust Client Model**: Never assume client-sent payloads are well-formed. Enforce ownership invariance and permission bounds with database `WITH CHECK` clauses.
- **Modular Testability**: Abstracting business rules (such as permission evaluation and AST transformation) into standalone pure functions enables rapid, deterministic testing without requiring continuous cloud database roundtrips.
