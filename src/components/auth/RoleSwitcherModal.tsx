import React, { useState } from 'react';
import { Shield, UserCheck, Key, Lock, AlertCircle } from 'lucide-react';
import type { User, UserRole } from '../../types/index.ts';
import { authService } from '../../services/auth.ts';
import { Modal } from '../common/Modal.tsx';
import { Badge } from '../common/Badge.tsx';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  onSelectUser: (user: User) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onSelectUser
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const roleBadges: Record<UserRole, 'primary' | 'success' | 'warning' | 'info'> = {
    SUPER_ADMIN: 'primary',
    ADMIN_OFFICER: 'info',
    APPROVING_OFFICER: 'warning',
    READ_ONLY: 'neutral' as any
  };

  const roleBangla: Record<UserRole, string> = {
    SUPER_ADMIN: 'সুপার অ্যাডমিন (সকল ক্ষমতা)',
    ADMIN_OFFICER: 'প্রশাসনিক কর্মকর্তা (বরাদ্দ এন্ট্রি)',
    APPROVING_OFFICER: 'অনুমোদনকারী (পরিচালক - অনুমোদন ক্ষমতা)',
    READ_ONLY: 'পরিদর্শনকারী (শুধু পাঠ ও প্রিন্ট)'
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const result = authService.login(username, password);
    if (result.success && result.session) {
      onSelectUser(result.session.user);
      onClose();
    } else {
      setErrorMsg(result.error || 'লগইন ব্যর্থ হয়েছে।');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ব্যবহারকারী রোল ও প্রবেশাধিকার (RBAC Role Switcher & Login)"
      subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Quick Switch Profiles */}
        <div>
          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-teal-700" />
            <span>নির্ধারিত প্রাতিষ্ঠানিক ব্যবহারকারী হিসেবে অবিলম্বে সুইচ করুন:</span>
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">
            নিচের যেকোনো ইউজার নির্বাচন করে বিভিন্ন নিরাপত্তা রোলের কার্যকারিতা (অনুমোদন, এন্ট্রি, কিংবা রিড-অনলি রেস্ট্রিকশন) সাথে সাথে পরীক্ষা করুন:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {users.map((u) => {
              const isSelected = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{u.fullName}</div>
                      <div className="text-[11px] text-slate-500">{u.designation}</div>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0 mt-1" />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant={roleBadges[u.role]} size="sm">
                      {roleBangla[u.role] || u.role}
                    </Badge>
                    <span className="font-mono text-[10px] text-slate-400">@{u.username}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-3 text-slate-400 font-semibold">অথবা ইউজারনেম ও পাসওয়ার্ড দিয়ে প্রবেশ</span>
          </div>
        </div>

        {/* Form Login */}
        <form onSubmit={handleManualLogin} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ইউজারনেম</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="যেমন: admin, director"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">পাসওয়ার্ড</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড দিন"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0f2b48] hover:bg-[#163a61] text-white font-bold rounded-lg shadow-xs"
            >
              লগইন করুন
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
