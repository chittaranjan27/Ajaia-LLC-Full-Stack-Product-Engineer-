import React, { useState } from 'react';
import {
  Plus,
  User,
  Users,
  AlertCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type {
  DocumentItem,
  DashboardTab,
  ViewMode,
} from '../../types/document';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { DocumentCard } from './DocumentCard';
import { DocumentRow } from './DocumentRow';
import { DocumentEmptyState } from './DocumentEmptyState';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface DocumentDashboardProps {
  documents: DocumentItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onCreateDocument: () => void;
  onImportFile: (file: File) => void;
  isImporting?: boolean;
  onOpenDocument: (id: string) => void;
  onDeleteDocument: (id: string) => Promise<boolean>;
  onRenameDocument: (id: string, newTitle: string) => Promise<boolean | void>;
  userEmail?: string;
  onSignOut: () => void;
}

export const DocumentDashboard: React.FC<DocumentDashboardProps> = ({
  documents,
  isLoading,
  error,
  onRetry,
  onCreateDocument,
  onImportFile,
  isImporting = false,
  onOpenDocument,
  onDeleteDocument,
  onRenameDocument,
  userEmail,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Deletion confirmation state
  const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tab counts
  const counts = {
    all: documents.length,
    owned: documents.filter((d) => d.ownership === 'owned').length,
    shared: documents.filter((d) => d.ownership === 'shared').length,
    trash: 0,
  };

  // Filter based on active tab and search query
  const filteredDocuments = documents.filter((doc) => {
    if (activeTab === 'owned' && doc.ownership !== 'owned') return false;
    if (activeTab === 'shared' && doc.ownership !== 'shared') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchAuthor = doc.authorName.toLowerCase().includes(q);
      const matchContent = doc.content?.toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchContent;
    }

    return true;
  });

  const ownedDocuments = filteredDocuments.filter((d) => d.ownership === 'owned');
  const sharedDocuments = filteredDocuments.filter((d) => d.ownership === 'shared');

  const handleDeleteTrigger = (id: string, title: string) => {
    setDocToDelete({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    await onDeleteDocument(docToDelete.id);
    setIsDeleting(false);
    setDocToDelete(null);
  };

  const renderDocumentList = (items: DocumentItem[]) => {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onOpen={onOpenDocument}
              onDelete={handleDeleteTrigger}
              onRename={onRenameDocument}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {items.map((doc) => (
          <DocumentRow
            key={doc.id}
            document={doc}
            onOpen={onOpenDocument}
            onDelete={handleDeleteTrigger}
            onRename={onRenameDocument}
          />
        ))}
      </div>
    );
  };

  const pageTitle = {
    all: 'All Documents',
    owned: 'Owned by Me',
    shared: 'Shared with Me',
  }[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateDocument={onCreateDocument}
        onImportFile={onImportFile}
        isImporting={isImporting}
        counts={counts}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main dashboard content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCreateDocument={onCreateDocument}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          documentCount={documents.length}
          userEmail={userEmail}
          onSignOut={onSignOut}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Top Banner / Quick Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {searchQuery ? `Search Results for "${searchQuery}"` : pageTitle}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {isLoading
                  ? 'Loading documents from database...'
                  : `Showing ${filteredDocuments.length} document${
                      filteredDocuments.length === 1 ? '' : 's'
                    }`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onCreateDocument}
                leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              >
                New Document
              </Button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-xl border border-slate-200 h-64 p-4 space-y-3">
                  <div className="h-32 bg-slate-100 rounded-lg" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <DocumentEmptyState
              tab={activeTab}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
              onCreateDocument={onCreateDocument}
            />
          ) : activeTab === 'all' && !searchQuery ? (
            /* Split sections for "Owned by Me" and "Shared with Me" when in All view */
            <div className="space-y-8">
              {/* Owned by Me section */}
              {ownedDocuments.length > 0 && (
                <section aria-labelledby="section-owned">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-blue-600" />
                    <h2 id="section-owned" className="text-base font-semibold text-slate-900">
                      Owned by Me
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-200/70 text-slate-600">
                      {ownedDocuments.length}
                    </span>
                  </div>
                  {renderDocumentList(ownedDocuments)}
                </section>
              )}

              {/* Shared with Me section */}
              {sharedDocuments.length > 0 && (
                <section aria-labelledby="section-shared">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-purple-600" />
                    <h2 id="section-shared" className="text-base font-semibold text-slate-900">
                      Shared with Me
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-200/70 text-slate-600">
                      {sharedDocuments.length}
                    </span>
                  </div>
                  {renderDocumentList(sharedDocuments)}
                </section>
              )}
            </div>
          ) : (
            /* Single list view for specific tab or active search results */
            <div>{renderDocumentList(filteredDocuments)}</div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        title="Delete Document"
        description="This will permanently delete the document from Supabase. This action cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">
              &quot;{docToDelete?.title || 'Untitled document'}&quot;
            </span>
            ?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDocToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handleConfirmDelete}
            >
              Delete Document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
