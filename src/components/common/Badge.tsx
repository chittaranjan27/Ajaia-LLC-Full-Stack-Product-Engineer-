import React from 'react';
import { User, Users, CheckCircle2, Clock, CloudAlert, RotateCcw } from 'lucide-react';
import type { OwnershipType, SaveStatus } from '../../types/document';

interface OwnershipBadgeProps {
  type: OwnershipType;
  authorName?: string;
  size?: 'sm' | 'md';
}

export const OwnershipBadge: React.FC<OwnershipBadgeProps> = ({
  type,
  authorName,
  size = 'sm',
}) => {
  const isOwned = type === 'owned';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeClasses} ${
        isOwned
          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
          : 'bg-purple-50 text-purple-700 border border-purple-200/60'
      }`}
    >
      {isOwned ? (
        <User className="w-3 h-3 text-blue-600" />
      ) : (
        <Users className="w-3 h-3 text-purple-600" />
      )}
      <span>{isOwned ? 'Owned by Me' : authorName ? `Shared by ${authorName}` : 'Shared with Me'}</span>
    </span>
  );
};

interface SaveStatusBadgeProps {
  status: SaveStatus;
  className?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const SaveStatusBadge: React.FC<SaveStatusBadgeProps> = ({
  status,
  className = '',
  onRetry,
  isRetrying = false,
}) => {
  const configs = {
    saved: {
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      text: 'Saved',
      classes: 'text-emerald-700 bg-emerald-50/80 border-emerald-200/60',
    },
    saving: {
      icon: <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />,
      text: 'Saving...',
      classes: 'text-amber-700 bg-amber-50/80 border-amber-200/60',
    },
    unsaved: {
      icon: <CloudAlert className="w-3.5 h-3.5 text-slate-500" />,
      text: 'Unsaved edits',
      classes: 'text-slate-600 bg-slate-100 border-slate-200',
    },
    error: {
      icon: <CloudAlert className="w-3.5 h-3.5 text-red-600" />,
      text: 'Save failed',
      classes: 'text-red-700 bg-red-50/90 border-red-300',
    },
  };

  const config = configs[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-all duration-200 ${config.classes} ${className}`}
      title={config.text}
    >
      {config.icon}
      <span className="inline">{config.text}</span>

      {status === 'error' && onRetry && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRetry();
          }}
          disabled={isRetrying}
          className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-800 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer shadow-2xs"
          title="Retry saving to cloud"
        >
          <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
        </button>
      )}
    </span>
  );
};
