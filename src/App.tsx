import React, { useState, useEffect, useCallback } from 'react';
import type { DocumentItem } from './types/document';
import { AuthProvider } from './features/auth/AuthContext';
import { useAuth } from './features/auth/useAuth';
import { AuthScreen } from './features/auth/AuthScreen';
import { documentService } from './features/documents/documentService';
import {
  validateImportFile,
  readImportFileAsText,
  parseTextToTiptap,
  parseMarkdownToTiptap,
  deriveDocumentTitle,
} from './features/documents/fileImport';
import { DocumentDashboard } from './components/dashboard/DocumentDashboard';
import { DocumentEditor } from './components/editor/DocumentEditor';
import { Logo } from './components/common/Logo';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('doc');
  });

  const [openedDocument, setOpenedDocument] = useState<DocumentItem | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Sync state with browser history (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const docId = params.get('doc');
      setActiveDocumentId(docId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToEditor = (docId: string) => {
    setActiveDocumentId(docId);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('doc', docId);
    window.history.pushState({}, '', newUrl.toString());
  };

  const navigateToDashboard = () => {
    setActiveDocumentId(null);
    setOpenedDocument(null);
    setEditorError(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('doc');
    window.history.pushState({}, '', newUrl.toString());
  };

  // Fetch documents from Supabase for current user
  const loadDocuments = useCallback(async () => {
    if (!user) return;
    setDocsLoading(true);
    setDocsError(null);

    const [ownedRes, sharedRes] = await Promise.all([
      documentService.fetchOwnedDocuments(user.id),
      documentService.fetchSharedDocuments(user.id),
    ]);

    if (ownedRes.error) {
      setDocsError(ownedRes.error);
    } else {
      const combined = [...ownedRes.data, ...(sharedRes.data || [])];
      setDocuments(combined);
    }
    setDocsLoading(false);
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (user) {
        await loadDocuments();
      } else if (isMounted) {
        setDocuments([]);
      }
    })();
    return () => { isMounted = false; };
  }, [user, loadDocuments]);

  // Load single document when activeDocumentId changes
  useEffect(() => {
    let isMounted = true;

    if (!user || !activeDocumentId) {
      Promise.resolve().then(() => {
        if (isMounted) setOpenedDocument(null);
      });
      return () => { isMounted = false; };
    }

    // Check if document already loaded in memory
    const existing = documents.find((d) => d.id === activeDocumentId);
    if (existing) {
      Promise.resolve().then(() => {
        if (isMounted) setOpenedDocument(existing);
      });
      return () => { isMounted = false; };
    }

    // Otherwise fetch directly by database ID
    Promise.resolve()
      .then(() => {
        if (isMounted) {
          setEditorLoading(true);
          setEditorError(null);
        }
      })
      .then(() => documentService.fetchDocumentById(activeDocumentId, user.id))
      .then(({ data, error }) => {
        if (!isMounted) return;
        setEditorLoading(false);
        if (error || !data) {
          setEditorError(error || 'Document not found.');
        } else {
          setOpenedDocument(data);
        }
      });

    return () => { isMounted = false; };
  }, [user, activeDocumentId, documents]);

  // Document action handlers
  const handleCreateDocument = async () => {
    if (!user) return;
    const { data, error } = await documentService.createDocument(user.id, 'Untitled document');
    if (error || !data) {
      alert(`Failed to create document: ${error || 'Unknown error'}`);
      return;
    }
    setDocuments((prev) => [data, ...prev]);
    navigateToEditor(data.id);
  };

  const handleImportFile = async (file: File) => {
    if (!user) return;
    if (isImporting) return; // Prevent duplicate imports caused by accidental repeated clicks

    // 1. Validate file extension, MIME type, and file size (<= 1 MB)
    const validation = validateImportFile(file);
    if (!validation.valid) {
      alert(validation.error || 'Invalid file format or size.');
      return;
    }

    setIsImporting(true);

    try {
      // 2. Read selected file as UTF-8 text
      const rawText = await readImportFileAsText(file);

      // 3. Determine parser based on extension
      const filename = file.name || '';
      const dotIndex = filename.lastIndexOf('.');
      const ext = dotIndex !== -1 ? filename.slice(dotIndex).toLowerCase() : '';

      let initialJson: Record<string, unknown>;
      if (ext === '.md' || ext === '.markdown') {
        initialJson = parseMarkdownToTiptap(rawText);
      } else {
        initialJson = parseTextToTiptap(rawText);
      }

      // 4. Derive sensible title from filename
      const title = deriveDocumentTitle(filename);

      // 5. Create document in Supabase for the authenticated user
      const { data, error } = await documentService.createDocument(
        user.id,
        title,
        initialJson
      );

      if (error || !data) {
        alert(`Failed to import document into cloud database: ${error || 'Unknown error'}`);
        return;
      }

      // 6. Prepend to list and navigate to editor
      setDocuments((prev) => [data, ...prev]);
      navigateToEditor(data.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while importing the file.';
      alert(`Import error: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateTitle = async (id: string, newTitle: string): Promise<boolean> => {
    const { error } = await documentService.updateDocumentTitle(id, newTitle);
    if (error) {
      return false;
    }
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, title: newTitle, updatedAt: new Date().toISOString() } : doc
      )
    );
    if (openedDocument && openedDocument.id === id) {
      setOpenedDocument((prev) =>
        prev ? { ...prev, title: newTitle, updatedAt: new Date().toISOString() } : null
      );
    }
    return true;
  };

  const handleUpdateContent = async (
    id: string,
    contentJson: Record<string, unknown>
  ): Promise<boolean> => {
    const { error } = await documentService.updateDocumentContent(id, contentJson);
    if (error) {
      return false;
    }
    const nowIso = new Date().toISOString();
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              contentJson,
              updatedAt: nowIso,
            }
          : doc
      )
    );
    setOpenedDocument((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            contentJson,
            updatedAt: nowIso,
          }
        : prev
    );
    return true;
  };

  const handleDeleteDocument = async (id: string): Promise<boolean> => {
    const { error } = await documentService.deleteDocument(id);
    if (error) {
      alert(`Failed to delete document: ${error}`);
      return false;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (activeDocumentId === id) {
      navigateToDashboard();
    }
    return true;
  };

  // 1. Initial Authentication Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Logo size="lg" />
        <div className="flex items-center gap-2 mt-6 text-sm text-slate-500 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Restoring session...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Protect routes with AuthScreen
  if (!user) {
    return <AuthScreen />;
  }

  // 3. Document Editor View (when activeDocumentId is present)
  if (activeDocumentId) {
    if (editorLoading) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading document...</p>
        </div>
      );
    }

    if (editorError || !openedDocument) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl max-w-md w-full text-center space-y-3">
            <h2 className="text-base font-semibold text-red-800">Unable to Open Document</h2>
            <p className="text-xs text-red-600">{editorError || 'Document not found or access denied.'}</p>
            <button
              type="button"
              onClick={navigateToDashboard}
              className="px-4 py-2 bg-white text-xs font-semibold text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 shadow-2xs"
            >
              Back to Documents
            </button>
          </div>
        </div>
      );
    }

    return (
      <DocumentEditor
        key={openedDocument.id}
        document={openedDocument}
        currentUserEmail={user.email}
        onBackToDashboard={navigateToDashboard}
        onUpdateTitle={handleUpdateTitle}
        onUpdateContent={handleUpdateContent}
      />
    );
  }

  // 4. Document Dashboard View
  return (
    <DocumentDashboard
      documents={documents}
      isLoading={docsLoading}
      error={docsError}
      onRetry={loadDocuments}
      onCreateDocument={handleCreateDocument}
      onImportFile={handleImportFile}
      isImporting={isImporting}
      onOpenDocument={navigateToEditor}
      onDeleteDocument={handleDeleteDocument}
      onRenameDocument={handleUpdateTitle}
      userEmail={user.email}
      onSignOut={signOut}
    />
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
