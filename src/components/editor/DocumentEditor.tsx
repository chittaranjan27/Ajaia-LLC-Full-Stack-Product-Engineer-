import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { DocumentItem, SaveStatus } from '../../types/document';
import { normalizeTiptapContent } from '../../features/documents/documentService';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { DocumentCanvas } from './DocumentCanvas';
import { ShareModal } from './ShareModal';

interface DocumentEditorProps {
  document: DocumentItem;
  currentUserEmail?: string;
  onBackToDashboard: () => void;
  onUpdateTitle: (id: string, newTitle: string) => Promise<boolean>;
  onUpdateContent: (id: string, newContentJson: Record<string, unknown>) => Promise<boolean>;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  currentUserEmail,
  onBackToDashboard,
  onUpdateTitle,
  onUpdateContent,
}) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Check viewer vs editor permissions
  const isOwner = document.ownership === 'owned';
  const isEditor = isOwner || document.permission === 'editor' || document.permission === 'edit';
  const isReadOnly = !isEditor;

  // Concurrency & Out-of-order save prevention refs
  const latestRevisionRef = useRef(0);
  const confirmedRevisionRef = useRef(0);
  const pendingContentRef = useRef<Record<string, unknown> | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Prepare safe initial content
  const initialContent = useMemo(() => {
    return normalizeTiptapContent(document.contentJson);
  }, [document.contentJson]);

  // Keep a stable ref to onUpdateContent to avoid stale closures
  const onUpdateContentRef = useRef(onUpdateContent);
  useEffect(() => {
    onUpdateContentRef.current = onUpdateContent;
  }, [onUpdateContent]);

  const performSaveRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));

  // Core save execution function
  const performSave = useCallback(async (): Promise<boolean> => {
    if (isReadOnly) return true;
    if (!pendingContentRef.current) return true;

    const targetRevision = latestRevisionRef.current;
    const contentToSave = pendingContentRef.current;

    // If this revision is already confirmed, nothing to do
    if (targetRevision <= confirmedRevisionRef.current) {
      if (isMountedRef.current) {
        setSaveStatus('saved');
      }
      return true;
    }

    if (isMountedRef.current) {
      setSaveStatus('saving');
    }

    try {
      const success = await onUpdateContentRef.current(document.id, contentToSave);

      if (!isMountedRef.current) return success;

      if (success) {
        // Record confirmation
        if (targetRevision > confirmedRevisionRef.current) {
          confirmedRevisionRef.current = targetRevision;
        }

        // Only mark "saved" if no new edits arrived while this save was in flight!
        if (latestRevisionRef.current === targetRevision) {
          setSaveStatus('saved');
        } else {
          // Newer edits arrived during network request — schedule save for latest revision
          if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = window.setTimeout(() => {
            debounceTimerRef.current = null;
            void performSaveRef.current();
          }, 700);
        }
        return true;
      } else {
        // DB write failed: preserve pendingContentRef.current and flag error
        setSaveStatus('error');
        return false;
      }
    } catch {
      if (!isMountedRef.current) return false;
      setSaveStatus('error');
      return false;
    }
  }, [document.id, isReadOnly]);

  // Keep performSaveRef synchronized
  useEffect(() => {
    performSaveRef.current = performSave;
  }, [performSave]);

  // Schedule autosave around 700ms after the last edit
  const scheduleAutosave = useCallback(() => {
    if (isReadOnly) return;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    // Immediately mark as saving so user sees activity
    setSaveStatus('saving');

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void performSaveRef.current();
    }, 700);
  }, [isReadOnly]);

  // Manual retry handler
  const handleRetrySave = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void performSave();
  }, [performSave]);

  // Initialize Tiptap editor once per component mount (never re-creates on keystroke)
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2],
          },
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
        }),
        Placeholder.configure({
          placeholder: 'Start writing your document...',
        }),
      ],
      content: initialContent,
      editable: !isReadOnly,
      editorProps: {
        attributes: {
          class:
            'tiptap focus:outline-none min-h-[750px] text-base leading-relaxed text-slate-800',
          'aria-label': 'Document body text',
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        if (isReadOnly) return;
        latestRevisionRef.current += 1;
        pendingContentRef.current = currentEditor.getJSON() as Record<string, unknown>;
        scheduleAutosave();
      },
    },
    [] // Empty dependency array ensures editor instance is never recreated on render/keystrokes
  );

  // Derive word count directly from editor text
  const currentText = editor?.getText() || '';
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;

  // Cleanup on unmount: flush pending edits if any exist
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      // If there are unsaved edits upon unmount, attempt fire-and-forget save
      if (
        !isReadOnly &&
        latestRevisionRef.current > confirmedRevisionRef.current &&
        pendingContentRef.current
      ) {
        void onUpdateContentRef.current(document.id, pendingContentRef.current);
      }
    };
  }, [document.id, isReadOnly]);

  // Warn user on browser close/refresh if unsaved edits are pending
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isReadOnly && latestRevisionRef.current > confirmedRevisionRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isReadOnly]);

  // Safe navigation back to dashboard: flush pending edits first
  const handleBackToDashboard = useCallback(async () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!isReadOnly && latestRevisionRef.current > confirmedRevisionRef.current) {
      setSaveStatus('saving');
      const saved = await performSave();
      if (!saved) {
        const leave = window.confirm(
          'Your latest edits could not be saved to Supabase. Are you sure you want to return to the dashboard?'
        );
        if (!leave) return;
      }
    }

    onBackToDashboard();
  }, [isReadOnly, performSave, onBackToDashboard]);

  // Document title update handler
  const handleTitleChange = async (newTitle: string) => {
    if (isReadOnly) return;
    setSaveStatus('saving');
    const success = await onUpdateTitle(document.id, newTitle);
    setSaveStatus(success ? 'saved' : 'error');
  };

  const handleExportMarkdown = () => {
    if (!editor) return;
    const textContent = editor.getText();
    const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${(document.title || 'untitled-document')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Editor Top Navigation & Title Bar */}
      <EditorHeader
        title={document.title}
        onTitleChange={handleTitleChange}
        onBackToDashboard={handleBackToDashboard}
        saveStatus={saveStatus}
        onOpenShare={() => setIsShareModalOpen(true)}
        onExportMarkdown={handleExportMarkdown}
        wordCount={wordCount}
        onRetry={handleRetrySave}
        isReadOnly={isReadOnly}
        isOwner={isOwner}
      />

      {/* Formatting Toolbar with Active Indicators */}
      <EditorToolbar editor={editor} isReadOnly={isReadOnly} />

      {/* Main Document Editing Canvas */}
      <DocumentCanvas editor={editor} />

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={document.id}
        documentTitle={document.title}
        currentUserEmail={currentUserEmail}
      />
    </div>
  );
};
