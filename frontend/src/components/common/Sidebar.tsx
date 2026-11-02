import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Handshake,
  FileSpreadsheet,
  IndianRupee,
  Building2,
  Users2,
  Package,
  ShieldCheck,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Master sub-items
  const masterSubItems = [
    { label: 'Sellers', path: '/sellers', icon: Building2 },
    { label: 'Buyers', path: '/buyers', icon: Users2 },
    { label: 'Products', path: '/products', icon: Package },
    ...(isAdmin ? [{ label: 'Staff', path: '/staff', icon: ShieldCheck }] : []),
  ];

  // Check if any master sub-item is currently active
  const isMasterActive = masterSubItems.some((item) =>
    location.pathname.startsWith(item.path)
  );

  // Keep Master menu open when an active sub-route is visited, or toggled by user
  const [isMasterOpen, setIsMasterOpen] = useState(true);

  useEffect(() => {
    if (isMasterActive) {
      setIsMasterOpen(true);
    }
  }, [location.pathname, isMasterActive]);

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
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {/* 1. Dashboard Nav Item */}
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

        {/* 2. Master Dropdown Parent */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              if (collapsed) {
                onToggleCollapse();
                setIsMasterOpen(true);
              } else {
                setIsMasterOpen(!isMasterOpen);
              }
            }}
            className={cn(
              'w-full group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none cursor-pointer',
              isMasterActive
                ? 'bg-[#0e4326] text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
            )}
            title="Master Management"
          >
            <div className="flex items-center gap-3.5 truncate">
              {isMasterActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400/80 rounded-r-full shadow-sm" />
              )}
              <Database
                size={19}
                className={cn(
                  'shrink-0 transition-colors',
                  isMasterActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {!collapsed && <span className="truncate">Master</span>}
            </div>

            {!collapsed && (
              <ChevronDown
                size={15}
                className={cn(
                  'shrink-0 text-slate-400 transition-transform duration-200',
                  isMasterOpen ? 'rotate-180 text-amber-400' : ''
                )}
              />
            )}
          </button>

          {/* Master Submenu Items */}
          {(!collapsed || isMasterOpen) && !collapsed && (
            <div
              className={cn(
                'overflow-hidden transition-all duration-200 mt-1 space-y-1 pl-4 border-l-2 border-[#125833]/80 ml-5'
              )}
              style={{ display: isMasterOpen ? 'block' : 'none' }}
            >
              {masterSubItems.map((subItem) => {
                const SubIcon = subItem.icon;
                return (
                  <NavLink
                    key={subItem.path}
                    to={subItem.path}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors select-none',
                        isActive
                          ? 'bg-[#14532D] text-white font-bold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-[#0c3d24]'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <SubIcon
                          size={15}
                          className={cn(
                            'shrink-0',
                            isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                          )}
                        />
                        <span className="truncate">{subItem.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

          {/* 3. Deals / Sauda Booking */}
          <NavLink
            to="/deals"
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
                isActive
                  ? 'bg-[#104e2d] text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
              )
            }
            title="Sauda Deals & Brokerage"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400 rounded-r-full shadow-sm" />
                )}
                <Handshake
                  size={19}
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                {!collapsed && <span className="truncate">Deals / Sauda</span>}
              </>
            )}
          </NavLink>

          {/* 4. PDF Statement Extractor */}
          <NavLink
            to="/statements"
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
                isActive
                  ? 'bg-[#104e2d] text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
              )
            }
            title="All-in-one PDF Statements"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400 rounded-r-full shadow-sm" />
                )}
                <FileSpreadsheet
                  size={19}
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                {!collapsed && <span className="truncate">PDF Statements</span>}
              </>
            )}
          </NavLink>

          {/* 5. Recovery Ledger */}
          <NavLink
            to="/recoveries"
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
                isActive
                  ? 'bg-[#104e2d] text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
              )
            }
            title="Recovery Ledger & Balances"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-amber-400 rounded-r-full shadow-sm" />
                )}
                <IndianRupee
                  size={19}
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                {!collapsed && <span className="truncate">Recovery Ledger</span>}
              </>
            )}
          </NavLink>

      </nav>

      {/* Footer Navigation: Profile & Logout */}
      <div className="p-3 border-t border-[#0d3f25]/80 space-y-1 bg-[#041d10]">
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-[#0a3821] transition-colors cursor-pointer"
          title="Profile"
        >
          <User size={18} className="shrink-0 text-slate-400" />
          {!collapsed && <span className="truncate font-medium">Profile</span>}
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-sm text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Logout"
        >
          <LogOut size={18} className="shrink-0 text-rose-400" />
          {!collapsed && <span className="truncate font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};
