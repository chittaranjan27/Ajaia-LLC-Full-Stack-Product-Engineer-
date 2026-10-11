# Ajaia Docs — Full Stack Collaborative Document Editor

A lightweight, high-performance collaborative document editor inspired by Google Docs, built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Tiptap**, and **Supabase**.

Developed as part of the **Ajaia LLC Full Stack Product Engineer** assignment.

---

## 📚 Documentation Index
- [ARCHITECTURE.md](file:///c:/Users/HP/OneDrive/Desktop/Ajaia%20LLC%20-%20Full%20Stack/ARCHITECTURE.md): Deep-dive into system components, data schemas, anti-recursion RLS design, and security architecture.
- [AI_WORKFLOW.md](file:///c:/Users/HP/OneDrive/Desktop/Ajaia%20LLC%20-%20Full%20Stack/AI_WORKFLOW.md): Detailed AI pair programming methodology, prompt sequences, bug resolutions, and test-driven cycles.
- [SUBMISSION.md](file:///c:/Users/HP/OneDrive/Desktop/Ajaia%20LLC%20-%20Full%20Stack/SUBMISSION.md): Candidate submission report, phase delivery matrix, audit logs, and test matrix.

---

## Features Overview

### 1. Document Dashboard & Navigation
- **Owned by Me & Shared with Me**: Clear separation of user-owned documents versus shared team documents.
- **Search & Filter**: Real-time title search and category-based filtering.
- **Empty States & Loading**: Polished skeleton loading indicators and intuitive zero-document placeholders.
- **Document CRUD**: One-click document creation, rename dialogs, and deletion confirmations.

### 2. Rich Text Editor (Tiptap Engine)
- **Formatting Support**: Headings (H1 & H2), bold, italic, underline, bullet lists, ordered lists, and blockquotes.
- **Interactive Toolbar**: Formatting controls with active-state indicators and keyboard accessibility.
- **Debounced Autosave**: Automatic background save triggered ~700ms after user pauses typing.
- **Concurrency & Out-of-Order Save Guard**: Monotonic revision tracking ensures older delayed saves never overwrite newer edits.
- **Status Reporting**: Live "Saving", "Saved", and "Save failed" states with one-click manual retry.

### 3. File Import Engine
- **Supported Formats**: Plain text (`.txt`) and Markdown (`.md`, `.markdown`) up to **1 MB**.
- **Syntax Parsing**: Converts Markdown headings, bold, italic, underline, inline code, and lists into structured Tiptap JSON.
- **Defensive Validation**: Strict file extension and size validation with user-friendly error banners.

### 4. Secure Document Sharing & Permissions (Phase 6)
- **Role-Based Access Control**:
  - **Owner**: Read, edit, rename, delete, share, and revoke access.
  - **Editor**: Read, edit content, and rename title. Prohibited from deleting or managing shares.
  - **Viewer**: Read-only access. Editor canvas is locked with a prominent banner; title editing and autosave are disabled.
  - **Unshared Users**: Zero access.
- **Enterprise Row Level Security (RLS)**:
  - Enforced at the PostgreSQL level, preventing unauthorized API bypasses.
  - Prohibits mutating `owner_id` (preventing ownership hijacking).
  - Uses `SECURITY DEFINER` non-recursive helper functions (`is_document_owner`, `can_edit_document`) to prevent PostgreSQL infinite recursion errors (`42P17`).
- **Privacy-Preserving User Lookup**:
  - Secure PostgreSQL RPC `lookup_user_by_email` restricted to authenticated users.
  - Exact case-insensitive matching; never exposes the complete `auth.users` directory to the client.
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
| **Testing & Linting** | Node.js Test Runner + tsx + oxlint |

---

## Getting Started & Local Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Supabase](https://supabase.com/) project

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/chittaranjan27/Ajaia-LLC---Full-Stack-Product-Engineer.git
cd Ajaia-LLC---Full-Stack-Product-Engineer

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```bash
cp .env.example .env.local
```
Inside `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Supabase Database Migration
1. In your Supabase Dashboard, open the **SQL Editor**.
2. Run the migration script located at:
   ```
   supabase/migrations/20261011_document_sharing_and_rls.sql
   ```
   This creates `public.documents`, `public.document_shares`, security definer functions, secure RPCs, and attaches all RLS policies.
3. Ensure **Email Auth** is enabled under Authentication → Providers.

### 5. Running the Application
```bash
# Start local development server
npm run dev

# Run automated tests
npm test

# Run code linter
npm run lint

# Build production bundle
npm run build
```

---

## Multi-Account Testing Instructions

To test secure collaboration across multiple accounts:

1. **Account A (Owner)**:
   - Sign up / log in with Account A (e.g. `alice@ajaia.io`).
   - Create a document ("Engineering Roadmap") and type some content.
   - Click the **Share** button in the editor header.
   - Enter Account B's email (`bob@ajaia.io`), select **Viewer**, and click **Share**.
2. **Account B (Viewer)**:
   - In an Incognito window, log in with Account B (`bob@ajaia.io`).
   - The document appears under **Shared with Me**.
   - Open the document. The editor is read-only, title renaming is disabled, the Share button is hidden, and a read-only notification banner is displayed.
3. **Account B (Editor Upgrade)**:
   - In Account A's window, open the Share dialog and change Account B to **Editor**.
   - In Account B's window, refresh. Account B can now edit text and rename the title with autosave enabled.
   - Account B cannot delete the document or access the Share dialog.
4. **Revocation**:
   - In Account A's window, open Share dialog and click **Revoke access** next to Account B.
   - Account B loses access immediately and the document disappears from their dashboard.
5. **Account C (Unshared)**:
   - Log in with Account C (`carol@ajaia.io`). The document is invisible and cannot be fetched.

---

## Known Limitations & Considerations
- **Simultaneous Real-Time Collaboration**: Real-time multi-cursor collaboration (CRDTs/OT) is not currently implemented; synchronization uses debounced autosave with monotonic revision concurrency protection.
- **Offline Mode**: Document changes require an active internet connection to persist to Supabase.
- **File Types**: File import is scoped to `.txt` and `.md` files up to 1 MB.

---

## Deployment Readiness
The repository is fully configured for static hosting (Vercel, Netlify, Cloudflare Pages):
- Production bundle builds via `npm run build` outputting clean static assets in `dist/`.
- Zero backend server dependencies required; all database logic runs on Supabase.
- *Prepared for deployment.*

---

## License
MIT
