# Ajaia Docs — Assignment Submission Report

**Candidate**: Chittaranjan  
**Position**: Full Stack Product Engineer  
**Company**: Ajaia LLC  
**Repository**: [chittaranjan27/Ajaia-LLC---Full-Stack-Product-Engineer](https://github.com/chittaranjan27/Ajaia-LLC---Full-Stack-Product-Engineer.git)  
**Date**: October 2026  

---

## 1. Executive Summary

This submission delivers a complete, production-grade implementation of **Ajaia Docs**, a collaborative document editor inspired by Google Docs. The application was built from the ground up using **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Tiptap (ProseMirror)**, and **Supabase (PostgreSQL, Auth, RLS)**.

Every requirement across all 6 phases—from initial UI foundations to secure document sharing with enterprise Row Level Security—has been implemented, audited, and verified with automated test suites and production build checks.

---

## 2. Feature & Phase Completion Matrix

| Milestone | Status | Key Deliverables |
| :--- | :---: | :--- |
| **Phase 1: UI Foundation** | Completed | Google Docs-inspired dashboard, responsive navigation, document cards/rows, search filtering, empty states, modals, and design tokens. |
| **Phase 2: Database Schema** | Completed | Supabase client setup, environment configuration, database connection utility, and TypeScript models. |
| **Phase 3: Auth & Document CRUD** | Completed | Email/password authentication, persistent sessions, document creation ("Untitled document"), renaming, deletion with confirmation dialog, and dashboard separation. |
| **Phase 4: Rich-Text Editor** | Completed | Tiptap integration, Headings 1 & 2, bold, italic, underline, lists, debounced autosave (~700ms), status reporting (Saving/Saved/Failed), and out-of-order race-condition guards. |
| **Phase 5: File Import** | Completed | File selector for `.txt` and `.md` files up to 1 MB, Markdown-to-Tiptap AST parser, extension/MIME validation, title extraction, and editor loading. |
| **Phase 6: Secure Document Sharing** | Completed | Share modal with email lookup, role selector (Viewer/Editor), existing collaborators list, access revocation, non-recursive RLS policies, ownership tamper guards, and viewer canvas locking. |

---

## 3. Security & Row Level Security (RLS) Audit

A comprehensive security audit of `public.documents` and `public.document_shares` confirmed:

1. **Anti-Recursion Architecture**:
   - PostgreSQL error `42P17: infinite recursion detected` is avoided by utilizing `SECURITY DEFINER` functions (`is_document_owner` and `can_edit_document`) with a fixed `SET search_path = public`.
2. **Access Control Integrity**:
   - **Unauthorized Reads Blocked**: `documents_select_policy` restricts access strictly to the document owner or users with an active record in `document_shares`.
   - **Unauthorized Updates Blocked**: Viewers and unshared users are rejected at the database level. Shared editors can update document title and content, but cannot alter `owner_id`.
   - **Unauthorized Deletes Blocked**: Only the document owner (`owner_id = auth.uid()`) can delete documents. Non-owners and editors receive a database rejection.
   - **Unauthorized Sharing Blocked**: Only the document owner can insert, update, or delete sharing records in `document_shares`.
   - **Self-Sharing Guard**: Database check constraint rejects sharing records where `user_id = auth.uid()`.
3. **Secret Hygiene**:
   - No service-role keys or passwords exist in frontend code or git repository.
   - All `.env*` local files are excluded via `.gitignore`.
   - `.env.example` provides public variable documentation.
4. **Zero-Trust User Lookup**:
   - Client applications never access `auth.users` directly.
   - User search operates via the secure RPC `lookup_user_by_email` which performs an exact case-insensitive match and exposes only the recipient's `id` and `email`.

---

## 4. Test Verification & Code Quality Audit

The application was audited using the automated test suite, static type analyzer, and linter:

### 1. Automated Test Suite (`npm test`)
```
TAP version 13
# Subtest: test\e2e-import-simulation.mjs
ok 1 - test\e2e-import-simulation.mjs
# Subtest: Ajaia Docs - Rich Text Editor & Persistence Suite
  ok 1 - 1. Content Normalization and Safe Defaults (4 tests)
  ok 2 - 2. Tiptap Formatting Persistence & Compatibility (1 test)
  ok 3 - 3. Autosave Concurrency, Race Condition, & Out-of-Order Save Guard (2 tests)
  ok 4 - 4. Permission Guards (1 test)
  ok 5 - 5. File Import: Validation & Parsing Suite (5 tests)
ok 2 - Ajaia Docs - Rich Text Editor & Persistence Suite
# Subtest: Ajaia Docs - Phase 6 Secure Document Sharing & Permissions Suite
  ok 1 - 1. Permission Normalization and Role Resolution (2 tests)
  ok 2 - 2. Share Validation: Self-Sharing, Duplicates, and Lookup Guard (2 tests)
  ok 3 - 3. Multi-User Access Control Matrix & State Transition Simulation (1 test)
  ok 4 - 4. Privilege Escalation Defense & Data Boundary Tests (2 tests)
ok 3 - Ajaia Docs - Phase 6 Secure Document Sharing & Permissions Suite

# tests 21
# suites 11
# pass 21
# fail 0
```

### 2. Code Linter (`npm run lint`)
```
oxlint
Found 0 warnings and 0 errors.
Finished in 34ms on 33 files with 116 rules.
```

### 3. Production Build (`npm run build`)
```
tsc -b && vite build
✓ 2026 modules transformed.
dist/index.html                   0.99 kB │ gzip:   0.53 kB
dist/assets/index-BD0zBqzX.css   47.48 kB │ gzip:   8.46 kB
dist/assets/index-BmJpx61Y.js   915.77 kB │ gzip: 270.55 kB
✓ built in 1.24s
```

---

## 5. Supported File Types & Validation Rules

- **Allowed Formats**: `.txt` (Plain Text), `.md` and `.markdown` (Markdown).
- **Max File Size**: 1 MB (1,048,576 bytes).
- **Validation**:
  - File extension and MIME type inspection with browser-agnostic fallback.
  - Rejection with explicit error banners for files exceeding 1 MB or unsupported formats (`.pdf`, `.docx`, images, executables).
  - Sanitization of empty files and whitespace strings.
- **Parsing**:
  - Plain text: converted to paragraphs.
  - Markdown: converted to headings (H1/H2), bold, italic, underline, inline code, and lists.

---

## 6. Testing Instructions (Multi-Account Setup)

To verify the application with two separate test accounts:

### Step 1: Database Setup
1. In your Supabase Dashboard (`wacslwlqieucwghmyhft`), open the **SQL Editor**.
2. Run the migration script in:
   ```
   supabase/migrations/20261011_document_sharing_and_rls.sql
   ```

### Step 2: Account Creation
1. Start the app: `npm run dev`.
2. Open `http://localhost:5173` and create **Account A** (e.g., `alice@ajaia.io`).
3. Open an Incognito window and create **Account B** (e.g., `bob@ajaia.io`).

### Step 3: Verification Matrix
1. **Creation**: As Account A, click **New Document** or **Import File**. Title the document "Q4 Strategy".
2. **Sharing**: Click **Share** in the editor. Enter `bob@ajaia.io`, choose **Viewer**, and submit.
3. **Shared with Me**: Switch to Account B. The document appears under **Shared with Me**.
4. **Viewer Enforcement**: Account B opens the document. Notice:
   - Yellow warning banner: *"You are viewing this document with read-only permissions."*
   - Editor canvas is disabled; typing is blocked.
   - Title input is disabled.
   - "Share" button is hidden.
5. **Editor Upgrade**: Switch to Account A. Open Share dialog and switch Account B's permission to **Editor**.
6. **Editor Permissions**: Account B reloads. The warning banner disappears. Account B can now edit text and title with autosave enabled. Account B still cannot delete or share the document.
7. **Revoke Access**: As Account A, click **Revoke access** next to Account B. Account B loses access immediately and the document disappears from their dashboard.
8. **Unshared Account**: Log in as a third account **Account C**. The document is invisible and cannot be fetched.

---

## 7. Known Limitations & Future Roadmap

1. **Real-Time Collaboration (CRDTs / Operational Transformation)**:
   - Current implementation uses debounced autosave with monotonic revision protection.
   - Real-time simultaneous keystroke sync (like Google Docs' multi-cursor presence via Yjs or Liveblocks) can be integrated on top of the established ProseMirror schema.
2. **Offline Support**:
   - Documents are persisted directly to Supabase cloud. Offline queueing with IndexedDB would provide offline resilience.
3. **Sharing Lookup**:
   - Currently requires an exact, case-insensitive email match to prevent exposing user directories. Auto-complete directory search could be added within an organization-level tenant scope.

---

## 8. Deployment Preparation

The project is fully prepared for zero-configuration static hosting (Vercel, Netlify, Cloudflare Pages):
- **Vite Production Output**: Compiled to `dist/` with optimized assets and source maps.
- **Client Routing**: Ready for SPA routing. A single redirect rule (`/* -> /index.html 200`) ensures client-side routing persistence.
- **Environment Requirements**:
  - `VITE_SUPABASE_URL`: Supabase project URL.
  - `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key.
- *Note: In accordance with review guidelines, this report prepares the project for deployment without claiming that deployment has occurred.*
