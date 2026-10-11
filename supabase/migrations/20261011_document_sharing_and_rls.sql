-- ==============================================================================
-- Ajaia Docs: Phase 6 Document Sharing & Row Level Security (RLS) Migration
-- ==============================================================================
-- Run this migration in the Supabase SQL Editor (Dashboard -> SQL Editor)
-- to enforce complete database-level access control, prevent RLS recursion,
-- and provide secure user lookup by email.
-- ==============================================================================

-- 1. Ensure document_shares table exists with required constraints
CREATE TABLE IF NOT EXISTS public.document_shares (
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor', 'view', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (document_id, user_id)
);

-- Ensure index exists for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_document_shares_user_id ON public.document_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON public.document_shares(document_id);

-- ------------------------------------------------------------------------------
-- 2. Security Definer Helper Functions (Prevents RLS Policy Infinite Recursion)
-- ------------------------------------------------------------------------------

-- Helper to check if a user is the owner of a document without triggering RLS loops
CREATE OR REPLACE FUNCTION public.is_document_owner(doc_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = doc_id AND owner_id = check_user_id
  );
$$;

-- Helper to check if a user has editor access to a document
CREATE OR REPLACE FUNCTION public.can_edit_document(doc_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = doc_id AND owner_id = check_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.document_shares
    WHERE document_id = doc_id
      AND user_id = check_user_id
      AND permission IN ('editor', 'edit')
  );
$$;

-- ------------------------------------------------------------------------------
-- 3. Secure User Lookup by Email (Does NOT expose user directory to clients)
-- ------------------------------------------------------------------------------
-- Only authenticated users can call this function.
-- Requires an exact, case-insensitive email match; returns only id and email.
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email TEXT)
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to look up users.';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(lookup_email))
  LIMIT 1;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Get Collaborator Emails for Document Owner
-- ------------------------------------------------------------------------------
-- Only the document owner can see the full list of collaborator emails.
CREATE OR REPLACE FUNCTION public.get_document_shares_with_emails(p_document_id UUID)
RETURNS TABLE (
  document_id UUID,
  user_id UUID,
  email TEXT,
  permission TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be the owner of the document
  IF NOT public.is_document_owner(p_document_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: only document owner can view sharing list.';
  END IF;

  RETURN QUERY
  SELECT 
    ds.document_id,
    ds.user_id,
    COALESCE(u.email::TEXT, ds.user_id::TEXT) AS email,
    ds.permission,
    ds.created_at
  FROM public.document_shares ds
  LEFT JOIN auth.users u ON u.id = ds.user_id
  WHERE ds.document_id = p_document_id
  ORDER BY ds.created_at DESC;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Row Level Security Policies for `documents`
-- ------------------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to apply updated, non-recursive, permission-tiered policies
DROP POLICY IF EXISTS "Owners and shared users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert owned documents" ON public.documents;
DROP POLICY IF EXISTS "Owners and editors can update documents" ON public.documents;
DROP POLICY IF EXISTS "Only owners can delete documents" ON public.documents;
DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;

-- SELECT: Owners and any user granted access via document_shares can read
CREATE POLICY "documents_select_policy"
ON public.documents
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.document_shares ds
    WHERE ds.document_id = documents.id AND ds.user_id = auth.uid()
  )
);

-- INSERT: Authenticated users can insert documents they own
CREATE POLICY "documents_insert_policy"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
);

-- UPDATE: Owners and users with 'editor' permission can update title and content
-- CHECK prevents changing document ownership (owner_id cannot be tampered with)
CREATE POLICY "documents_update_policy"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.document_shares ds
    WHERE ds.document_id = documents.id
      AND ds.user_id = auth.uid()
      AND ds.permission IN ('editor', 'edit')
  )
)
WITH CHECK (
  owner_id = (SELECT d.owner_id FROM public.documents d WHERE d.id = documents.id)
);

-- DELETE: ONLY the document owner can delete the document (editors/viewers cannot)
CREATE POLICY "documents_delete_policy"
ON public.documents
FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
);

-- ------------------------------------------------------------------------------
-- 6. Row Level Security Policies for `document_shares`
-- ------------------------------------------------------------------------------
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_shares_select_policy" ON public.document_shares;
DROP POLICY IF EXISTS "document_shares_insert_policy" ON public.document_shares;
DROP POLICY IF EXISTS "document_shares_update_policy" ON public.document_shares;
DROP POLICY IF EXISTS "document_shares_delete_policy" ON public.document_shares;

-- SELECT:
-- 1. Shared users can see their own share records (to know what docs are shared with them)
-- 2. Document owners can see all shares for documents they own (uses is_document_owner to prevent recursion)
CREATE POLICY "document_shares_select_policy"
ON public.document_shares
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_document_owner(document_id, auth.uid())
);

-- INSERT: ONLY the document owner can create share records (cannot share to self)
CREATE POLICY "document_shares_insert_policy"
ON public.document_shares
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_document_owner(document_id, auth.uid())
  AND user_id != auth.uid()
);

-- UPDATE: ONLY the document owner can modify collaborator permissions
CREATE POLICY "document_shares_update_policy"
ON public.document_shares
FOR UPDATE
TO authenticated
USING (
  public.is_document_owner(document_id, auth.uid())
)
WITH CHECK (
  public.is_document_owner(document_id, auth.uid())
);

-- DELETE: ONLY the document owner can revoke access
CREATE POLICY "document_shares_delete_policy"
ON public.document_shares
FOR DELETE
TO authenticated
USING (
  public.is_document_owner(document_id, auth.uid())
);

-- Grant function execute permissions to authenticated role
GRANT EXECUTE ON FUNCTION public.is_document_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_document(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_document_shares_with_emails(UUID) TO authenticated;
