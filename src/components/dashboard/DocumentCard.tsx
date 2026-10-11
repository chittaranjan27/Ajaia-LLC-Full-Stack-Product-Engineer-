import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Trash2,
  ExternalLink,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import type { DocumentItem } from '../../types/document';
import { formatRelativeDate } from '../../utils/date';
import { OwnershipBadge } from '../common/Badge';

interface DocumentCardProps {
  document: DocumentItem;
  onOpen: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onRename?: (id: string, newTitle: string) => Promise<boolean | void>;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onOpen,
  onDelete,
  onRename,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(document.title);
  const isOwner = document.ownership === 'owned';

  const previewText = document.content
    ? document.content.replace(/<[^>]*>?/gm, ' ').replace(/[{}"\\[\\]]/g, ' ').replace(/\s+/g, ' ').trim()
    : 'Empty document canvas';

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
      className="group relative flex flex-col bg-white rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 text-left cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {/* Visual document thumbnail canvas */}
      <div className="relative h-36 bg-gradient-to-b from-slate-50 to-slate-100/70 p-4 border-b border-slate-150 overflow-hidden flex flex-col justify-start">
        {/* Document sheet representation */}
        <div className="w-full h-full bg-white rounded-t-md shadow-xs border border-slate-200/70 p-3 overflow-hidden select-none">
          <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-100">
            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div className="h-1.5 w-16 bg-slate-300 rounded-full" />
          </div>
          <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-400 line-clamp-3">
            {previewText}
          </div>
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 rounded-full shadow-sm text-xs font-medium text-blue-600 border border-blue-100">
            <ExternalLink className="w-3.5 h-3.5" />
            Open editor
          </span>
        </div>
      </div>

      {/* Document info footer */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {isRenaming ? (
            <div
              className="flex items-center gap-1.5"
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
                className="w-full text-xs font-semibold text-slate-800 border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
            <h3
              className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1"
              title={document.title}
            >
              {document.title || 'Untitled document'}
            </h3>
          )}

          <div className="flex items-center gap-2 mt-2">
            <OwnershipBadge
              type={document.ownership}
              authorName={document.authorName}
              size="sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatRelativeDate(document.updatedAt)}</span>
          </div>

          {/* Quick item actions */}
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {isOwner && onRename && !isRenaming && (
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                title="Rename document"
                aria-label="Rename document"
                className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
