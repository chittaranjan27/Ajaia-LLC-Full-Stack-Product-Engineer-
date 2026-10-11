# Ajaia Docs — System Architecture & Design Specification

This document provides a comprehensive architectural breakdown of **Ajaia Docs**, a collaborative, secure document editor inspired by Google Docs, built with React 19, TypeScript, Tiptap, Tailwind CSS, and Supabase.

---

## 1. High-Level Architecture Overview

Ajaia Docs is structured as a modern Client-BaaS (Backend-as-a-Service) single-page application:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 19 + TypeScript SPA                       │
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Auth & Session     │  │ Document Manager │  │  Tiptap Editor   │  │
│  │   Context Provider   │  │ Dashboard Views  │  │ Autosave Engine  │  │
│  └──────────┬───────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│             │                       │                     │            │
│  ┌──────────▼───────────────────────▼─────────────────────▼─────────┐  │
│  │                    Document & Sharing Services                    │  │
│  │         (Data normalization, Race-condition controllers)         │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ Supabase Client (Anon Key)
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Supabase Cloud Platform                         │
│                                                                        │
│  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
│  │    GoTrue Auth       │  │             PostgreSQL Database        │  │
│  │  - JWT Verification  │  │  - public.documents                    │  │
│  │  - User Management   │  │  - public.document_shares              │  │
│  └──────────────────────┘  │  - RLS Policies (SELECT/INSERT/UPDATE) │  │
│                            │  - Non-recursive Security Functions    │  │
│                            │  - Secure RPC User Lookup              │  │
│                            └────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1. Authentication Subsystem
- **Provider**: Supabase Auth (`supabase.auth`).
- **State Management**: `AuthContext` exposes `user`, `session`, `loading`, `signIn`, `signUp`, and `signOut`.
- **Session Lifecycle**:
  - Restores active session on page refresh via `supabase.auth.getSession()`.
  - Subscribes to auth state changes via `onAuthStateChange`.
  - Protects dashboard and editor views: unauthenticated users are directed to the login/signup interface.

### 2.2. Rich Text & ProseMirror Engine (Tiptap)
- **Engine**: `@tiptap/react` built on ProseMirror.
- **Extensions**:
  - `StarterKit` (Paragraph, Heading 1 & 2, Bold, Italic, BulletList, OrderedList, Blockquote, History).
  - `@tiptap/extension-underline`: Text underline styling.
  - `@tiptap/extension-placeholder`: Floating placeholder prompting the user when empty.
- **Content Tree**: Stored as structured JSON (AST) in `documents.content_json` (`jsonb` column).
- **Safe Normalization**: `normalizeTiptapContent` ensures malformed or legacy strings are safely coerced into valid ProseMirror document trees (`{ type: 'doc', content: [...] }`), preventing editor initialization crashes.

### 2.3. Autosave & Concurrency Engine
- **Debounced Save**: Content edits trigger a 700ms debounce timer before persisting to the database.
- **Race Condition & Monotonic Revision Guard**:
  - Rapid keystrokes trigger asynchronous network requests that could return out of order.
  - The persistence controller assigns a monotonically increasing revision counter (`revisionId`).
  - Responses from stale, slower requests are discarded if a newer revision has already succeeded.
- **Memory Retention on Failure**:
  - If a network error occurs, pending content remains in memory and enters an `error` state.
  - Users are presented with a persistent "Save failed — Click to retry" action.

### 2.4. File Import Subsystem (`src/features/documents/fileImport.ts`)
- **Supported Formats**: Plain text (`.txt`) and Markdown (`.md`, `.markdown`).
- **File Validation**:
  - Max file size: 1 MB (`MAX_IMPORT_FILE_SIZE_BYTES = 1,048,576`).
  - Extension and MIME validation with browser MIME inconsistency fallback.
