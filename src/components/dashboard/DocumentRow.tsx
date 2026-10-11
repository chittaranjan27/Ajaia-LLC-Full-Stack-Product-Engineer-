import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Trash2,
  ChevronRight,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import type { DocumentItem } from '../../types/document';
import { formatRelativeDate } from '../../utils/date';
import { OwnershipBadge } from '../common/Badge';

interface DocumentRowProps {
  document: DocumentItem;
  onOpen: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onRename?: (id: string, newTitle: string) => Promise<boolean | void>;
}

export const DocumentRow: React.FC<DocumentRowProps> = ({
  document,
  onOpen,
  onDelete,
  onRename,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(document.title);
  const isOwner = document.ownership === 'owned';

  const handleSaveRename = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== document.title && onRename) {
      await onRename(document.id, trimmed);
    } else {
      setTitleInput(document.title);
    }
    setIsRenaming(false);
  };

  const handleCancelRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setTitleInput(document.title);
    setIsRenaming(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(document.id)}
      onKeyDown={(e) => {
        if (!isRenaming && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen(document.id);
        }
      }}
      className="group flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors text-left cursor-pointer focus:outline-none focus-visible:bg-blue-50/50"
    >
      {/* Title & Icon */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <div
              className="flex items-center gap-1.5 max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(e);
                  if (e.key === 'Escape') handleCancelRename(e);
                }}
                className="w-full text-xs font-semibold text-slate-800 border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
              <button
                type="button"
                onClick={handleSaveRename}
                aria-label="Confirm rename"
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancelRename}
                aria-label="Cancel rename"
                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
              {document.title || 'Untitled document'}
            </div>
          )}
          <div className="text-xs text-slate-400 sm:hidden">
            Modified {formatRelativeDate(document.updatedAt)}
          </div>
        </div>
      </div>

      {/* Ownership category */}
      <div className="hidden md:block shrink-0">
        <OwnershipBadge
          type={document.ownership}
          authorName={document.authorName}
          size="sm"
        />
      </div>

      {/* Modified Date */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 w-36 shrink-0">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>{formatRelativeDate(document.updatedAt)}</span>
      </div>

      {/* Action buttons */}
      <div
        className="flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isOwner && onRename && !isRenaming && (
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            title="Rename document"
            aria-label="Rename document"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {isOwner && (
          <button
            type="button"
            onClick={() => onDelete(document.id, document.title)}
            title="Delete document"
            aria-label="Delete document"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors ml-1" />
      </div>
    </div>
  );
};
