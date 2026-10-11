import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Eye,
  Edit3,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { documentService } from '../../features/documents/documentService';
import type { DocumentShareItem, SharePermission } from '../../types/document';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  currentUserEmail?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  currentUserEmail,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<SharePermission>('editor');

  const [shares, setShares] = useState<DocumentShareItem[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load existing shares whenever the modal opens
  const loadShares = useCallback(async () => {
    if (!documentId) return;
    setIsLoadingShares(true);
    setErrorMessage(null);

    const { data, error } = await documentService.fetchDocumentShares(documentId);
    setIsLoadingShares(false);

    if (error) {
      setErrorMessage(error);
    } else {
      setShares(data);
    }
  }, [documentId]);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setRecipientEmail('');
    setErrorMessage(null);
    setSuccessMessage(null);
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (isOpen && isMounted) {
        await loadShares();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [isOpen, loadShares]);

  // Handle granting access to another user by email
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const email = recipientEmail.trim().toLowerCase();
    if (!email) {
      setErrorMessage('Please enter a recipient email address.');
      return;
    }

    if (currentUserEmail && email === currentUserEmail.toLowerCase()) {
      setErrorMessage('You are already the owner of this document.');
      return;
    }

    // Check if recipient is already in local list
    const alreadyShared = shares.some((s) => s.email?.toLowerCase() === email);
    if (alreadyShared) {
      setErrorMessage(
        'This user already has access to this document. You can modify their permission or revoke access below.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Look up user by email securely
      const lookupRes = await documentService.lookupUserByEmail(email);

      if (lookupRes.error || !lookupRes.data) {
        setErrorMessage(lookupRes.error || 'User not found.');
        return;
      }

      const recipientUser = lookupRes.data;

      // 2. Insert share record into public.document_shares
      const shareRes = await documentService.addDocumentShare(
        documentId,
        recipientUser.id,
        selectedRole
      );

      if (shareRes.error) {
        setErrorMessage(shareRes.error);
        return;
      }

      setSuccessMessage(`Document shared with ${email} as ${selectedRole}.`);
      setRecipientEmail('');
      await loadShares();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to share document.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle changing collaborator's permission
  const handleRoleChange = async (userId: string, newRole: SharePermission) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await documentService.updateDocumentSharePermission(
      documentId,
      userId,
      newRole
    );

    if (error) {
      setErrorMessage(error);
    } else {
      setShares((prev) =>
        prev.map((s) => (s.userId === userId ? { ...s, permission: newRole } : s))
      );
      setSuccessMessage(`Collaborator role updated to ${newRole}.`);
    }
  };

  // Handle revoking access
  const handleRevoke = async (userId: string, userEmailOrId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setRevokingUserId(userId);

    const { error } = await documentService.revokeDocumentShare(documentId, userId);
    setRevokingUserId(null);

    if (error) {
      setErrorMessage(error);
    } else {
      setShares((prev) => prev.filter((s) => s.userId !== userId));
      setSuccessMessage(`Access revoked for ${userEmailOrId}.`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Document"
      description={`Manage collaborator access and roles for "${documentTitle || 'Untitled document'}"`}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Alerts for feedback */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Add Collaborator Form */}
        <form onSubmit={handleShareSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-800">
            Invite registered user by email
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="colleague@example.com"
                disabled={isSubmitting}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as SharePermission)}
              disabled={isSubmitting}
              aria-label="Permission role"
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="editor">Editor (Can edit)</option>
              <option value="viewer">Viewer (Read only)</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              className="shrink-0 shadow-2xs"
            >
              Share
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            Recipient must be registered with Ajaia Docs. Permissions are enforced via Row Level Security.
          </p>
        </form>

        {/* Existing Collaborators List */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Who has access</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {shares.length + 1} {shares.length + 1 === 1 ? 'person' : 'people'}
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {/* Owner Row */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'Y'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-800 truncate">
                    {currentUserEmail || 'You'}
                  </div>
                  <div className="text-[10px] text-slate-400">Owner (Full access)</div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded-md">
                <Shield className="w-3 h-3 text-blue-600" />
                Owner
              </span>
            </div>

            {/* Loading state for existing shares */}
            {isLoadingShares ? (
              <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading collaborators...</span>
              </div>
            ) : shares.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No external collaborators yet. Invite someone above to collaborate.
              </div>
            ) : (
              shares.map((share) => (
                <div
                  key={share.userId}
                  className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50/80 rounded-lg border border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {share.email ? share.email.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-xs font-medium text-slate-800 truncate" title={share.email || share.userId}>
                        {share.email || share.userId}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        {share.permission === 'editor' ? (
                          <>
                            <Edit3 className="w-2.5 h-2.5 text-blue-500" />
                            <span>Can edit title and content</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-2.5 h-2.5 text-amber-500" />
                            <span>Read-only viewer</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Change role & Revoke */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={share.permission}
                      onChange={(e) =>
                        handleRoleChange(share.userId, e.target.value as SharePermission)
                      }
                      aria-label="Change collaborator role"
                      className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRevoke(share.userId, share.email || share.userId)}
                      disabled={revokingUserId === share.userId}
                      title="Revoke access"
                      aria-label="Revoke collaborator access"
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      {revokingUserId === share.userId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