- **Markdown AST Translation**:
  - Headings (`#`, `##`) -> Tiptap `heading` nodes with levels.
  - Bold (`**` / `__`), Italic (`*` / `_`), Underline (`<u>`), Code (`` ` ``) -> Tiptap marks.
  - Lists (`-`, `*`, `1.`) -> Tiptap `bulletList` and `orderedList` structures.
  - Auto-derives sensible document title from the imported filename.

---

## 3. Database Schema & Row Level Security (RLS)

### 3.1. Entity Relationship
```
auth.users (Supabase Managed)
    ▲                      ▲
    │ 1                    │ 1
    │ owner_id             │ user_id
    │                      │
public.documents ◄──────── public.document_shares
      1            document_id       N
```

### 3.2. Table Schemas

#### `public.documents`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique document identifier |
| `title` | `TEXT` | `NOT NULL DEFAULT 'Untitled document'` | Document title |
| `content_json` | `JSONB` | `NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'` | ProseMirror AST tree |
| `owner_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Owner user ID |
| `created_at` | `TIMESTAMPTZ`| `DEFAULT now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ`| `DEFAULT now()` | Last update timestamp |

#### `public.document_shares`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `document_id` | `UUID` | `REFERENCES public.documents(id) ON DELETE CASCADE` | Target document |
| `user_id` | `UUID` | `REFERENCES auth.users(id) ON DELETE CASCADE` | Recipient user |
| `permission` | `TEXT` | `CHECK (permission IN ('viewer', 'editor', 'view', 'edit'))` | Granted role |
| `created_at` | `TIMESTAMPTZ`| `DEFAULT now()` | Share grant timestamp |
| *(PK)* | `(document_id, user_id)` | `PRIMARY KEY` | Enforces one share per user/doc |

---

## 4. Security Architecture & RLS Policies

### 4.1. The PostgreSQL Infinite Recursion Challenge (42P17)
In standard RLS policies, having `documents` query `document_shares` while `document_shares` queries `documents` causes PostgreSQL to detect infinite recursion:
```
ERROR: 42P17: infinite recursion detected in policy for relation "documents"
```
**Solution Implemented**:
We implemented `SECURITY DEFINER` helper functions with a pinned `search_path`:
1. `public.is_document_owner(doc_id UUID, check_user_id UUID)`
2. `public.can_edit_document(doc_id UUID, check_user_id UUID)`

Because these execute with elevated definer privilege in a stable context, PostgreSQL evaluates ownership without re-triggering caller RLS recursion cycles.

### 4.2. Policy Matrix

| Policy Name | Target | Operation | Condition (`USING` / `WITH CHECK`) |
| :--- | :--- | :--- | :--- |
| `documents_select_policy` | `documents` | `SELECT` | `owner_id = auth.uid() OR EXISTS in document_shares` |
| `documents_insert_policy` | `documents` | `INSERT` | `owner_id = auth.uid()` |
| `documents_update_policy` | `documents` | `UPDATE` | `(owner_id = auth.uid() OR permission = 'editor')` AND `owner_id unchanged` |
| `documents_delete_policy` | `documents` | `DELETE` | `owner_id = auth.uid()` (Strictly owner only) |
| `document_shares_select_policy` | `document_shares` | `SELECT` | `user_id = auth.uid() OR is_document_owner(document_id)` |
| `document_shares_insert_policy` | `document_shares` | `INSERT` | `is_document_owner(document_id) AND user_id != auth.uid()` |
| `document_shares_update_policy` | `document_shares` | `UPDATE` | `is_document_owner(document_id)` |
| `document_shares_delete_policy` | `document_shares` | `DELETE` | `is_document_owner(document_id)` |

### 4.3. Privacy-Preserving Recipient Lookup
- Standard client queries cannot query `auth.users` for security reasons. Exposing service-role keys to client browsers violates Zero Trust architecture.
- We created a dedicated PostgreSQL RPC: `public.lookup_user_by_email(lookup_email TEXT)`:
  - Verified caller: `auth.uid() IS NOT NULL`.
  - Case-insensitive exact match: `lower(u.email) = lower(trim(lookup_email))`.
  - Exposes only `id` and `email` of the specific recipient.
  - Prevents enumeration of the auth user database.

---

## 5. UI Permission Enforcement vs RLS Defense-in-Depth

| Capability | UI Enforcement | Database (RLS) Enforcement |
| :--- | :--- | :--- |
| **Edit Content** | Canvas disabled, read-only banner shown to Viewers | Denied by `documents_update_policy` (requires editor/owner) |
| **Rename Title** | Input disabled for Viewers | Denied by `documents_update_policy` |
| **Delete Document** | Action button hidden for Non-Owners | Denied by `documents_delete_policy` (owner check) |
| **Open Share Modal** | Share button hidden for Non-Owners | Denied by `document_shares_*_policy` |
| **Self-Sharing** | Form validation blocks owner email | Denied by `document_shares_insert_policy` check |
| **Ownership Transfer** | No UI option | Denied by `documents_update_policy` `WITH CHECK` |
