import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Share2,
  Download,
  FileText,
  Eye,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import type { SaveStatus } from '../../types/document';
import { SaveStatusBadge } from '../common/Badge';
import { Button } from '../common/Button';

interface EditorHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onBackToDashboard: () => void;
  saveStatus: SaveStatus;
  onOpenShare: () => void;
  onExportMarkdown: () => void;
  wordCount?: number;
  onRetry?: () => void;
  isReadOnly?: boolean;
  isOwner?: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  onTitleChange,
  onBackToDashboard,
  saveStatus,
  onOpenShare,
  onExportMarkdown,
  wordCount = 0,
  onRetry,
  isReadOnly = false,
  isOwner = true,
}) => {
  const [prevTitle, setPrevTitle] = useState(title);
  const [localTitle, setLocalTitle] = useState(title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleDebounceRef = useRef<number | null>(null);

  // Sync state if title changes from parent without cascading effect render
  if (title !== prevTitle) {
    setPrevTitle(title);
    setLocalTitle(title);
  }

  const commitTitle = () => {
    if (titleDebounceRef.current) {
      window.clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
    }
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange(trimmed);
    } else if (!trimmed) {
      setLocalTitle(title || 'Untitled document');
    }
    setIsEditingTitle(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const val = e.target.value;
    setLocalTitle(val);

    // Debounce title saving (around 700ms)
    if (titleDebounceRef.current) {
      window.clearTimeout(titleDebounceRef.current);
    }
    titleDebounceRef.current = window.setTimeout(() => {
      titleDebounceRef.current = null;
      const trimmed = val.trim();
      if (trimmed && trimmed !== title) {
        onTitleChange(trimmed);
      }
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitTitle();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      if (titleDebounceRef.current) {
        window.clearTimeout(titleDebounceRef.current);
        titleDebounceRef.current = null;
      }
      setLocalTitle(title);
      setIsEditingTitle(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 shadow-2xs">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Back button + Logo + Editable Title + Save status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Back navigation */}
          <button
            type="button"
            onClick={onBackToDashboard}
            aria-label="Back to document dashboard"
            title="Back to dashboard"
            className="p-2 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Logo emblem */}
          <div
            onClick={onBackToDashboard}
            role="button"
            tabIndex={0}
            title="Ajaia Docs - Return to dashboard"
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FileText className="w-4 h-4" />
          </div>

          {/* Title editor and save status */}
          <div className="min-w-0 flex-1 max-w-md sm:max-w-xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
                onFocus={() => !isReadOnly && setIsEditingTitle(true)}
                onBlur={commitTitle}
                onKeyDown={handleKeyDown}
                disabled={isReadOnly}
                placeholder="Untitled document"
                aria-label="Document Title"
                className={`w-full text-base sm:text-lg font-semibold text-slate-900 bg-transparent px-2 py-0.5 rounded-md border transition-all truncate focus:outline-none ${
                  isReadOnly
                    ? 'border-transparent text-slate-700 cursor-default'
                    : isEditingTitle
                    ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20'
                    : 'border-transparent hover:border-slate-300 hover:bg-slate-50 cursor-text'
                }`}
              />
            </div>

            {/* Secondary bar under title: Save Status + Word Count */}
            <div className="flex items-center gap-2 px-2 text-xs text-slate-400">
              {isReadOnly ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  <Eye className="w-3 h-3 text-amber-600" />
                  <span>View only</span>
                </span>
              ) : (
                <SaveStatusBadge status={saveStatus} onRetry={onRetry} />
              )}
              <span className="hidden md:inline-block text-slate-300">•</span>
              <span className="hidden md:inline-block text-[11px] text-slate-400">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
            </div>
          </div>
        </div>

        {/* Right action controls: Export + Share */}
        <div className="flex items-center gap-2 shrink-0">
          {saveStatus === 'error' && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-600" />
              <span>Retry Save</span>
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onExportMarkdown}
            title="Download document as Markdown"
            aria-label="Download document as Markdown"
            leftIcon={<Download className="w-4 h-4" />}
            className="hidden sm:inline-flex text-slate-600 hover:text-slate-900"
          >
            Export
          </Button>

          {isOwner && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenShare}
              leftIcon={<Share2 className="w-4 h-4" />}
              className="shadow-sm shadow-blue-500/20"
            >
              Share
            </Button>
          )}
        </div>
      </div>

      {/* Prominent Save Failure Banner if error */}
      {saveStatus === 'error' && (
        <div
          role="alert"
          className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-800 animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Failed to save changes to Supabase. Edits are kept locally in your browser.</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-colors cursor-pointer text-xs shrink-0"
            >
              Retry now
            </button>
          )}
        </div>
      )}
    </header>
  );
};
