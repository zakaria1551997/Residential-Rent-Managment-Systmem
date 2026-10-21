/**
 * Hospital Residential Allocation & Management System
 * শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
 * Main Application Orchestrator
 */

import React, { useState, useEffect, useMemo } from 'react';
import type {
  Building,
  Room,
  Resident,
  Allocation,
  CancellationRequest,
  DocumentRecord,
  User,
  AuditLog,
  AppNotification,
  AppSettings,
  BackupMetadata,
  SystemStats
} from './types/index.ts';
import { dbService } from './services/db.ts';
import { authService } from './services/auth.ts';
import { networkService } from './services/network.ts';

// Layout Components
import { Sidebar, type ActiveTab } from './components/layout/Sidebar.tsx';
import { TopHeader } from './components/layout/TopHeader.tsx';

// Functional Views (13 Modules + Building Residential Hub)
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { ResidentialManagementView } from './components/buildings/ResidentialManagementView.tsx';
import { BuildingsView } from './components/buildings/BuildingsView.tsx';
import { RoomsView } from './components/rooms/RoomsView.tsx';
import { ResidentsView } from './components/residents/ResidentsView.tsx';
import { AllocationsView } from './components/allocations/AllocationsView.tsx';
import { CancellationsView } from './components/cancellations/CancellationsView.tsx';
import { DocumentsView } from './components/documents/DocumentsView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { UsersView } from './components/users/UsersView.tsx';
import { NotificationsView } from './components/notifications/NotificationsView.tsx';
import { BackupView } from './components/backup/BackupView.tsx';
import { AuditLogsView } from './components/audit/AuditLogsView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { toBanglaNumber } from './logic/rules.ts';

