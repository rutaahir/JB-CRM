import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  X,
  ChevronDown,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const masterSubItems = [
    { label: 'Sellers', path: '/sellers', icon: Building2 },
    { label: 'Buyers', path: '/buyers', icon: Users2 },
    { label: 'Products', path: '/products', icon: Package },
    ...(isAdmin ? [{ label: 'Staff', path: '/staff', icon: ShieldCheck }] : []),
  ];

  const isMasterActive = masterSubItems.some((item) =>
    location.pathname.startsWith(item.path)
  );

  const [isMasterOpen, setIsMasterOpen] = useState(true);

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
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
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

              {/* Nav Links */}
              <nav className="space-y-1">
                {/* Dashboard */}
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

                {/* Master Section */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsMasterOpen(!isMasterOpen)}
                    className={cn(
                      'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer',
                      isMasterActive
                        ? 'bg-[#0e4326] text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Database size={18} className="text-amber-400" />
                      <span>Master</span>
                    </div>
                    <ChevronDown
                      size={15}
                      className={cn(
                        'text-slate-400 transition-transform duration-200',
                        isMasterOpen ? 'rotate-180 text-amber-400' : ''
                      )}
                    />
                  </button>

                  {isMasterOpen && (
                    <div className="mt-1 space-y-1 pl-4 ml-4 border-l border-[#125833]/80">
                      {masterSubItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                                isActive
                                  ? 'bg-[#14532D] text-white font-bold'
                                  : 'text-slate-300 hover:text-white hover:bg-[#0c3d24]'
                              )
                            }
                          >
                            <SubIcon size={15} className="text-amber-400" />
                            <span>{subItem.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>

                  {/* Deals / Sauda Booking */}
                  <NavLink
                    to="/deals"
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#104e2d] text-white font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                      )
                    }
                  >
                    <Handshake size={18} className="text-amber-400" />
                    <span>Deals / Sauda</span>
                  </NavLink>

                  {/* PDF Statements */}
                  <NavLink
                    to="/statements"
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#104e2d] text-white font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                      )
                    }
                  >
                    <FileSpreadsheet size={18} className="text-amber-400" />
                    <span>PDF Statements</span>
                  </NavLink>

                  {/* Recovery Ledger */}
                  <NavLink
                    to="/recoveries"
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#104e2d] text-white font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-[#0b3820]'
                      )
                    }
                  >
                    <IndianRupee size={18} className="text-amber-400" />
                    <span>Recovery Ledger</span>
                  </NavLink>

              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#0d3f25] space-y-1">
              <button
                onClick={() => {
                  onClose();
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-[#0b3820]"
              >
                <User size={18} />
                <span>Profile Settings</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-rose-300 hover:text-rose-200 hover:bg-rose-950/40"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
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
            to="/sellers"
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
                <span className="mt-1">Sellers</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/buyers"
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
                <span className="mt-1">Buyers</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-forest-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Package size={18} className={cn(isActive ? 'text-forest-800 stroke-[2.5]' : 'text-slate-500')} />
                <span className="mt-1">Products</span>
              </>
            )}
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/staff"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors',
                  isActive ? 'text-forest-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <ShieldCheck size={18} className={cn(isActive ? 'text-forest-800 stroke-[2.5]' : 'text-slate-500')} />
                  <span className="mt-1">Staff</span>
                </>
              )}
            </NavLink>
          )}
        </div>
      </div>
    </>
  );
};
