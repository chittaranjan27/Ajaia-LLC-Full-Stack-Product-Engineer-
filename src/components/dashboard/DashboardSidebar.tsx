import React, { useState, useEffect, useRef } from 'react';
import {
  Files,
  User,
  Users,
  Trash2,
  Plus,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { DashboardTab } from '../../types/document';
import { Logo } from '../common/Logo';
import { Button } from '../common/Button';
import { checkSupabaseConnection, type ConnectionCheckResult } from '../../lib/supabase';

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onCreateDocument: () => void;
  onImportFile: (file: File) => void;
  isImporting?: boolean;
  counts: {
    all: number;
    owned: number;
    shared: number;
    trash: number;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange,
  onCreateDocument,
  onImportFile,
  isImporting = false,
  counts,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [connStatus, setConnStatus] = useState<{
    isLoading: boolean;
    result: ConnectionCheckResult | null;
  }>({
    isLoading: true,
    result: null,
  });

  const handleRetry = () => {
    setConnStatus({ isLoading: true, result: null });
    checkSupabaseConnection().then((result) => {
      setConnStatus({ isLoading: false, result });
    });
  };

  useEffect(() => {
    let isMounted = true;
    checkSupabaseConnection().then((result) => {
      if (isMounted) {
        setConnStatus({ isLoading: false, result });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const navItems = [
    {
      id: 'all' as DashboardTab,
      label: 'All Documents',
      icon: Files,
      count: counts.all,
    },
    {
      id: 'owned' as DashboardTab,
      label: 'Owned by Me',
      icon: User,
      count: counts.owned,
    },
    {
      id: 'shared' as DashboardTab,
      label: 'Shared with Me',
      icon: Users,
      count: counts.shared,
    },
    {
      id: 'trash' as DashboardTab,
      label: 'Trash',
      icon: Trash2,
      count: counts.trash,
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImportFile(files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 w-64 p-4 shrink-0">
      {/* Brand logo */}
      <div className="px-2 py-2 mb-6">
        <Logo size="md" />
      </div>

      {/* Main Action CTAs */}
      <div className="space-y-3 mb-6">
        <Button
          variant="primary"
          className="w-full justify-start shadow-sm shadow-blue-500/20"
          leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          disabled={isImporting}
          onClick={() => {
            onCreateDocument();
            onCloseMobile?.();
          }}
        >
          New Document
        </Button>

        <div className="space-y-1">
          <Button
            variant="outline"
            className="w-full justify-start text-slate-700 hover:text-slate-900 cursor-pointer"
            leftIcon={<Upload className="w-4 h-4 stroke-[2]" />}
            isLoading={isImporting}
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
          >
            {isImporting ? 'Importing file...' : 'Import File'}
          </Button>
          <p className="text-[11px] text-slate-400 px-1 select-none">
            Supports .txt and .md (max 1 MB)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown,.text,text/plain,text/markdown"
          className="hidden"
          disabled={isImporting}
          onChange={handleFileChange}
        />
      </div>

      {/* Navigation section */}
      <div className="flex-1">
        <div className="px-2 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Workspace
        </div>
        <nav className="space-y-1" aria-label="Dashboard views">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-blue-200/60 text-blue-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Supabase Connection Status Card */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-2 mt-auto">
        <div className="flex items-center justify-between font-semibold text-slate-800">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Database Status</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={connStatus.isLoading}
            title="Re-check Supabase connection"
            aria-label="Re-check Supabase connection"
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${connStatus.isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {connStatus.isLoading ? (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50/80 px-2 py-1 rounded-md border border-amber-200/50 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Testing connection...</span>
          </div>
        ) : connStatus.result?.success ? (
          <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/60 text-[11px]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-medium">Connected</span>
            </div>
            {connStatus.result.latencyMs !== undefined && (
              <span className="text-[10px] text-emerald-600 font-mono">
                {connStatus.result.latencyMs}ms
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-1 text-red-800 bg-red-50 px-2 py-1.5 rounded-md border border-red-200/60 text-[11px]">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="font-medium">Connection Failed</span>
            </div>
            <p className="text-[10px] text-red-600 leading-tight">
              {connStatus.result?.error || connStatus.result?.message || 'Unable to connect to database'}
            </p>
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-slate-400">
          Configured in <code className="text-slate-600 font-mono">.env.local</code>. Schema verified for upcoming CRUD tasks.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:flex h-screen sticky top-0 z-20">
        {content}
      </aside>

      {/* Mobile drawer backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        >
          <div
            className="fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
};
