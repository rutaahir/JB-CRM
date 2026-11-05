import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ContactViewPage } from '@/pages/ContactViewPage';
import { ContactMasterPage } from '@/pages/ContactMasterPage';
import { StaffPage } from '@/pages/StaffPage';
import { DealsPage } from '@/pages/DealsPage';
import { PendingOrdersPage } from '@/pages/PendingOrdersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-forest-800/20 border-t-forest-900 rounded-full animate-spin" />
        <p className="mt-3 text-xs font-semibold text-slate-500">Loading Jalaram Brokers CRM...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Admin Only Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes wrapped in AppLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Contact Master & View */}
              <Route path="contacts/view" element={<ContactViewPage />} />
              <Route path="contacts/master" element={<ContactMasterPage />} />

              {/* Sauda Deals (Entry F6 & Register F7) */}
              <Route path="deals" element={<DealsPage />} />

              {/* Pending Orders & PDF Extractor (Module 4) */}
              <Route path="pending-orders" element={<PendingOrdersPage />} />

              {/* Staff Management (Module 11) */}
              <Route
                path="staff"
                element={
                  <AdminRoute>
                    <StaffPage />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
