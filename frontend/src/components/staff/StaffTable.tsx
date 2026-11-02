import React from 'react';
import { User } from '@/types';
import { formatDate } from '@/lib/utils';
import { Phone, Mail, Edit2, Trash2 } from 'lucide-react';

interface StaffTableProps {
  staff: User[];
  onToggleAccess: (member: User) => void;
  onEdit: (member: User) => void;
  onDelete: (member: User) => void;
  isLoading?: boolean;
}

export const StaffTable: React.FC<StaffTableProps> = ({
  staff,
  onToggleAccess,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4 sm:px-6">Name</th>
              <th className="py-3.5 px-4">Phone</th>
              <th className="py-3.5 px-4">Email</th>
              <th className="py-3.5 px-4 text-center">Login Access</th>
              <th className="py-3.5 px-4">Created Date</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-36" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-6 w-11 bg-slate-200 rounded-full mx-auto" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-6 bg-slate-200 rounded w-16 mx-auto" /></td>
                </tr>
              ))
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <p className="text-base font-semibold text-slate-700">No staff members found</p>
                  <p className="text-xs text-slate-400 mt-1">Add staff members to give them portal access.</p>
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Name with subtle avatar */}
                  <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-800 font-bold flex items-center justify-center text-xs">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900">{member.name}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <a
                      href={`tel:${member.phone}`}
                      className="text-slate-700 hover:text-forest-900 font-medium inline-flex items-center gap-1.5"
                    >
                      <Phone size={13} className="text-slate-400" />
                      <span>{member.phone}</span>
                    </a>
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <a
                      href={`mailto:${member.email}`}
                      className="text-slate-600 hover:text-forest-900 inline-flex items-center gap-1.5"
                    >
                      <Mail size={13} className="text-slate-400" />
                      <span>{member.email}</span>
                    </a>
                  </td>

                  {/* Login Access Toggle matching screenshot */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onToggleAccess(member)}
                      className="relative inline-flex items-center cursor-pointer focus:outline-none group"
                      title={member.is_active ? 'Click to disable access' : 'Click to enable access'}
                    >
                      <div
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          member.is_active ? 'bg-forest-800' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform shadow-sm ${
                            member.is_active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  </td>

                  {/* Created Date */}
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-xs">
                    {formatDate(member.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onEdit(member)}
                        className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit / Reset Password"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(member)}
                        className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="Delete Staff"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

