import React from 'react';
import { Wand2, Layers, Settings } from 'lucide-react';

type Page = 'create' | 'creations' | 'settings';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { label: string; page: Page; Icon: React.ElementType }[] = [
  { label: 'Create Model', page: 'create', Icon: Wand2 },
  { label: 'My Creations', page: 'creations', Icon: Layers },
  { label: 'Settings', page: 'settings', Icon: Settings },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-surface border-r border-border">
      {/* Logo area */}
      <div className="px-5 py-6 flex items-center gap-3 border-b border-border">
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          {/* Outer ring */}
          <circle cx="18" cy="18" r="17" stroke="#6366f1" strokeWidth="1.5" />
          {/* Gear teeth via path */}
          <path
            d="M18 4v3M18 29v3M4 18h3M29 18h3M7.4 7.4l2.1 2.1M26.5 26.5l2.1 2.1M26.5 9.5l2.1-2.1M7.4 28.6l2.1-2.1"
            stroke="#6366f1"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Body */}
          <rect x="12" y="12" width="12" height="12" rx="2" fill="#6366f1" opacity="0.2" stroke="#6366f1" strokeWidth="1.2" />
          {/* Eyes */}
          <circle cx="15" cy="16" r="1.5" fill="#6366f1" />
          <circle cx="21" cy="16" r="1.5" fill="#6366f1" />
          {/* Mouth */}
          <path d="M15 20h6" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <div className="min-w-0">
          <div className="text-text-primary font-bold text-base leading-tight tracking-tight">
            RoboCraft
          </div>
          <div className="text-text-muted text-xs mt-0.5 font-mono tracking-wide">
            AI 3D Generator
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ label, page, Icon }) => {
          const isActive = activePage === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                transition-colors duration-150 text-left
                ${isActive
                  ? 'bg-accent/10 border-l-2 border-accent text-text-primary pl-[10px]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border-l-2 border-transparent pl-[10px]'
                }
              `}
            >
              <Icon
                size={16}
                className={isActive ? 'text-accent' : 'text-current'}
              />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Version badge */}
      <div className="px-5 py-4 border-t border-border">
        <span className="text-text-muted text-xs font-mono">v0.1.0 Beta</span>
      </div>
    </aside>
  );
}
