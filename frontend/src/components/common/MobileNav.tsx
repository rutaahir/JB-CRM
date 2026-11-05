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
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Drawer Overlay for Mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
          <div
            className="fixed inset-y-0 left-0 w-72 bg-[#062817] text-white p-4 shadow-xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#0d3f25]">
                <BrandLogo size="md" />
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* User banner in drawer */}
              <div className="my-4 p-3 bg-[#0a3821] rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 font-bold flex items-center justify-center text-white">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-xs text-slate-300 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Nav Links: Dashboard, Contact View, Contact Master, Sauda Entry, Sauda Register */}
              <nav className="space-y-1.5">
                {/* 0. Dashboard */}
                <NavLink
                  to="/dashboard"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#10482b] text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                    )
                  }
                >
                  <LayoutDashboard size={18} className="text-amber-400" />
                  <span>Dashboard</span>
                </NavLink>

                {/* 1. Contact View */}
                <NavLink
                  to="/contacts/view"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#10482b] text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                    )
                  }
                >
                  <Users2 size={18} className="text-amber-400" />
                  <span>Contact View</span>
                </NavLink>

                {/* 2. Contact Master (F8) */}
                <NavLink
                  to="/contacts/master"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#10482b] text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Building2 size={18} className="text-amber-400" />
                    <span>Contact Master</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-amber-300 font-semibold">
                    F8
                  </span>
                </NavLink>

                {/* 3. Sauda Entry (F6) */}
                {(() => {
                  const isEntry = location.pathname === '/deals' && new URLSearchParams(location.search).get('mode') === 'entry';
                  return (
                    <NavLink
                      to="/deals?mode=entry"
                      onClick={onClose}
                      className={cn(
                        'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isEntry
                          ? 'bg-[#10482b] text-white font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Handshake size={18} className={isEntry ? 'text-amber-400' : 'text-slate-400'} />
                        <span>Sauda Entry</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-amber-300 font-semibold">
                        F6
                      </span>
                    </NavLink>
                  );
                })()}

                {/* 4. Sauda Register (F7) */}
                {(() => {
                  const isRegister = location.pathname === '/deals' && new URLSearchParams(location.search).get('mode') !== 'entry';
                  return (
                    <NavLink
                      to="/deals?mode=register"
                      onClick={onClose}
                      className={cn(
                        'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isRegister
                          ? 'bg-[#10482b] text-white font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet size={18} className={isRegister ? 'text-amber-400' : 'text-slate-400'} />
                        <span>Sauda Register</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-amber-300 font-semibold">
                        F7
                      </span>
                    </NavLink>
                  );
                })()}

                {/* 5. Pending Orders & PDF Extractor (Module 4) */}
                <NavLink
                  to="/pending-orders"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#10482b] text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-amber-400" />
                    <span>Pending Orders</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold">
                    PDF
                  </span>
                </NavLink>
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#0d3f25] space-y-1">
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 cursor-pointer"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 px-2 py-1 shadow-lg">
        <div className="flex items-center justify-around">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-forest-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard size={18} className={cn(isActive ? 'text-forest-800 stroke-[2.5]' : 'text-slate-500')} />
                <span className="mt-1">Dashboard</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/contacts/view"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-forest-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Users2 size={18} className={cn(isActive ? 'text-forest-800 stroke-[2.5]' : 'text-slate-500')} />
                <span className="mt-1">Contact View</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/contacts/master"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-forest-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Building2 size={18} className={cn(isActive ? 'text-forest-800 stroke-[2.5]' : 'text-slate-500')} />
                <span className="mt-1">Contact Master</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/deals?mode=entry"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors',
                location.pathname === '/deals' && location.search.includes('entry') ? 'text-forest-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              )
            }
          >
            {() => (
              <>
                <Handshake size={18} className={cn(location.pathname === '/deals' && location.search.includes('entry') ? 'text-forest-800 stroke-[2.5]' : 'text-slate-500')} />
                <span className="mt-1">Sauda Entry</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/deals"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors',
                isActive && !location.search.includes('entry') ? 'text-forest-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <FileSpreadsheet size={18} className={cn(isActive && !location.search.includes('entry') ? 'text-forest-800 stroke-[2.5]' : 'text-slate-500')} />
                <span className="mt-1">Sauda Register</span>
              </>
            )}
          </NavLink>
        </div>
      </div>
    </>
  );
};
export default MobileNav;
