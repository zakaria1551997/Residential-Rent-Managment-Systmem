import React from 'react';
import { Search, Bell, Shield, Network, RefreshCw, Menu } from 'lucide-react';
import type { User, AppSettings } from '../../types/index.ts';
import { formatBanglaDate, toBanglaNumber } from '../../logic/rules.ts';

interface TopHeaderProps {
  settings: AppSettings;
  currentUser: User;
  onOpenNotifications: () => void;
  unreadCount: number;
  onOpenServerConfig: () => void;
  isOnline: boolean;
  onGlobalSearch: (term: string) => void;
  searchTerm: string;
  onRefreshData: () => void;
  isRefreshing: boolean;
  onSwitchUserRole: () => void;
  onToggleMobileSidebar?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  settings,
  currentUser,
  onOpenNotifications,
  unreadCount,
  onOpenServerConfig,
  isOnline,
  onGlobalSearch,
  searchTerm,
  onRefreshData,
  isRefreshing,
  onSwitchUserRole,
  onToggleMobileSidebar
}) => {
  const currentDateBn = formatBanglaDate(new Date());

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-5 flex items-center justify-between gap-3 shadow-xs z-10 no-print">
      {/* Left: Mobile Menu & Institution Heading */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 md:flex-initial md:shrink-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden shrink-0"
            aria-label="মেনু খুলুন"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[13px] xl:text-sm font-bold text-[#0f2b48] tracking-tight truncate sm:whitespace-nowrap">
              {settings.hospitalNameBn}
            </h1>
            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium whitespace-nowrap hidden 2xl:inline-block">
              আজকের তারিখ: {currentDateBn}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block truncate">
            {settings.subTitleBn}
          </p>
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="hidden md:block flex-1 max-w-[210px] xl:max-w-[260px] min-w-[140px]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onGlobalSearch(e.target.value)}
            placeholder="বাসিন্দা, কক্ষ নং, স্মারক..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition-all text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => onGlobalSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right: Quick actions, notifications, role switcher */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Refresh Central State */}
        <button
          onClick={onRefreshData}
          title="ডাটাবেজ রিফ্রেশ করুন"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
        </button>

        {/* LAN Server Health Indicator */}
        <button
          onClick={onOpenServerConfig}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
          }`}
          title="সার্ভার নেটওয়ার্ক স্ট্যাটাস"
        >
          <Network className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">{isOnline ? 'LAN সক্রিয়' : 'অফলাইন'}</span>
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="নোটিফিকেশন সেন্টার"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '৯+' : toBanglaNumber(unreadCount)}
            </span>
          )}
        </button>

        {/* Role Switcher Button for Testing RBAC */}
        <button
          onClick={onSwitchUserRole}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f2b48] hover:bg-[#163a61] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
          title="ব্যবহারকারী রোল পরিবর্তন (RBAC)"
        >
          <Shield className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{currentUser.fullName}</span>
        </button>
      </div>
    </header>
  );
};
