import React, { useState } from 'react';
import { ShieldCheck, Plus, Edit, UserCheck, ShieldAlert, Key, User, Phone, Mail } from 'lucide-react';
import type { User as UserType, UserRole } from '../../types/index.ts';
import { formatBanglaDate } from '../../logic/rules.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';

interface UsersViewProps {
  users: UserType[];
  currentUser: UserType;
  onSaveUser: (userData: Partial<UserType>) => void;
  canManage: boolean;
  onSwitchUser: (user: UserType) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onSaveUser,
  canManage,
  onSwitchUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserType> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roleLabels: Record<UserRole, { label: string; desc: string; badge: 'primary' | 'success' | 'warning' | 'info' }> = {
    SUPER_ADMIN: {
      label: 'সুপার অ্যাডমিনিস্ট্রেটর',
      desc: 'পূর্ণ সিস্টেম নিয়ন্ত্রণ, ইউজার পরিচালনা ও ব্যাকআপ',
      badge: 'primary'
    },
    ADMIN_OFFICER: {
      label: 'প্রশাসনিক কর্মকর্তা',
      desc: 'বাসিন্দা, কক্ষ, বরাদ্দ এন্ট্রি ও নথি আপলোড',
      badge: 'info'
    },
    APPROVING_OFFICER: {
      label: 'অনুমোদনকারী কর্মকর্তা',
      desc: 'পরিচালক / উপ-পরিচালক: বরাদ্দ ও বাতিলের চূড়ান্ত অনুমোদন',
      badge: 'warning'
    },
    READ_ONLY: {
      label: 'পরিদর্শনকারী ইউজার',
      desc: 'শুধুমাত্র তথ্য অবলোকন এবং রিপোর্ট প্রিন্ট',
      badge: 'neutral' as any
    }
  };

  const handleOpenAdd = () => {
    setErrorMessage(null);
    setEditingUser({
      username: '',
      fullName: '',
      designation: 'কর্মকর্তা',
      role: 'ADMIN_OFFICER',
      email: '',
      phone: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: UserType) => {
    setErrorMessage(null);
    setEditingUser(u);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!editingUser?.username || !editingUser?.fullName || !editingUser?.role) {
      setErrorMessage('ইউজারনেম, পূর্ণ নাম এবং পদমর্যাদা আবশ্যক।');
      return;
    }

    try {
      onSaveUser(editingUser);
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'ইউজার সংরক্ষণ ব্যর্থ হয়েছে।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
            <span>ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা (RBAC - User & Role Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            সুপার অ্যাডমিন, প্রশাসনিক কর্মকর্তা, পরিচালক (অনুমোদনকারী) এবং পরিদর্শনকারী ব্যবহারকারীদের নিরাপত্তা ও অনুমতি নির্ধারণ।
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ব্যবহারকারী সৃষ্টি</span>
          </button>
        )}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map((user) => {
          const roleInfo = roleLabels[user.role] || { label: user.role, desc: '', badge: 'neutral' };
          const isMe = user.id === currentUser.id;

          return (
            <div
              key={user.id}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                isMe ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#0f2b48] text-teal-300 font-bold flex items-center justify-center shrink-0">
                    {user.fullName.charAt(0)}
                  </div>
                  <Badge variant={roleInfo.badge as any} size="sm">
                    {roleInfo.label}
                  </Badge>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-slate-900 text-sm">{user.fullName}</h3>
                  <p className="text-xs text-slate-500 font-medium">{user.designation}</p>
                  <p className="text-[11px] font-mono text-teal-700 mt-1">@{user.username}</p>
                </div>

                <p className="text-[11px] text-slate-600 mt-3 p-2 bg-slate-50 rounded border border-slate-100">
                  {roleInfo.desc}
                </p>

                <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                  {user.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSwitchUser(user)}
                  className={`text-xs px-2.5 py-1.5 rounded font-semibold transition-colors flex items-center gap-1.5 ${
                    isMe
                      ? 'bg-teal-50 text-teal-800 border border-teal-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="এই ইউজারের ভূমিকায় সুইচ করুন (RBAC টেস্ট)"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isMe ? 'বর্তমান ইউজার' : 'সুইচ করুন'}</span>
                </button>

                {canManage && (
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                    title="ইউজার তথ্য সম্পাদনা"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser?.id ? 'ব্যবহারকারী তথ্য সম্পাদনা' : 'নতুন প্রাতিষ্ঠানিক ব্যবহারকারী সৃষ্টি'}
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ইউজারনেম (Username) *</label>
              <input
                type="text"
                required
                value={editingUser?.username || ''}
                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="যেমন: admin, officer, director"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">পূর্ণ নাম *</label>
              <input
                type="text"
                required
                value={editingUser?.fullName || ''}
                onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                placeholder="যেমন: কাজী সাখাওয়াত হোসেন"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">পদবী (Designation) *</label>
              <input
                type="text"
                required
                value={editingUser?.designation || ''}
                onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })}
                placeholder="যেমন: প্রশাসনিক কর্মকর্তা"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">নিরাপত্তা রোল (Role / RBAC) *</label>
              <select
                required
                value={editingUser?.role || 'ADMIN_OFFICER'}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              >
                <option value="SUPER_ADMIN">সুপার অ্যাডমিনিস্ট্রেটর (পূর্ণ নিয়ন্ত্রণ)</option>
                <option value="ADMIN_OFFICER">প্রশাসনিক কর্মকর্তা (বরাদ্দ ও বাসিন্দা ব্যবস্থাপনা)</option>
                <option value="APPROVING_OFFICER">অনুমোদনকারী কর্মকর্তা (পরিচালক/উপ-পরিচালক)</option>
                <option value="READ_ONLY">পরিদর্শনকারী ইউজার (রিপোর্ট ও ভিউ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
              <input
                type="text"
                value={editingUser?.phone || ''}
                onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                placeholder="যেমন: 01711223344"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">অফিসিয়াল ইমেইল</label>
              <input
                type="email"
                value={editingUser?.email || ''}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                placeholder="name@ssnimch.gov.bd"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-xs"
            >
              ব্যবহারকারী সংরক্ষণ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
