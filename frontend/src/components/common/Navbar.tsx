import React, { useState, useRef, useEffect } from 'react';
import { Search, Menu, ChevronDown, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onOpenMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (q.toUpperCase().startsWith('SD-') || q.toUpperCase().startsWith('MO-') || q.toLowerCase().includes('sauda') || q.toLowerCase().includes('deal')) {
      navigate(`/deals?mode=register&search=${encodeURIComponent(q)}`);
    } else if (q.toLowerCase().includes('product') || q.toLowerCase().includes('khol') || q.toLowerCase().includes('feed') || q.toLowerCase().includes('pellet')) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    } else {
      navigate(`/contacts/view?search=${encodeURIComponent(q)}`);
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <header className="sticky top-0 z-20 h-16 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Mobile Hamburger & Logo */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none"
        >
          <Menu size={22} />
        </button>
        <span className="font-heading font-bold text-forest-900 text-lg">Jalaram Brokers</span>
      </div>

      {/* Global Search Bar (Contacts & Deals only) */}
      <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-md items-center relative">
        <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contacts, deals..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-xl text-sm placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-800/15 focus:border-forest-700 transition-all shadow-inner"
        />
      </form>

      {/* Right Controls: User Profile */}
      <div className="flex items-center gap-2 sm:gap-3.5 ml-auto">

        {/* User Profile Pill matching screenshot */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 pl-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-white shrink-0">
              {userInitial}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                {user?.name || 'Admin'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium capitalize">
                {user?.role === 'ADMIN' ? 'Administrator' : 'Staff Member'}
              </span>
            </div>
            <ChevronDown size={15} className="text-slate-400 hidden sm:block" />
          </button>

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LogOut size={16} className="text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