// Modals
import { ServerConnectionModal } from './components/network/ServerConnectionModal.tsx';
import { RoleSwitcherModal } from './components/auth/RoleSwitcherModal.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('bld-narasunda-01');
  const [currentUser, setCurrentUser] = useState<User>(() => authService.getCurrentUser());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // Modals
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Data States
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [cancellations, setCancellations] = useState<CancellationRequest[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => dbService.getSettings());
  const [backupHistory, setBackupHistory] = useState<BackupMetadata[]>([]);
  const [stats, setStats] = useState<SystemStats>(() => dbService.getSystemStats());
  const [networkConfig, setNetworkConfig] = useState(() => networkService.getConfig());

  // Load all live central data
  const loadData = () => {
    setIsRefreshing(true);
    dbService.ensureInitialized();
    setBuildings(dbService.getBuildings());
    setRooms(dbService.getRooms());
    setResidents(dbService.getResidents());
    setAllocations(dbService.getAllocations());
    setCancellations(dbService.getCancellations());
    setDocuments(dbService.getDocuments());
    setUsers(dbService.getUsers());
    setAuditLogs(dbService.getAuditLogs());
    setNotifications(dbService.getNotifications());
    setSettings(dbService.getSettings());
    setBackupHistory(dbService.getBackupHistory());
    setStats(dbService.getSystemStats());
    setNetworkConfig(networkService.getConfig());
    setTimeout(() => setIsRefreshing(false), 200);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getActor = () => ({
    id: currentUser.id,
    name: currentUser.fullName,
    role: currentUser.role
  });

  // Action Handlers
  const handleSaveBuilding = (bld: Partial<Building>) => {
    dbService.saveBuilding(bld, getActor());
    loadData();
  };

  const handleToggleBuildingMaintenance = (id: string) => {
    dbService.toggleBuildingMaintenance(id, getActor());
    loadData();
  };

  const handleSaveRoom = (rm: Partial<Room>) => {
    dbService.saveRoom(rm, getActor());
    loadData();
  };

  const handleToggleRoomMaintenance = (id: string) => {
    dbService.toggleRoomMaintenance(id, getActor());
    loadData();
  };

  const handleSaveResident = (res: Partial<Resident>) => {
    dbService.saveResident(res, getActor());
    loadData();
  };

  const handleCreateAllocation = (data: any) => {
    dbService.createAllocation(data, getActor());
    loadData();
  };

  const handleQuickUpsertRoomAllocation = (payload: any) => {
    dbService.quickUpsertRoomAllocation(payload, getActor());
    loadData();
  };

  const handleSubmitCancellation = (data: any) => {
    dbService.submitCancellationRequest(data, getActor());
    loadData();
  };

  const handleApproveRejectCancellation = (id: string, action: 'APPROVE' | 'REJECT', remarks?: string) => {
    dbService.processCancellationApproval(
      id,
      action,
      { name: currentUser.fullName, designation: currentUser.designation, remarks },
      getActor()
    );
    loadData();
  };

  const handleReleaseRoomNow = (allocationId: string, trackingNumber: string) => {
    dbService.executeAllocationRelease(allocationId, getActor(), trackingNumber);
    loadData();
  };

  const handleUploadDocument = (doc: DocumentRecord) => {
    dbService.saveDocument(doc, getActor());
    loadData();
  };

  const handleDeleteDocument = (id: string) => {
    dbService.deleteDocument(id, getActor());
    loadData();
  };

  const handleSaveUser = (userData: Partial<User>) => {
    dbService.saveUser(userData, getActor());
    loadData();
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    dbService.updateSettings(newSettings, getActor());
    loadData();
  };

  const handleCreateBackup = () => {
    const res = dbService.createSystemBackup(getActor());
    loadData();
    return res;
  };

  const handleRestoreBackup = (jsonString: string) => {
    const res = dbService.restoreFromBackup(jsonString, getActor());
    loadData();
    return res;
  };

  const handleLoadSampleData = () => {
    dbService.loadInstitutionalDemonstrationData(getActor());
    loadData();
  };

  const handleMarkNotificationRead = (id: string) => {
    dbService.markNotificationRead(id);
    loadData();
  };

  const handleMarkAllNotificationsRead = () => {
    dbService.markAllNotificationsRead();
    loadData();
  };

  const handleSelectUserRole = (u: User) => {
    authService.loginDirect(u);
    setCurrentUser(u);
  };

  const handleLogout = () => {
    authService.logout();
    setIsRoleModalOpen(true);
  };

  // Global search filtering if query exists
  const searchQuery = globalSearchTerm.trim().toLowerCase();
  const isGlobalSearching = searchQuery.length > 0;

  const globalSearchResults = useMemo(() => {
    if (!isGlobalSearching) return null;
    const matchedResidents = residents.filter(
      r =>
        r.fullName.toLowerCase().includes(searchQuery) ||
        r.residentIdNumber.toLowerCase().includes(searchQuery) ||
        (r.employeeId || '').toLowerCase().includes(searchQuery) ||
        r.mobileNumber.includes(searchQuery) ||
        r.department.toLowerCase().includes(searchQuery)
    );
    const matchedRooms = rooms.filter(
      rm =>
        rm.roomNumber.toLowerCase().includes(searchQuery) ||
        (rm.buildingNameBn || '').toLowerCase().includes(searchQuery)
    );
    const matchedAllocations = allocations.filter(
      al =>
        al.officialOrderNo.toLowerCase().includes(searchQuery) ||
        al.allocationNumber.toLowerCase().includes(searchQuery) ||
        (al.residentName || '').toLowerCase().includes(searchQuery) ||
        (al.roomNumber || '').toLowerCase().includes(searchQuery)
    );
    const matchedCancellations = cancellations.filter(
      cn =>
        cn.trackingNumber.toLowerCase().includes(searchQuery) ||
        cn.cancellationOrderNo.toLowerCase().includes(searchQuery) ||
        cn.residentName.toLowerCase().includes(searchQuery) ||
        cn.roomNumber.toLowerCase().includes(searchQuery)
    );
    return {
      residents: matchedResidents,
      rooms: matchedRooms,
      allocations: matchedAllocations,
      cancellations: matchedCancellations,
      total:
        matchedResidents.length +
        matchedRooms.length +
        matchedAllocations.length +
        matchedCancellations.length
    };
  }, [isGlobalSearching, searchQuery, residents, rooms, allocations, cancellations]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const pendingCancellationsCount = cancellations.filter(c => c.status === 'PENDING_APPROVAL').length;
  const hasNoData = rooms.length === 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800 print:h-auto print:w-auto print:overflow-visible print:block print:bg-white">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        buildings={buildings}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={(bId) => {
          setSelectedBuildingId(bId);
          setIsMobileSidebarOpen(false);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadNotificationsCount={unreadNotificationsCount}
        pendingCancellationsCount={pendingCancellationsCount}
        onOpenServerConfig={() => setIsServerModalOpen(true)}
        isOnline={networkConfig.isOnline}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* 2. Top Header with Global Search and LAN Monitor */}
        <TopHeader
          settings={settings}
          currentUser={currentUser}
          onOpenNotifications={() => setActiveTab('notifications')}
          unreadCount={unreadNotificationsCount}
          onOpenServerConfig={() => setIsServerModalOpen(true)}
          isOnline={networkConfig.isOnline}
          onGlobalSearch={setGlobalSearchTerm}
          searchTerm={globalSearchTerm}
          onRefreshData={loadData}
          isRefreshing={isRefreshing}
          onSwitchUserRole={() => setIsRoleModalOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* 3. Main Content Container */}
        <main className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible print:h-auto">
          <div className="max-w-7xl mx-auto pb-12 print:max-w-none print:pb-0">
            {/* Global Search Instant Results Overlay */}
            {isGlobalSearching && globalSearchResults && (
              <div className="mb-6 bg-white rounded-xl border-2 border-teal-600 shadow-md p-5 space-y-4 no-print">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      কেন্দ্রীয় অনুসন্ধান ফলাফল: &ldquo;{globalSearchTerm}&rdquo;
                    </h3>
                    <p className="text-xs text-slate-500">
                      মোট ফলাফল পাওয়া গেছে: {globalSearchResults.total} টি
                    </p>
                  </div>
                  <button
                    onClick={() => setGlobalSearchTerm('')}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                  >
                    অনুসন্ধান বন্ধ করুন ✕
                  </button>
                </div>

                {globalSearchResults.total === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    এই অনুসন্ধান শব্দে কোনো বাসিন্দা, কক্ষ, বরাদ্দ বা বাতিল আদেশ পাওয়া যায়নি।
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    {/* Matched Residents */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                        <span>বাসিন্দা প্রোফাইল ({globalSearchResults.residents.length})</span>
                        <button
                          onClick={() => {
                            setActiveTab('residents');
                            setGlobalSearchTerm('');
                          }}
                          className="text-teal-700 hover:underline text-[11px]"
                        >
                          সকল দেখুন →
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {globalSearchResults.residents.map(r => (
                          <div
                            key={r.id}
                            onClick={() => {
                              setActiveTab('residents');
                              setGlobalSearchTerm('');
                            }}
                            className="p-2 bg-white rounded border border-slate-200 hover:border-teal-500 cursor-pointer"
                          >
                            <p className="font-bold text-slate-900">{r.fullName}</p>
                            <p className="text-[11px] text-slate-500">{r.designation} • {r.mobileNumber}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Matched Rooms */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                        <span>কক্ষ তালিকা ({globalSearchResults.rooms.length})</span>
                        <button
                          onClick={() => {
                            setActiveTab('rooms');
                            setGlobalSearchTerm('');
                          }}
                          className="text-teal-700 hover:underline text-[11px]"
                        >
                          সকল দেখুন →
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {globalSearchResults.rooms.map(rm => (
                          <div
                            key={rm.id}
                            onClick={() => {
                              setActiveTab('rooms');
                              setGlobalSearchTerm('');
                            }}
                            className="p-2 bg-white rounded border border-slate-200 hover:border-teal-500 cursor-pointer"
                          >
                            <p className="font-bold text-slate-900">কক্ষ নং: {rm.roomNumber}</p>
                            <p className="text-[11px] text-slate-500">{rm.buildingNameBn}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Matched Allocations */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                        <span>বরাদ্দ আদেশ ({globalSearchResults.allocations.length})</span>
                        <button
                          onClick={() => {
                            setActiveTab('allocations');
                            setGlobalSearchTerm('');
                          }}
                          className="text-teal-700 hover:underline text-[11px]"
                        >
                          সকল দেখুন →
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {globalSearchResults.allocations.map(al => (
                          <div
                            key={al.id}
                            onClick={() => {
                              setActiveTab('allocations');
                              setGlobalSearchTerm('');
                            }}
                            className="p-2 bg-white rounded border border-slate-200 hover:border-teal-500 cursor-pointer"
                          >
                            <p className="font-bold text-slate-900">{al.residentName} (কক্ষ: {al.roomNumber})</p>
                            <p className="text-[11px] text-slate-500">স্মারক: {al.officialOrderNo}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Matched Cancellations */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                        <span>বরাদ্দ বাতিল ({globalSearchResults.cancellations.length})</span>
                        <button
                          onClick={() => {
                            setActiveTab('cancellations');
                            setGlobalSearchTerm('');
                          }}
                          className="text-teal-700 hover:underline text-[11px]"
                        >
                          সকল দেখুন →
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {globalSearchResults.cancellations.map(cn => (
                          <div
                            key={cn.id}
                            onClick={() => {
                              setActiveTab('cancellations');
                              setGlobalSearchTerm('');
                            }}
                            className="p-2 bg-white rounded border border-slate-200 hover:border-teal-500 cursor-pointer"
                          >
                            <p className="font-bold text-slate-900">{cn.residentName} (কক্ষ: {cn.roomNumber})</p>
                            <p className="text-[11px] text-slate-500">ট্র্যাকিং: {cn.trackingNumber}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Switching */}
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                buildings={buildings}
                rooms={rooms}
                pendingCancellations={cancellations.filter(c => c.status === 'PENDING_APPROVAL')}
                recentLogs={auditLogs}
                onNavigate={setActiveTab}
                onSelectBuilding={(bId) => {
                  setSelectedBuildingId(bId);
                  setActiveTab('residential');
                }}
                onOpenNewAllocation={() => setActiveTab('residential')}
                onOpenNewResident={() => setActiveTab('residents')}
                onOpenNewCancellation={() => setActiveTab('cancellations')}
                onLoadSampleData={handleLoadSampleData}
                hasNoData={hasNoData}
              />
            )}

            {(activeTab === 'residential' || activeTab === 'buildings' || activeTab === 'rooms') && (
              <ResidentialManagementView
                buildings={buildings}
                rooms={rooms}
                residents={residents}
                allocations={allocations}
                cancellations={cancellations}
                selectedBuildingId={selectedBuildingId}
                onSelectBuilding={setSelectedBuildingId}
                onSaveBuilding={handleSaveBuilding}
                onToggleBuildingMaintenance={handleToggleBuildingMaintenance}
                onSaveRoom={handleSaveRoom}
                onToggleRoomMaintenance={handleToggleRoomMaintenance}
                onCreateAllocation={handleCreateAllocation}
                onQuickUpsertRoomAllocation={handleQuickUpsertRoomAllocation}
                onReleaseRoomNow={handleReleaseRoomNow}
                onNavigateToAllocations={() => setActiveTab('cancellations')}
                onNavigateToCancellations={() => setActiveTab('cancellations')}
                onNavigateToResidents={() => setActiveTab('residents')}
                canManageBuildings={authService.canManageBuildings()}
                canManageRooms={authService.canManageRooms()}
                canCreateAllocations={authService.canCreateAllocations()}
              />
            )}

            {/* কক্ষ বরাদ্দ Hub (Cancellations, Residents, Documents — কক্ষ বরাদ্দ তালিকা (৬৮) removed per user request) */}
            {(activeTab === 'allocations' ||
              activeTab === 'cancellations' ||
              activeTab === 'residents' ||
              activeTab === 'documents') && (
              <div className="space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-1.5 text-xs no-print">
                  <button
                    onClick={() => setActiveTab('cancellations')}
                    className={`px-3.5 py-2 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'cancellations' || activeTab === 'allocations'
                        ? 'bg-[#0e7484] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>বরাদ্দ বাতিল ও অব্যাহতি</span>
                    {pendingCancellationsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold leading-none">
                        {toBanglaNumber(pendingCancellationsCount)}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('residents')}
                    className={`px-3.5 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      activeTab === 'residents'
                        ? 'bg-[#0e7484] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    বাসিন্দা নিবন্ধন ও প্রোফাইল ({toBanglaNumber(residents.length)})
                  </button>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`px-3.5 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      activeTab === 'documents'
                        ? 'bg-[#0e7484] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    দাপ্তরিক নথিপত্র সংরক্ষণ ({toBanglaNumber(documents.length)})
                  </button>
                </div>

                {(activeTab === 'cancellations' || activeTab === 'allocations') && (
                  <CancellationsView
                    cancellations={cancellations}
                    allocations={allocations}
                    currentUser={currentUser}
                    onSubmitRequest={handleSubmitCancellation}
                    onApproveReject={handleApproveRejectCancellation}
                    onReleaseRoomNow={handleReleaseRoomNow}
                    canRequest={authService.canRequestCancellation()}
                    canApprove={authService.canApproveCancellation()}
                    onOpenDocumentModal={() => setActiveTab('documents')}
                  />
                )}

                {activeTab === 'residents' && (
                  <ResidentsView
                    residents={residents}
                    allocations={allocations}
                    onSaveResident={handleSaveResident}
                    canManage={authService.canManageResidents()}
                  />
                )}

                {activeTab === 'documents' && (
                  <DocumentsView
                    documents={documents}
                    currentUser={currentUser}
                    onUploadDocument={handleUploadDocument}
                    onDeleteDocument={handleDeleteDocument}
                    canManage={authService.canCreateAllocations()}
                  />
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <ReportsView
                buildings={buildings}
                rooms={rooms}
                residents={residents}
                allocations={allocations}
                cancellations={cancellations}
                auditLogs={auditLogs}
                settings={settings}
              />
            )}

            {/* ব্যবহারকারী ব্যবস্থাপনা Hub (Users & Audit Logs) */}
            {(activeTab === 'users' || activeTab === 'audit') && (
              <div className="space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-1.5 text-xs no-print">
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`px-3.5 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      activeTab === 'users'
                        ? 'bg-[#0e7484] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ব্যবহারকারী ও রোল ব্যবস্থাপনা ({toBanglaNumber(users.length)})
                  </button>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-3.5 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      activeTab === 'audit'
                        ? 'bg-[#0e7484] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    অডিট লগ ও কার্যবিবরণী ({toBanglaNumber(auditLogs.length)})
                  </button>
                </div>

                {activeTab === 'users' && (
                  <UsersView
                    users={users}
                    currentUser={currentUser}
                    onSaveUser={handleSaveUser}
                    canManage={authService.canManageUsers()}
                    onSwitchUser={handleSelectUserRole}
                  />
                )}

                {activeTab === 'audit' && <AuditLogsView auditLogs={auditLogs} />}
              </div>
            )}

            {activeTab === 'notifications' && (
              <NotificationsView
                notifications={notifications}
                onMarkRead={handleMarkNotificationRead}
                onMarkAllRead={handleMarkAllNotificationsRead}
              />
            )}

            {/* সিস্টেম সেটিংস Hub (Settings & Backup/Restore) */}
            {(activeTab === 'settings' || activeTab === 'backup') && (
              <div className="space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-1.5 text-xs no-print">
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-3.5 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      activeTab === 'settings'
                        ? 'bg-[#0e7484] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    প্রতিষ্ঠান ও সিস্টেম সেটিংস
                  </button>
                  <button
                    onClick={() => setActiveTab('backup')}
                    className={`px-3.5 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      activeTab === 'backup'
                        ? 'bg-[#0e7484] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ডাটাবেস ব্যাকআপ ও রিস্টোর
                  </button>
                  <button
                    onClick={() => setIsServerModalOpen(true)}
                    className="px-3.5 py-2 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                  >
                    কেন্দ্রীয় সার্ভার ও ল্যান সংযোগ
                  </button>
                </div>

                {activeTab === 'settings' && (
                  <SettingsView
                    settings={settings}
                    onUpdateSettings={handleUpdateSettings}
                    canManage={authService.canEditSettings()}
                  />
                )}

                {activeTab === 'backup' && (
                  <BackupView
                    backupHistory={backupHistory}
                    onCreateBackup={handleCreateBackup}
                    onRestoreBackup={handleRestoreBackup}
                    canManage={authService.canBackupRestore()}
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Central LAN Server Connection Modal */}
      <ServerConnectionModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onConfigUpdated={() => {
          setNetworkConfig(networkService.getConfig());
          loadData();
        }}
      />

      {/* RBAC Role Switcher & Login Modal */}
      <RoleSwitcherModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentUser={currentUser}
        users={users}
        onSelectUser={handleSelectUserRole}
      />
    </div>
  );
}
