import { supabase } from '../../lib/supabase';
import type { DbDocument, DocumentItem, DocumentShareItem, SharePermission } from '../../types/document';

/**
 * Valid initial Tiptap document JSON representation.
 */
export const DEFAULT_TIPTAP_DOC: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

export const INITIAL_TIPTAP_JSON = DEFAULT_TIPTAP_DOC;

/**
 * Safely normalizes content into valid Tiptap document JSON.
 * Falls back to DEFAULT_TIPTAP_DOC if invalid, empty, or corrupted.
 */
export function normalizeTiptapContent(rawContent: unknown): Record<string, unknown> {
  if (
    typeof rawContent === 'object' &&
    rawContent !== null &&
    (rawContent as Record<string, unknown>).type === 'doc' &&
    Array.isArray((rawContent as Record<string, unknown>).content)
  ) {
    return rawContent as Record<string, unknown>;
  }

  if (typeof rawContent === 'string' && rawContent.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawContent);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        parsed.type === 'doc' &&
        Array.isArray(parsed.content)
      ) {
        return parsed;
      }
    } catch {
      // fallback to default
    }
  }

  return DEFAULT_TIPTAP_DOC;
}

export function normalizeSharePermission(raw: string | undefined | null): SharePermission {
  if (!raw) return 'viewer';
  const lower = raw.toLowerCase().trim();
  if (lower === 'editor' || lower === 'edit') return 'editor';
  return 'viewer';
}

export const normalizePermission = normalizeSharePermission;

function mapDbDocToItem(doc: DbDocument, currentUserId: string): DocumentItem {
  const isOwner = doc.owner_id === currentUserId;
  const contentJson = normalizeTiptapContent(doc.content_json);

  return {
    id: doc.id,
    title: doc.title || 'Untitled document',
    contentJson,
    content: JSON.stringify(contentJson),
    updatedAt: doc.updated_at,
    createdAt: doc.created_at,
    ownership: isOwner ? 'owned' : 'shared',
    ownerId: doc.owner_id,
    authorName: isOwner ? 'You' : 'Collaborator',
    permission: isOwner ? 'editor' : 'viewer',
  };
}

