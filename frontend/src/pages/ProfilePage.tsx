import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import { User, Mail, Phone, Shield, Calendar, Lock } from 'lucide-react';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      setUpdating(true);
      // Admin or staff self update password
      await apiClient.patch(`/auth/me/`, { password });
      toast.success('Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
      refreshUser();
    } catch (err: any) {
      toast.error('Password change is currently managed through administrator control.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-slate-900">Profile Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your user details and credentials</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: User Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-subtle flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold text-2xl flex items-center justify-center shadow-md mb-4 ring-4 ring-amber-50">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>

          <h3 className="font-heading font-bold text-lg text-slate-900">{user?.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>

          <span className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {user?.role === 'ADMIN' ? 'Administrator' : 'Staff Member'}
          </span>

          <div className="w-full mt-6 pt-6 border-t border-slate-100 text-left space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Phone size={14} className="text-slate-400" />
              <span>+91 {user?.phone || 'Not specified'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Shield size={14} className="text-slate-400" />
              <span>Full Access: {user?.role === 'ADMIN' ? 'Yes' : 'Read Only'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Calendar size={14} className="text-slate-400" />
              <span>Joined: {formatDate(user?.created_at || '')}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Account & Security */}
        <div className="md:col-span-2 space-y-6">
          {/* Account Details Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-subtle space-y-4">
            <h4 className="font-heading font-bold text-base text-slate-900">Account Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium">Full Name</label>
                <p className="font-semibold text-slate-800 mt-1">{user?.name}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Email Address</label>
                <p className="font-semibold text-slate-800 mt-1">{user?.email}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Role Privilege</label>
                <p className="font-semibold text-slate-800 mt-1">{user?.role}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Account Status</label>
                <p className="font-semibold text-emerald-600 mt-1">Active</p>
              </div>
            </div>
          </div>

          {/* Security / Password update Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-subtle space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Lock size={18} className="text-forest-900" />
              <h4 className="font-heading font-bold text-base">Change Password</h4>
            </div>
            <p className="text-xs text-slate-500">
              Ensure your account uses a secure password of at least 6 characters.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updating || !password}
                  className="px-5 py-2 text-sm font-semibold text-white bg-forest-900 hover:bg-forest-800 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

