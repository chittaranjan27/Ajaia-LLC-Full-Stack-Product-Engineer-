import React from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Menu,
  Plus,
  LogOut,
} from 'lucide-react';
import type { ViewMode } from '../../types/document';
import { Button } from '../common/Button';
import { Logo } from '../common/Logo';

interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateDocument: () => void;
  onOpenMobileMenu: () => void;
  documentCount: number;
  userEmail?: string;
  onSignOut?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onCreateDocument,
  onOpenMobileMenu,
  documentCount,
  userEmail,
  onSignOut,
}) => {
  const userInitials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-shadow">
      <div className="flex items-center justify-between gap-3 sm:gap-4 max-w-7xl mx-auto">
        {/* Mobile brand & hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation sidebar"
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Logo size="sm" showSubtitle={false} />
        </div>

        {/* Global Search Input */}
        <div className="flex-1 max-w-xl">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search ${documentCount} documents...`}
              aria-label="Search documents"
              className="w-full pl-10 pr-9 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm text-slate-800 placeholder:text-slate-400 rounded-xl border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-150"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search query"
                className="absolute right-3 p-0.5 rounded text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <span className="text-xs font-bold leading-none">&times;</span>
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center absolute right-3 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs pointer-events-none">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-label="Grid card view"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-2xs font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-label="List table view"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-2xs font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Quick New Document Button on Top Bar */}
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateDocument}
            leftIcon={<Plus className="w-4 h-4" />}
            className="hidden sm:inline-flex"
          >
            New Document
          </Button>

          {/* User profile & logout */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold shadow-xs select-none border border-white"
              title={userEmail ? `Signed in as ${userEmail}` : 'User Account'}
              aria-label="User account"
            >
              {userInitials}
            </div>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                title="Sign out of Ajaia Docs"
                aria-label="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