export const documentService = {
  /**
   * Fetches documents owned by the authenticated user.
   */
  async fetchOwnedDocuments(currentUserId: string): Promise<{ data: DocumentItem[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', currentUserId)
        .order('updated_at', { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }

      const items = (data as DbDocument[]).map((d) => mapDbDocToItem(d, currentUserId));
      return { data: items, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: [], error: msg };
    }
  },

  /**
   * Fetches documents shared with the authenticated user via document_shares.
   */
  async fetchSharedDocuments(currentUserId: string): Promise<{ data: DocumentItem[]; error: string | null }> {
    try {
      // 1. Query document_shares for documents shared with this user
      const { data: shares, error: shareError } = await supabase
        .from('document_shares')
        .select('document_id, permission, created_at')
        .eq('user_id', currentUserId);

      if (shareError) {
        return { data: [], error: shareError.message };
      }

      if (!shares || shares.length === 0) {
        return { data: [], error: null };
      }

      const docIds = shares.map((s) => s.document_id);

      // 2. Fetch the corresponding documents
      const { data: docs, error: docError } = await supabase
        .from('documents')
        .select('*')
        .in('id', docIds)
        .order('updated_at', { ascending: false });

      if (docError) {
        return { data: [], error: docError.message };
      }

      const permissionMap = new Map(shares.map((s) => [s.document_id, s.permission]));

      const items = (docs as DbDocument[]).map((d) => {
        const item = mapDbDocToItem(d, currentUserId);
        item.ownership = 'shared';
        item.permission = normalizePermission(permissionMap.get(d.id));
        item.authorName = 'Collaborator';
        return item;
      });

      return { data: items, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: [], error: msg };
    }
  },

  /**
   * Fetches a single document by its database UUID.
   */
  async fetchDocumentById(
    id: string,
    currentUserId: string
  ): Promise<{ data: DocumentItem | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      if (!data) {
        return { data: null, error: 'Document not found.' };
      }

      const item = mapDbDocToItem(data as DbDocument, currentUserId);

      // If document is not owned by current user, resolve permission from document_shares
      if (data.owner_id !== currentUserId) {
        const { data: share } = await supabase
          .from('document_shares')
          .select('permission')
          .eq('document_id', id)
          .eq('user_id', currentUserId)
          .maybeSingle();

        item.permission = normalizePermission(share?.permission);
      }

      return { data: item, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  },

  /**
   * Creates a new document with title "Untitled document" and valid Tiptap JSON.
   */
  async createDocument(
    currentUserId: string,
    title = 'Untitled document',
    initialJson = DEFAULT_TIPTAP_DOC
  ): Promise<{ data: DocumentItem | null; error: string | null }> {
    try {
      const normalizedJson = normalizeTiptapContent(initialJson);
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title,
          content_json: normalizedJson,
          owner_id: currentUserId,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: mapDbDocToItem(data as DbDocument, currentUserId), error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  },

  /**
   * Renames a document and saves the updated title to Supabase.
   */
  async updateDocumentTitle(id: string, newTitle: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          title: newTitle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  },

  /**
   * Updates document content in Supabase as JSON.
   */
  async updateDocumentContent(
    id: string,
    contentJson: Record<string, unknown>
  ): Promise<{ error: string | null }> {
    try {
      const normalizedJson = normalizeTiptapContent(contentJson);
      const { error } = await supabase
        .from('documents')
        .update({
          content_json: normalizedJson,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  },

  /**
   * Deletes an owned document from Supabase.
   */
  async deleteDocument(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  },

  // ----------------------------------------------------------------------------
  // Document Sharing Services
  // ----------------------------------------------------------------------------

  /**
   * Looks up another registered user by exact email using the secure Postgres RPC function.
   * Does NOT expose auth.users directory to browser.
   */
  async lookupUserByEmail(
    email: string
  ): Promise<{ data: { id: string; email: string } | null; error: string | null }> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      return { data: null, error: 'Please enter a valid email address.' };
    }

    try {
      // 1. Invoke the secure RPC function
      const { data, error } = await supabase.rpc('lookup_user_by_email', {
        lookup_email: trimmed,
      });

      if (error) {
        // If function doesn't exist yet in the database, return informative message
        if (error.code === 'PGRST202' || error.message?.includes('not found')) {
          return {
            data: null,
            error:
              'The lookup_user_by_email function has not been created in your Supabase project yet. Please run the SQL migration located in supabase/migrations/20261011_document_sharing_and_rls.sql.',
          };
        }
        return { data: null, error: error.message };
      }

      if (!data || data.length === 0) {
        return { data: null, error: 'No registered user found with that email address.' };
      }

      const found = data[0];
      return { data: { id: found.id, email: found.email }, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: null, error: msg };
    }
  },

  /**
   * Fetches existing share records for a document.
   * Only the owner can see the full collaborator list.
   */
  async fetchDocumentShares(
    documentId: string
  ): Promise<{ data: DocumentShareItem[]; error: string | null }> {
    try {
      // 1. Try get_document_shares_with_emails RPC for full emails
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_document_shares_with_emails',
        { p_document_id: documentId }
      );

      if (!rpcError && Array.isArray(rpcData)) {
        const items: DocumentShareItem[] = rpcData.map((row) => ({
          documentId: row.document_id,
          userId: row.user_id,
          email: row.email,
          permission: normalizePermission(row.permission),
          createdAt: row.created_at,
        }));
        return { data: items, error: null };
      }

      // 2. Fallback to direct query from document_shares
      const { data, error } = await supabase
        .from('document_shares')
        .select('document_id, user_id, permission, created_at')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }

      const items: DocumentShareItem[] = (data || []).map((row) => ({
        documentId: row.document_id,
        userId: row.user_id,
        email: row.user_id, // display user id if email join not available
        permission: normalizePermission(row.permission),
        createdAt: row.created_at,
      }));

      return { data: items, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { data: [], error: msg };
    }
  },

  /**
   * Adds or updates a share record in public.document_shares.
   */
  async addDocumentShare(
    documentId: string,
    recipientUserId: string,
    permission: SharePermission
  ): Promise<{ error: string | null }> {
    try {
      // Check for duplicate share
      const { data: existing, error: checkError } = await supabase
        .from('document_shares')
        .select('permission')
        .eq('document_id', documentId)
        .eq('user_id', recipientUserId)
        .maybeSingle();

      if (checkError) {
        return { error: checkError.message };
      }

      if (existing) {
        return {
          error: `This user already has ${existing.permission} access. You can change their role or revoke access below.`,
        };
      }

      // Insert share record with canonical permission ('viewer' or 'editor')
      const { error: insertError } = await supabase.from('document_shares').insert({
        document_id: documentId,
        user_id: recipientUserId,
        permission,
      });

      if (insertError) {
        return { error: insertError.message };
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  },

  /**
   * Updates an existing share record's permission level.
   */
  async updateDocumentSharePermission(
    documentId: string,
    recipientUserId: string,
    permission: SharePermission
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('document_shares')
        .update({ permission })
        .eq('document_id', documentId)
        .eq('user_id', recipientUserId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  },

  /**
   * Revokes sharing access by deleting the row from public.document_shares.
   */
  async revokeDocumentShare(
    documentId: string,
    recipientUserId: string
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('document_shares')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', recipientUserId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  },
};
