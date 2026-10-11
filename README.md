# Ajaia Docs — Full Stack Collaborative Document Editor

A lightweight, high-performance collaborative document editor inspired by Google Docs, built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Tiptap**, and **Supabase**.

Developed as part of the **Ajaia LLC Full Stack Product Engineer** assignment.

---

## Features Overview

### 1. Document Dashboard & Navigation
- **Owned by Me & Shared with Me**: Clean separation of user-owned documents versus shared team documents.
- **Search & Filter**: Real-time title search and category-based filtering.
- **Empty States & Loading**: Polished skeleton loading indicators and intuitive zero-document placeholders.
- **Quick Actions**: One-click new document creation, rename dialogs, and deletion confirmations.

### 2. Rich Text Editor (Tiptap Engine)
- **Formatting Support**: Headings (H1 & H2), bold, italic, underline, bullet lists, ordered lists, and blockquotes.
- **Live State Indicators**: Interactive toolbar with keyboard shortcuts and active-state toggles.
- **Debounced Autosave**: Automatic save triggered ~700ms after user pauses typing.
- **Concurrency & Out-of-Order Save Guard**: Monotonic revision tracking ensures older delayed saves never overwrite newer edits.
- **Status Reporting**: Live "Saving", "Saved", and "Save failed" states with one-click manual retry.

### 3. File Import Engine
- **Supported Formats**: Imports `.txt` and `.md` (Markdown) documents under 1 MB.
- **Syntax Parsing**: Converts Markdown headings, bold, italic, underline, inline code, and lists into structured Tiptap JSON.
- **Validation**: Strict file extension and size validation with friendly error banners.

### 4. Secure Document Sharing & Permissions (Phase 6)
- **Role-Based Access Control**:
  - **Owner**: Read, edit, rename, delete, share, and revoke access.
  - **Editor**: Read, edit content, and rename title. Prohibited from deleting or managing shares.
  - **Viewer**: Read-only access. Editor canvas is locked with a prominent banner; title editing and autosave are disabled.
  - **Unshared Users**: Zero access.
- **Enterprise-Grade Row Level Security (RLS)**:
  - Enforced directly at the PostgreSQL layer, preventing unauthorized bypasses.
  - Prohibits mutating `owner_id` (preventing ownership hijacking).
  - Uses `SECURITY DEFINER` non-recursive helper functions (`is_document_owner`, `can_edit_document`) to prevent PostgreSQL infinite recursion errors (`42P17`).
- **Privacy-Preserving User Lookup**:
  - Secure PostgreSQL RPC `lookup_user_by_email` restricted to authenticated users.
  - Exact case-insensitive matching; never enumerates the global `auth.users` directory to the client.
  - Dedicated RPC `get_document_shares_with_emails` for owner collaborator management.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript |
| **Build Tool & Bundler** | Vite 8 + @tailwindcss/vite |
| **Rich Text Editor** | Tiptap (ProseMirror core, StarterKit, Underline, Placeholder) |
| **Icons & Design** | Lucide React + Tailwind CSS |
| **Backend & Database** | Supabase (PostgreSQL, Auth, Row Level Security) |
| **Testing** | Node.js Test Runner + tsx + oxlint |

---

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Supabase](https://supabase.com/) account and project

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/chittaranjan27/Ajaia-LLC---Full-Stack-Product-Engineer.git
cd Ajaia-LLC---Full-Stack-Product-Engineer

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` and add your Supabase project credentials:
```bash
cp .env.example .env.local
```
Inside `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Supabase Database Setup
1. In your Supabase project dashboard, navigate to the **SQL Editor**.
2. Run the migration script located at:
   ```
   supabase/migrations/20261011_document_sharing_and_rls.sql
   ```
   This creates the `documents` and `document_shares` tables, RLS security functions, secure RPCs, and granular Row Level Security policies.
3. Ensure **Email Auth** is enabled under Authentication → Providers.

### 5. Running the Application
```bash
# Start local development server
npm run dev

# Run automated test suites
npm test

# Run code linter
npm run lint

# Build production bundle
npm run build
```

---

## Test Verification

The project includes unit and end-to-end simulation test suites:
```bash
npm test
```
- **`test/sharing-permissions.test.mjs`**: Validates role capability matrix, self-sharing rejection, duplicate share detection, and full 8-step sharing lifecycle across Account A, Account B, and Account C.
- **`test/editor-persistence.test.mjs`**: Validates Tiptap AST normalization, formatting round-trips, and out-of-order autosave guards.
- **`test/e2e-import-simulation.mjs`**: Validates `.txt` and `.md` file imports, 1MB size bounds, and ProseMirror AST generation.

---

## License
MIT
