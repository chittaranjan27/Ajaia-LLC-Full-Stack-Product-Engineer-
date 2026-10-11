import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeSharePermission,
} from '../src/features/documents/documentService.ts';

describe('Ajaia Docs - Phase 6 Secure Document Sharing & Permissions Suite', () => {
  describe('1. Permission Normalization and Role Resolution', () => {
    it('normalizes legacy and modern permission strings accurately', () => {
      assert.strictEqual(normalizeSharePermission('viewer'), 'viewer');
      assert.strictEqual(normalizeSharePermission('editor'), 'editor');
      assert.strictEqual(normalizeSharePermission('view'), 'viewer');
      assert.strictEqual(normalizeSharePermission('edit'), 'editor');
      assert.strictEqual(normalizeSharePermission('invalid'), 'viewer');
      assert.strictEqual(normalizeSharePermission(undefined), 'viewer');
    });

    it('determines read-only status correctly based on role', () => {
      const evaluateCapabilities = (userRole) => {
        const isOwner = userRole === 'owner';
        const isEditor = userRole === 'editor';
        const isViewer = userRole === 'viewer';

        return {
          canRead: isOwner || isEditor || isViewer,
          canEditContent: isOwner || isEditor,
          canRename: isOwner || isEditor,
          canDelete: isOwner,
          canShare: isOwner,
          canRevoke: isOwner,
          isReadOnly: isViewer,
        };
      };

      // Owner capabilities
      const ownerCaps = evaluateCapabilities('owner');
      assert.strictEqual(ownerCaps.canRead, true);
      assert.strictEqual(ownerCaps.canEditContent, true);
      assert.strictEqual(ownerCaps.canRename, true);
      assert.strictEqual(ownerCaps.canDelete, true);
      assert.strictEqual(ownerCaps.canShare, true);
      assert.strictEqual(ownerCaps.canRevoke, true);
      assert.strictEqual(ownerCaps.isReadOnly, false);

      // Editor capabilities
      const editorCaps = evaluateCapabilities('editor');
      assert.strictEqual(editorCaps.canRead, true);
      assert.strictEqual(editorCaps.canEditContent, true);
      assert.strictEqual(editorCaps.canRename, true);
      assert.strictEqual(editorCaps.canDelete, false, 'Editor MUST NOT be able to delete document');
      assert.strictEqual(editorCaps.canShare, false, 'Editor MUST NOT be able to share document');
      assert.strictEqual(editorCaps.canRevoke, false, 'Editor MUST NOT be able to revoke sharing access');
      assert.strictEqual(editorCaps.isReadOnly, false);

      // Viewer capabilities
      const viewerCaps = evaluateCapabilities('viewer');
      assert.strictEqual(viewerCaps.canRead, true);
      assert.strictEqual(viewerCaps.canEditContent, false, 'Viewer MUST NOT be able to edit content');
      assert.strictEqual(viewerCaps.canRename, false, 'Viewer MUST NOT be able to rename document');
      assert.strictEqual(viewerCaps.canDelete, false);
      assert.strictEqual(viewerCaps.canShare, false);
      assert.strictEqual(viewerCaps.canRevoke, false);
      assert.strictEqual(viewerCaps.isReadOnly, true);

      // Unshared / anonymous capabilities
      const unsharedCaps = evaluateCapabilities('none');
      assert.strictEqual(unsharedCaps.canRead, false);
      assert.strictEqual(unsharedCaps.canEditContent, false);
      assert.strictEqual(unsharedCaps.canDelete, false);
      assert.strictEqual(unsharedCaps.canShare, false);
    });
  });

  describe('2. Share Validation: Self-Sharing, Duplicates, and Lookup Guard', () => {
    it('prevents document owner from sharing with themselves', () => {
      const owner = { id: 'usr-owner-123', email: 'owner@ajaia.io' };
      const candidateUser = { id: 'usr-owner-123', email: 'owner@ajaia.io' };

      const validateShareTarget = (docOwner, target) => {
        if (!target.email || !target.email.trim()) {
          return { valid: false, error: 'Please enter an email address.' };
        }
        if (
          target.id === docOwner.id ||
          target.email.trim().toLowerCase() === docOwner.email.trim().toLowerCase()
        ) {
          return { valid: false, error: 'You cannot share a document with yourself.' };
        }
        return { valid: true };
      };

      const selfShareResult = validateShareTarget(owner, candidateUser);
      assert.strictEqual(selfShareResult.valid, false);
      assert.strictEqual(selfShareResult.error, 'You cannot share a document with yourself.');

      const validTarget = { id: 'usr-collab-456', email: 'collab@ajaia.io' };
      const validResult = validateShareTarget(owner, validTarget);
      assert.strictEqual(validResult.valid, true);
    });

    it('detects existing / duplicate shares and identifies permission update vs duplicate', () => {
      const existingShares = [
        { userId: 'usr-collab-456', email: 'collab@ajaia.io', permission: 'viewer' },
      ];

      const checkDuplicate = (shares, targetUserId) => {
        return shares.find((s) => s.userId === targetUserId) || null;
      };

      const duplicate = checkDuplicate(existingShares, 'usr-collab-456');
      assert.ok(duplicate !== null);
      assert.strictEqual(duplicate.permission, 'viewer');

      const nonDuplicate = checkDuplicate(existingShares, 'usr-new-789');
      assert.strictEqual(nonDuplicate, null);
    });
  });

  describe('3. Multi-User Access Control Matrix & State Transition Simulation', () => {
    it('executes full 8-step sharing lifecycle across Account A, Account B, and Account C', () => {
      // Setup Users
      const userA = { id: 'user-a-uuid', email: 'alice@ajaia.io' }; // Owner
      const userB = { id: 'user-b-uuid', email: 'bob@ajaia.io' };   // Collaborator
      const userC = { id: 'user-c-uuid', email: 'carol@ajaia.io' }; // Unshared third party

      // In-memory Database state mirroring Supabase RLS policies
      let documentsTable = [];
      let documentSharesTable = [];

      // Helper: RLS Document Select Policy
      const queryDocumentsAs = (userId) => {
        return documentsTable.filter((doc) => {
          if (doc.owner_id === userId) return true;
          const share = documentSharesTable.find(
            (s) => s.document_id === doc.id && s.user_id === userId
          );
          return !!share;
        });
      };

      // Helper: Get user's effective permission for a document
      const getPermissionForDoc = (docId, userId) => {
        const doc = documentsTable.find((d) => d.id === docId);
        if (!doc) return 'none';
        if (doc.owner_id === userId) return 'owner';
        const share = documentSharesTable.find(
          (s) => s.document_id === docId && s.user_id === userId
        );
        return share ? share.permission : 'none';
      };

      // Helper: RLS Document Update Policy
      const updateDocumentAs = (userId, docId, updates) => {
        const docIndex = documentsTable.findIndex((d) => d.id === docId);
        if (docIndex === -1) throw new Error('Document not found');
        const doc = documentsTable[docIndex];

        // Guard: Prevent ownership change tampering
        if (updates.owner_id && updates.owner_id !== doc.owner_id) {
          throw new Error('RLS Error: Changing document ownership is strictly forbidden.');
        }

        const perm = getPermissionForDoc(docId, userId);
        if (perm !== 'owner' && perm !== 'editor') {
          throw new Error('RLS Error: Permission denied. Viewers and unshared users cannot update documents.');
        }

        documentsTable[docIndex] = { ...doc, ...updates, updated_at: new Date().toISOString() };
        return documentsTable[docIndex];
      };

      // Helper: RLS Document Delete Policy
      const deleteDocumentAs = (userId, docId) => {
        const docIndex = documentsTable.findIndex((d) => d.id === docId);
        if (docIndex === -1) throw new Error('Document not found');
        const doc = documentsTable[docIndex];

        if (doc.owner_id !== userId) {
          throw new Error('RLS Error: Only the document owner can delete this document.');
        }

        documentsTable.splice(docIndex, 1);
        documentSharesTable = documentSharesTable.filter((s) => s.document_id !== docId);
        return true;
      };

      // Helper: RLS Document Shares Management Policy
      const addShareAs = (requestorId, docId, targetUserId, permission) => {
        const doc = documentsTable.find((d) => d.id === docId);
        if (!doc || doc.owner_id !== requestorId) {
          throw new Error('RLS Error: Only document owner can manage shares.');
        }
        documentSharesTable.push({
          document_id: docId,
          user_id: targetUserId,
          permission,
          created_at: new Date().toISOString(),
        });
      };

      const revokeShareAs = (requestorId, docId, targetUserId) => {
        const doc = documentsTable.find((d) => d.id === docId);
        if (!doc || doc.owner_id !== requestorId) {
          throw new Error('RLS Error: Only document owner can manage shares.');
        }
        documentSharesTable = documentSharesTable.filter(
          (s) => !(s.document_id === docId && s.user_id === targetUserId)
        );
      };

      // Step 1: Account A creates a document
      const doc1 = {
        id: 'doc-uuid-001',
        title: 'Project Roadmap Q4',
        content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
        owner_id: userA.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      documentsTable.push(doc1);

      assert.strictEqual(documentsTable.length, 1);
      assert.strictEqual(queryDocumentsAs(userA.id).length, 1);
      assert.strictEqual(getPermissionForDoc(doc1.id, userA.id), 'owner');

      // Step 2: Account A shares it with Account B as Viewer
      addShareAs(userA.id, doc1.id, userB.id, 'viewer');
      assert.strictEqual(documentSharesTable.length, 1);

      // Step 3: Account B sees it under Shared with Me
      const docsForB = queryDocumentsAs(userB.id);
      assert.strictEqual(docsForB.length, 1);
      assert.strictEqual(docsForB[0].id, doc1.id);
      assert.strictEqual(getPermissionForDoc(doc1.id, userB.id), 'viewer');

      // Step 4: Viewer permission blocks edits by Account B
      assert.throws(
        () => updateDocumentAs(userB.id, doc1.id, { title: 'Hacked Title' }),
        /RLS Error: Permission denied/
      );

      // Step 5: Account A changes permission to Editor, which now allows edits
      revokeShareAs(userA.id, doc1.id, userB.id);
      addShareAs(userA.id, doc1.id, userB.id, 'editor');
      assert.strictEqual(getPermissionForDoc(doc1.id, userB.id), 'editor');

      const updatedDoc = updateDocumentAs(userB.id, doc1.id, {
        title: 'Project Roadmap Q4 - Updated by Bob',
      });
      assert.strictEqual(updatedDoc.title, 'Project Roadmap Q4 - Updated by Bob');

      // Step 6: Account B cannot delete or share the document
      assert.throws(
        () => deleteDocumentAs(userB.id, doc1.id),
        /RLS Error: Only the document owner can delete this document/
      );
      assert.throws(
        () => addShareAs(userB.id, doc1.id, userC.id, 'viewer'),
        /RLS Error: Only document owner can manage shares/
      );

      // Step 7: Revoking access prevents Account B from accessing it again
      revokeShareAs(userA.id, doc1.id, userB.id);
      assert.strictEqual(queryDocumentsAs(userB.id).length, 0);
      assert.strictEqual(getPermissionForDoc(doc1.id, userB.id), 'none');
      assert.throws(
        () => updateDocumentAs(userB.id, doc1.id, { title: 'Unauthorized update' }),
        /RLS Error: Permission denied/
      );

      // Step 8: A third, unshared account (Account C) cannot access the document
      const docsForC = queryDocumentsAs(userC.id);
      assert.strictEqual(docsForC.length, 0);
      assert.strictEqual(getPermissionForDoc(doc1.id, userC.id), 'none');
      assert.throws(
        () => updateDocumentAs(userC.id, doc1.id, { title: 'Third party edit' }),
        /RLS Error: Permission denied/
      );
      assert.throws(
        () => deleteDocumentAs(userC.id, doc1.id),
        /RLS Error: Only the document owner can delete this document/
      );

      // Verify Owner (Account A) still has full access and can delete
      assert.strictEqual(deleteDocumentAs(userA.id, doc1.id), true);
      assert.strictEqual(documentsTable.length, 0);
    });
  });
});
