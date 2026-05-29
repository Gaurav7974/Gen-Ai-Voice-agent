import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
}

interface DashboardSidebarProps {
  items?: SidebarItem[];
  onItemClick?: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  items = [],
  onItemClick,
  isOpen = true,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleItemClick = (item: SidebarItem) => {
    navigate(item.path);
    onItemClick?.(item.id);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && !collapsed && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen bg-[#FCFAF7] border-r border-[#E8E4DC] transition-all duration-300 z-50',
          'lg:relative lg:z-0',
          collapsed ? 'w-20' : 'w-64',
          !isOpen && 'hidden lg:flex',
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E8E4DC]">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#f5622e] to-[#0fa87e] rounded-lg" />
              <span className="font-semibold text-[#0F0E0C]">Lyra</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-[#FEF0EB] rounded-lg transition-colors lg:inline-block hidden"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5 text-[#0F0E0C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Sidebar Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium',
                isActive(item.path)
                  ? 'bg-[#FEF0EB] text-[#f5622e] border border-[#f5622e]'
                  : 'text-[#0F0E0C] hover:bg-[#FEF0EB]',
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 py-0.5 text-xs font-medium bg-[#f5622e] text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#E8E4DC] space-y-2">
          <button
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#0F0E0C] hover:bg-[#FEF0EB] transition-colors text-sm',
              collapsed && 'justify-center'
            )}
            aria-label="Help"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {!collapsed && <span>Help</span>}
          </button>
          <button
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#0F0E0C] hover:bg-[#FEF0EB] transition-colors text-sm',
              collapsed && 'justify-center'
            )}
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
