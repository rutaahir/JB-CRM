import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/common/Sidebar';
import { Navbar } from '@/components/common/Navbar';
import { MobileNav } from '@/components/common/MobileNav';
import { Toaster } from 'sonner';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-800">
      <Toaster position="top-right" richColors closeButton />

      {/* Desktop Fixed Left Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Mobile Drawer & Bottom Navigation */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Right Content Wrapper: Starts cleanly after the fixed sidebar */}
      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Navbar: Perfectly aligned, zero overlap */}
        <Navbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Main Content: Generous whitespace and optimal space utilization */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 pb-20 md:pb-8 w-full max-w-[1700px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
