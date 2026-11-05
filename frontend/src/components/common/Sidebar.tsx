import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Handshake,
  FileSpreadsheet,
  Building2,
  Users2,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out',
        'bg-[#062616] text-slate-200 border-r border-[#0d3f25] shadow-lg',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-4.5 flex items-center justify-between border-b border-[#0d3f25]/80">
        <div className="flex items-center overflow-hidden">
          <BrandLogo iconOnly={collapsed} size={collapsed ? 'sm' : 'md'} />
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0c4026] transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {/* 0. Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
              isActive
                ? 'bg-[#104e2d] text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
            )
          }
          title="Dashboard"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400 rounded-r-full shadow-sm" />
              )}
              <LayoutDashboard
                size={19}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {!collapsed && <span className="truncate">Dashboard</span>}
            </>
          )}
        </NavLink>

        {/* 1. Contact View */}
        <NavLink
          to="/contacts/view"
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
              isActive
                ? 'bg-[#104e2d] text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
            )
          }
          title="Contact View (Party Register)"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400 rounded-r-full shadow-sm" />
              )}
              <Users2
                size={19}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {!collapsed && <span className="truncate">Contact View</span>}
            </>
          )}
        </NavLink>

        {/* 2. Contact Master (F8) */}
        <NavLink
          to="/contacts/master"
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
              isActive
                ? 'bg-[#104e2d] text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
            )
          }
          title="Contact Master (F8)"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400 rounded-r-full shadow-sm" />
              )}
              <Building2
                size={19}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">Contact Master</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-amber-300 font-semibold">
                    F8
                  </span>
                </div>
              )}
            </>
          )}
        </NavLink>

        {/* 3. Sauda Entry (F6) */}
        {(() => {
          const isEntry = location.pathname === '/deals' && new URLSearchParams(location.search).get('mode') === 'entry';
          return (
            <NavLink
              to="/deals?mode=entry"
              className={cn(
                'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
                isEntry
                  ? 'bg-[#104e2d] text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
              )}
              title="Sauda Entry (= Deal Entry)"
            >
              {isEntry && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400 rounded-r-full shadow-sm" />
              )}
              <Handshake
                size={19}
                className={cn(
                  'shrink-0 transition-colors',
                  isEntry ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">Sauda Entry</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-amber-300 font-semibold">
                    F6
                  </span>
                </div>
              )}
            </NavLink>
          );
        })()}

        {/* 4. Sauda Register (F7) */}
        {(() => {
          const isRegister = location.pathname === '/deals' && new URLSearchParams(location.search).get('mode') !== 'entry';
          return (
            <NavLink
              to="/deals?mode=register"
              className={cn(
                'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
                isRegister
                  ? 'bg-[#104e2d] text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
              )}
              title="Sauda Register (= Order Register)"
            >
              {isRegister && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400 rounded-r-full shadow-sm" />
              )}
              <FileSpreadsheet
                size={19}
                className={cn(
                  'shrink-0 transition-colors',
                  isRegister ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">Sauda Register</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-amber-300 font-semibold">
                    F7
                  </span>
                </div>
              )}
            </NavLink>
          );
        })()}

        {/* 5. Pending Orders & PDF Extractor (Module 4) */}
        <NavLink
          to="/pending-orders"
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
              isActive
                ? 'bg-[#104e2d] text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
            )
          }
          title="Daily Pending Orders & PDF Extractor"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400 rounded-r-full shadow-sm" />
              )}
              <Clock
                size={19}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">Pending Orders</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold">
                    PDF
                  </span>
                </div>
              )}
            </>
          )}
        </NavLink>
      </nav>

      {/* Footer Navigation: Logout */}
      <div className="p-3 border-t border-[#0d3f25]/80 space-y-1 bg-[#041d10]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Logout"
        >
          <LogOut size={18} className="shrink-0 text-rose-400" />
          {!collapsed && <span className="truncate font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
