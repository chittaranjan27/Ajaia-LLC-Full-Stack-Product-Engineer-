import React from 'react';
import { FileText } from 'lucide-react';

interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showSubtitle = true,
  onClick,
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-11 h-11 text-lg',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`inline-flex items-center gap-2.5 select-none ${
        onClick ? 'cursor-pointer group hover:opacity-95 transition-opacity' : ''
      } ${className}`}
    >
      <div
        className={`flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-sm shadow-blue-500/25 ${iconSizes[size]}`}
      >
        <FileText className="w-5 h-5 stroke-[2.2]" />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold tracking-tight text-slate-900 ${titleSizes[size]}`}>
            Ajaia <span className="text-blue-600">Docs</span>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-200/60 rounded">
            Beta
          </span>
        </div>
        {showSubtitle && size !== 'sm' && (
          <span className="text-[11px] font-medium text-slate-400 tracking-normal -mt-0.5">
            Collaborative Document Suite
          </span>
        )}
      </div>
    </div>
  );
};
