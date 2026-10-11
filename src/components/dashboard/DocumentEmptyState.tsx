import React from 'react';
import { FileQuestion, Plus, SearchX, Trash2 } from 'lucide-react';
import type { DashboardTab } from '../../types/document';
import { Button } from '../common/Button';

interface DocumentEmptyStateProps {
  tab: DashboardTab;
  searchQuery?: string;
  onClearSearch?: () => void;
  onCreateDocument: () => void;
}

export const DocumentEmptyState: React.FC<DocumentEmptyStateProps> = ({
  tab,
  searchQuery,
  onClearSearch,
  onCreateDocument,
}) => {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          No documents found
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          No results match &quot;<span className="font-medium text-slate-700">{searchQuery}</span>&quot;. Try refining your search query or clear the filter.
        </p>
        {onClearSearch && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSearch}
            className="mt-4"
          >
            Clear Search
          </Button>
        )}
      </div>
    );
  }

  const tabStateConfig = {
    all: {
      icon: FileQuestion,
      title: 'No documents yet',
      desc: 'Create your first document to start drafting ideas, notes, and collaborative specifications.',
      showCta: true,
    },
    owned: {
      icon: FileQuestion,
      title: 'You haven’t created any documents',
      desc: 'All documents authored by you will be organized and displayed here.',
      showCta: true,
    },
    shared: {
      icon: FileQuestion,
      title: 'No documents shared with you',
      desc: 'When teammates share documents with you, they will appear in this workspace section.',
      showCta: false,
    },
    trash: {
      icon: Trash2,
      title: 'Trash is empty',
      desc: 'Documents you move to trash will be held here before being permanently cleared.',
      showCta: false,
    },
  };

  const current = tabStateConfig[tab];
  const Icon = current.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
      <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100/70 flex items-center justify-center text-blue-600 mb-4 shadow-2xs">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">
        {current.title}
      </h3>
      <p className="mt-1.5 text-sm text-slate-500 max-w-md">
        {current.desc}
      </p>
      {current.showCta && (
        <Button
          variant="primary"
          size="md"
          onClick={onCreateDocument}
          leftIcon={<Plus className="w-4 h-4" />}
          className="mt-5 shadow-sm shadow-blue-500/20"
        >
          Create New Document
        </Button>
      )}
    </div>
  );
};
