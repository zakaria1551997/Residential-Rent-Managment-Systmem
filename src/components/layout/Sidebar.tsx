import React, { useState } from 'react';
import {
  LayoutGrid,
  Building2,
  DoorOpen,
  Users,
  BarChart2,
  Settings,
  ChevronDown,
  LogOut,
  Hospital,
  Network
} from 'lucide-react';
import type { User, Building } from '../../types/index.ts';
import { toBanglaNumber } from '../../logic/rules.ts';

export type ActiveTab =
  | 'dashboard'
  | 'residential'
  | 'buildings'
  | 'rooms'
  | 'residents'
  | 'allocations'
  | 'cancellations'
  | 'documents'
  | 'reports'
  | 'users'
  | 'notifications'
  | 'backup'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  buildings?: Building[];
  selectedBuildingId?: string;
  onSelectBuilding?: (buildingId: string) => void;
  currentUser: User;
  onLogout: () => void;
  unreadNotificationsCount: number;
  pendingCancellationsCount: number;
  onOpenServerConfig: () => void;
  isOnline: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const DEFAULT_SIDEBAR_BUILDINGS = [
  { id: 'bld-narasunda-01', nameBn: 'নরসুন্দা নার্সিং ডরমেটরী' },
  { id: 'bld-niharika-02', nameBn: 'নিহারিকা আবাসিক ভবন' },
  { id: 'bld-mallika-03', nameBn: 'মল্লিকা আবাসিক ভবন' }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  buildings = [],
  selectedBuildingId = 'bld-narasunda-01',
  onSelectBuilding,
  currentUser,
  onLogout,
  pendingCancellationsCount,
  onOpenServerConfig,
  isOnline,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const [isResidentialExpanded, setIsResidentialExpanded] = useState(true);

  const displayBuildings =
    buildings.length > 0 ? buildings : DEFAULT_SIDEBAR_BUILDINGS;

  const isResidentialSectionActive =
    activeTab === 'residential' ||
    activeTab === 'buildings' ||
    activeTab === 'rooms';

  const isAllocationSectionActive =
    activeTab === 'allocations' ||
    activeTab === 'cancellations' ||
    activeTab === 'residents' ||
    activeTab === 'documents';

  const isUsersSectionActive =
    activeTab === 'users' || activeTab === 'audit';

  const isSettingsSectionActive =
    activeTab === 'settings' || activeTab === 'backup';

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'সুপার অ্যাডমিন';
      case 'ADMIN_OFFICER':
        return 'প্রশাসনিক কর্মকর্তা';
      case 'APPROVING_OFFICER':
        return 'অনুমোদনকারী কর্মকর্তা';
      case 'READ_ONLY':
        return 'পরিদর্শনকারী ইউজার';
      default:
        return role;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-[#0f2d4a] text-white flex flex-col shrink-0 border-r border-[#0a2138] shadow-xl no-print select-none transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-4 py-3.5 border-b border-white/10 bg-[#0b233b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0e7484]/30 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
              <Hospital className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-xs font-bold text-white tracking-wide truncate">
                শহীদ সৈয়দ নজরুল ইসলাম
              </h1>
              <p className="text-[11px] text-teal-300 font-medium truncate">
                মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
              </p>
            </div>
          </div>
        </div>

        {/* Primary Navigation Matching Reference System */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-2">
          {/* ১. ড্যাশবোর্ড */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-[#0e7484] text-white font-semibold shadow-sm'
                : 'text-white/95 hover:bg-white/10'
            }`}
          >
            <LayoutGrid className="w-5 h-5 shrink-0 text-white/90" />
            <span className="truncate leading-normal">ড্যাশবোর্ড</span>
          </button>

          {/* ২. আবাসিক ব্যবস্থাপনা (Expandable Teal Group Container) */}
          <div
            className={`rounded-xl transition-colors ${
              isResidentialExpanded || isResidentialSectionActive
                ? 'bg-[#0e7484] p-2.5 shadow-sm'
                : 'hover:bg-white/10'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsResidentialExpanded(!isResidentialExpanded);
                if (!isResidentialSectionActive) {
                  setActiveTab('residential');
                }
              }}
              aria-expanded={isResidentialExpanded}
              className="w-full flex items-center justify-between px-1.5 py-1.5 rounded-lg text-[15px] font-medium text-white transition-colors"
            >
              <div className="flex items-center gap-3.5 truncate">
                <Building2 className="w-5 h-5 shrink-0 text-white" />
                <span className="truncate leading-normal">আবাসিক ব্যবস্থাপনা</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 shrink-0 text-white/90 transition-transform duration-150 ${
                  isResidentialExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {isResidentialExpanded && (
              <div className="mt-2 pl-4 space-y-1">
                {displayBuildings.map((b) => {
                  const isBuildingSelected =
                    isResidentialSectionActive && selectedBuildingId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        if (onSelectBuilding) {
                          onSelectBuilding(b.id);
                        }
                        setActiveTab('residential');
                      }}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[14px] text-left transition-colors ${
                        isBuildingSelected
                          ? 'bg-white/20 text-white font-semibold'
                          : 'text-white/95 hover:bg-white/10 font-normal'
                      }`}
                    >
                      <Building2 className="w-4 h-4 shrink-0 text-white/90" />
                      <span className="truncate leading-normal">{b.nameBn}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ৩. কক্ষ বরাদ্দ */}
          <button
            type="button"
            onClick={() => setActiveTab('cancellations')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
              isAllocationSectionActive
                ? 'bg-[#0e7484] text-white font-semibold shadow-sm'
                : 'text-white/95 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3.5 truncate">
              <DoorOpen className="w-5 h-5 shrink-0 text-white/90" />
              <span className="truncate leading-normal">কক্ষ বরাদ্দ</span>
            </div>
            {pendingCancellationsCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 leading-none">
                {toBanglaNumber(pendingCancellationsCount)}
              </span>
            )}
          </button>

          {/* ৪. ব্যবহারকারী ব্যবস্থাপনা */}
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
              isUsersSectionActive
                ? 'bg-[#0e7484] text-white font-semibold shadow-sm'
                : 'text-white/95 hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5 shrink-0 text-white/90" />
            <span className="truncate leading-normal">ব্যবহারকারী ব্যবস্থাপনা</span>
          </button>

          {/* ৫. রিপোর্ট */}
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-[#0e7484] text-white font-semibold shadow-sm'
                : 'text-white/95 hover:bg-white/10'
            }`}
          >
            <BarChart2 className="w-5 h-5 shrink-0 text-white/90" />
            <span className="truncate leading-normal">রিপোর্ট</span>
          </button>

          {/* ৬. সিস্টেম সেটিংস */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
              isSettingsSectionActive
                ? 'bg-[#0e7484] text-white font-semibold shadow-sm'
                : 'text-white/95 hover:bg-white/10'
            }`}
          >
            <Settings className="w-5 h-5 shrink-0 text-white/90" />
            <span className="truncate leading-normal">সিস্টেম সেটিংস</span>
          </button>
        </nav>

        {/* Network LAN Status & Server Config Button */}
        <div className="px-3.5 py-2.5 border-t border-white/10 bg-[#0b233b]/70">
          <button
            type="button"
            onClick={onOpenServerConfig}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs transition-colors border border-white/10"
          >
            <div className="flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-teal-300" />
              <span>কেন্দ্রীয় ল্যান সার্ভার</span>
            </div>
            <span className="text-[10px] font-semibold text-teal-300">
              {isOnline ? 'সংযুক্ত' : 'অফলাইন'}
            </span>
          </button>
        </div>

        {/* User Session Footer & Logout */}
        <div className="p-3.5 border-t border-white/10 bg-[#0b233b] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#0e7484] text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser.fullName}
              </div>
              <div className="text-[10px] text-teal-300 truncate">
                {getRoleLabel(currentUser.role)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="লগআউট"
            className="p-2 rounded-lg text-rose-300 hover:text-white hover:bg-rose-600/30 transition-colors shrink-0"
            aria-label="লগআউট"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
