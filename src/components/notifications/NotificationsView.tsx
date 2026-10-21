import React from 'react';
import { Bell, CheckCheck, AlertCircle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { AppNotification } from '../../types/index.ts';
import { formatBanglaDate, toBanglaNumber } from '../../logic/rules.ts';

interface NotificationsViewProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'URGENT':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-700" />
            <span>প্রশাসনিক নোটিফিকেশন ও সতর্কবার্তা কেন্দ্র (Notification Center)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            বাসা বরাদ্দ অনুমোদন, বাতিল আবেদন প্রাপ্তি, নথিপত্র সতর্কতা ও রক্ষণাবেক্ষণ নোটিশ।
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <CheckCheck className="w-4 h-4 text-teal-700" />
            <span>সকল নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করুন</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            কোনো নোটিফিকেশন নেই। সিস্টেমের সকল কার্যক্রম স্বাভাবিক রয়েছে।
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => onMarkRead(notif.id)}
              className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                notif.read ? 'bg-white hover:bg-slate-50/80' : 'bg-teal-50/40 hover:bg-teal-50/70'
              }`}
            >
              <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0 shadow-2xs">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`font-bold ${notif.read ? 'text-slate-800' : 'text-teal-950 font-extrabold'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                    {formatBanglaDate(notif.createdAt)} • {new Date(notif.createdAt).toLocaleTimeString('bn-BD')}
                  </span>
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
              </div>

              {!notif.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0 mt-2" title="অপঠিত" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
