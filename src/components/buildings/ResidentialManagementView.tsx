import React, { useState, useRef } from 'react';
import {
  Building2,
  DoorOpen,
  Plus,
  Edit,
  Wrench,
  Layers,
  MapPin,
  KeyRound,
  FileX2,
  Search,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Printer,
  Grid,
  Table2,
  FileSpreadsheet,
  Phone,
  Calendar,
  UserCheck,
  Download,
  Loader2,
  Image as ImageIcon,
  X
} from 'lucide-react';
import type {
  Building,
  Room,
  Resident,
  Allocation,
  CancellationRequest,
  RoomCategory,
  RoomOccupancyStatus
} from '../../types/index.ts';
import {
  toBanglaNumber,
  formatBanglaDate,
  formatBanglaSlashDate,
  formatBanglaPhone,
  getRoomSeatTypeLabel,
  groupRoomsByFloorDescending,
  isExcludedNarasundaRoom,
  shouldShowRoomTypeField,
  NARASUNDA_ROOM_TYPE_OPTIONS,
  normalizeNarasundaRoomType
} from '../../logic/rules.ts';
import {
  exportElementToPdf,
  exportElementToPng,
  triggerElementPrint
} from '../../utils/printPdf.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';
import { BuildingsView } from './BuildingsView.tsx';

interface ResidentialManagementViewProps {
  buildings: Building[];
  rooms: Room[];
  residents: Resident[];
  allocations: Allocation[];
  cancellations: CancellationRequest[];
  selectedBuildingId: string;
  onSelectBuilding: (buildingId: string) => void;
  onSaveBuilding: (building: Partial<Building>) => void;
  onToggleBuildingMaintenance: (buildingId: string) => void;
  onSaveRoom: (room: Partial<Room>) => void;
  onToggleRoomMaintenance: (roomId: string) => void;
  onCreateAllocation: (data: any) => void;
  onQuickUpsertRoomAllocation?: (payload: any) => void;
  onReleaseRoomNow?: (allocationId: string, trackingNumber: string) => void;
  onNavigateToAllocations: () => void;
  onNavigateToCancellations: () => void;
  onNavigateToResidents: () => void;
  canManageBuildings: boolean;
  canManageRooms: boolean;
  canCreateAllocations: boolean;
}

type SubTab =
  | 'smart_matrix'
  | 'sample_sheet'
  | 'rooms_table'
  | 'building_residents'
  | 'all_buildings';

export const ResidentialManagementView: React.FC<ResidentialManagementViewProps> = ({
  buildings,
  rooms,
  residents,
  allocations,
  selectedBuildingId,
  onSelectBuilding,
  onSaveBuilding,
  onToggleBuildingMaintenance,
  onSaveRoom,
  onToggleRoomMaintenance,
  onCreateAllocation,
  onQuickUpsertRoomAllocation,
  onReleaseRoomNow,
  onNavigateToAllocations,
  onNavigateToCancellations,
  onNavigateToResidents,
  canManageBuildings,
  canManageRooms,
  canCreateAllocations
}) => {
  const [subTab, setSubTab] = useState<SubTab>('smart_matrix');
  const [floorFilter, setFloorFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [digitMode, setDigitMode] = useState<'bn' | 'en'>('bn');

  // Room Add/Edit Modal State
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Room> | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Unified 1-Step Room Cell Allocation & Edit Modal State
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [allocRoom, setAllocRoom] = useState<Room | null>(null);
  const [editingAllocationId, setEditingAllocationId] = useState<string | undefined>(undefined);
  const [entryMode, setEntryMode] = useState<'DIRECT_ENTRY' | 'SELECT_RESIDENT'>('DIRECT_ENTRY');
  const [allocResidentId, setAllocResidentId] = useState('');
  const [directResidentName, setDirectResidentName] = useState('');
  const [directDesignation, setDirectDesignation] = useState('সিনিয়র স্টাফ নার্স');
  const [directDepartment, setDirectDepartment] = useState('নার্সিং সেবা বিভাগ');
  const [directMobile, setDirectMobile] = useState('01711-112233');
  const [directSeatType, setDirectSeatType] = useState('একক রুম');
  const [allocOrderNo, setAllocOrderNo] = useState('');
  const [allocStartDate, setAllocStartDate] = useState('2026-10-01');
  const [allocRent, setAllocRent] = useState<number>(1500);
  const [allocError, setAllocError] = useState<string | null>(null);

  // Print & PDF Export Studio State
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  const [printScope, setPrintScope] = useState<'SINGLE_BUILDING' | 'ALL_BUILDINGS'>('SINGLE_BUILDING');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showOfficialHeaderInPrint, setShowOfficialHeaderInPrint] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusBanner, setExportStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const printStudioSheetRef = useRef<HTMLDivElement>(null);
  const offscreenSheetRef = useRef<HTMLDivElement>(null);

  const activeBuilding =
    buildings.find((b) => b.id === selectedBuildingId) || buildings[0];

  const isNarasundaDorm =
    activeBuilding?.code === 'NND-01' || activeBuilding?.id === 'bld-narasunda-01';

  const buildingRooms = rooms.filter((r) => {
    if (activeBuilding && r.buildingId !== activeBuilding.id) return false;
    if (isExcludedNarasundaRoom(r.buildingId, r.roomNumber, r.floor)) return false;
    return true;
  });

  const activeAllocationsInBuilding = allocations.filter(
    (a) =>
      a.buildingId === activeBuilding?.id &&
      a.status === 'ACTIVE' &&
      !isExcludedNarasundaRoom(a.buildingId, a.roomNumber)
  );

  const categoryLabels: Record<RoomCategory, string> = {
    SINGLE_ROOM: 'একক রুম',
    SHARED_ROOM: 'একক সিট',
    OFFICER_QUARTER: 'কর্মকর্তা কোয়ার্টার (ফ্ল্যাট)',
    DOCTOR_SUITE: 'চিকিৎসক স্যুট',
    FAMILY_FLAT: 'পারিবারিক ফ্ল্যাট'
  };

  // Filtered rooms for current building
  const filteredRooms = buildingRooms.filter((r) => {
    if (floorFilter !== 'ALL' && r.floor !== floorFilter) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const roomOccupants = activeAllocationsInBuilding.filter((a) => a.roomId === r.id);
      const matchOccupant = roomOccupants.some(
        (a) =>
          (a.residentName || '').toLowerCase().includes(q) ||
          (a.residentDesignation || '').toLowerCase().includes(q) ||
          (a.residentPhone || '').toLowerCase().includes(q)
      );
      const matchRoomNo = r.roomNumber.toLowerCase().includes(q);
      if (!matchRoomNo && !matchOccupant) return false;
    }
    return true;
  });

  // Distinct floors in descending order (6th floor top -> 1st floor bottom, matching architectural chart)
  const floorsDescending = Array.from(
    new Set(buildingRooms.map((r) => r.floor))
  ).sort((a, b) => b - a);

  const groupedFloorMatrix = groupRoomsByFloorDescending(filteredRooms);

  // Stats for active building
  const totalRoomsCount = buildingRooms.length;
  const vacantRoomsCount = buildingRooms.filter((r) => r.status === 'VACANT').length;
  const occupiedRoomsCount = buildingRooms.filter(
    (r) => r.status === 'OCCUPIED' || r.status === 'PARTIAL'
  ).length;
  const maintenanceRoomsCount = buildingRooms.filter(
    (r) => r.status === 'MAINTENANCE'
  ).length;
  const totalCapacity = buildingRooms.reduce((sum, r) => sum + r.capacity, 0);
  const currentOccupantsCount = activeAllocationsInBuilding.length;
  const occupancyRate =
    totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;

  const getFloorTitleBn = (floor: number) => {
    const map: Record<number, string> = {
      6: '৬ষ্ঠ তলা (6th Floor)',
      5: '৫ম তলা (5th Floor)',
      4: '৪র্থ তলা (4th Floor)',
      3: '৩য় তলা (3rd Floor)',
      2: '২য় তলা (2nd Floor)',
      1: '১ম তলা (1st Floor)'
    };
    return map[floor] || `${toBanglaNumber(floor)} তলা`;
  };

  const handleOpenAddRoom = () => {
    setRoomError(null);
    setEditingRoom({
      buildingId: activeBuilding?.id || buildings[0]?.id || '',
      floor: 6,
      roomNumber: isNarasundaDorm ? '607' : '6-E',
      category: isNarasundaDorm ? 'SINGLE_ROOM' : 'OFFICER_QUARTER',
      seatTypeLabel: isNarasundaDorm ? 'একক রুম' : '',
      capacity: 1,
      monthlyRent: 0,
      remarks: ''
    });
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: Room) => {
    setRoomError(null);
    setEditingRoom({
      ...room,
      seatTypeLabel: shouldShowRoomTypeField(room.buildingId)
        ? normalizeNarasundaRoomType(room.seatTypeLabel)
        : ''
    });
    setIsRoomModalOpen(true);
  };

  const handleSaveRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError(null);
    if (!editingRoom?.buildingId || !editingRoom?.roomNumber) {
      setRoomError('ভবন এবং কক্ষ/ইউনিট নম্বর প্রদান করা আবশ্যক।');
      return;
    }
    try {
      onSaveRoom(editingRoom);
      setIsRoomModalOpen(false);
    } catch (err: any) {
      setRoomError(err.message || 'কক্ষ সংরক্ষণ ব্যর্থ হয়েছে।');
    }
  };

  // Opens the 1-Step Cell Editor / Quick Allocation Modal for any room cell (Vacant or Occupied)
  const handleOpenCellAllocationModal = (room: Room, existingAlloc?: Allocation) => {
    setAllocError(null);
    setAllocRoom(room);
    const isDormRoom = shouldShowRoomTypeField(room.buildingId);

    if (existingAlloc) {
      const linkedResident = residents.find((r) => r.id === existingAlloc.residentId);
      setEditingAllocationId(existingAlloc.id);
      setEntryMode('DIRECT_ENTRY');
      setAllocResidentId(existingAlloc.residentId);
      setDirectResidentName(existingAlloc.residentName || linkedResident?.fullName || '');
      setDirectDesignation(
        existingAlloc.residentDesignation || linkedResident?.designation || 'সিনিয়র স্টাফ নার্স'
      );
      setDirectDepartment(linkedResident?.department || 'নার্সিং সেবা বিভাগ');
      setDirectMobile(
        existingAlloc.residentPhone || linkedResident?.mobileNumber || '01711-112233'
      );
      setDirectSeatType(
        isDormRoom
          ? normalizeNarasundaRoomType(existingAlloc.seatTypeLabel || room.seatTypeLabel)
          : ''
      );
      setAllocOrderNo(existingAlloc.officialOrderNo);
      setAllocStartDate(existingAlloc.startDate || '2026-10-01');
      setAllocRent(existingAlloc.monthlyRent || room.monthlyRent || 0);
    } else {
      setEditingAllocationId(undefined);
      setEntryMode('DIRECT_ENTRY');
      const eligibleResident = residents.find(
        (res) => !allocations.some((a) => a.residentId === res.id && a.status === 'ACTIVE')
      );
      setAllocResidentId(eligibleResident?.id || '');
      setDirectResidentName('');
      setDirectDesignation(
        isDormRoom
          ? 'সিনিয়র স্টাফ নার্স'
          : activeBuilding?.code === 'NRB-02'
          ? 'মেডিকেল অফিসার'
          : 'ওয়ার্ড মাস্টার'
      );
      setDirectDepartment(
        isDormRoom
          ? 'নার্সিং সেবা বিভাগ'
          : activeBuilding?.code === 'NRB-02'
          ? 'চিকিৎসা বিভাগ'
          : 'প্রশাসন শাখা'
      );
      setDirectMobile('01711-112233');
      setDirectSeatType(
        isDormRoom ? normalizeNarasundaRoomType(room.seatTypeLabel) : ''
      );
      const currentYear = new Date().getFullYear();
      setAllocOrderNo(
        `স্মারক নং-স্বা/শৈসনইমেকহা/${toBanglaNumber(currentYear)}/${toBanglaNumber(
          allocations.length + 101
        )}`
      );
      setAllocStartDate('2026-10-01');
      setAllocRent(room.monthlyRent || 0);
    }

    setIsAllocModalOpen(true);
  };

  const handleCellAllocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAllocError(null);
    if (!allocRoom) return;

    try {
      if (onQuickUpsertRoomAllocation) {
        onQuickUpsertRoomAllocation({
          roomId: allocRoom.id,
          existingAllocationId: editingAllocationId,
          mode: entryMode,
          residentId: allocResidentId,
          residentName: directResidentName,
          designation: directDesignation,
          department: directDepartment,
          mobileNumber: directMobile,
          seatTypeLabel: directSeatType,
          startDate: allocStartDate,
          officialOrderNo: allocOrderNo,
          monthlyRent: Number(allocRent)
        });
      } else {
        onCreateAllocation({
          residentId: allocResidentId,
          buildingId: allocRoom.buildingId,
          roomId: allocRoom.id,
          officialOrderNo: allocOrderNo,
          orderDate: allocStartDate,
          startDate: allocStartDate,
          monthlyRent: Number(allocRent),
          remarks: directSeatType
        });
      }
      setIsAllocModalOpen(false);
    } catch (err: any) {
      setAllocError(err.message || 'কক্ষ বরাদ্দ সংরক্ষণ ব্যর্থ হয়েছে।');
    }
  };

  const handleVacateFromModal = () => {
    if (!editingAllocationId || !onReleaseRoomNow) return;
    onReleaseRoomNow(editingAllocationId, `DIRECT-RELEASE-${allocRoom?.roomNumber || ''}`);
    setIsAllocModalOpen(false);
  };

  const handleOpenPrintStudio = () => {
    setExportStatusBanner(null);
    setPrintScope('SINGLE_BUILDING');
    setIsPrintStudioOpen(true);
  };

  const handleDirectPdfDownload = async () => {
    const targetEl = printStudioSheetRef.current || offscreenSheetRef.current;
    if (!targetEl || !activeBuilding) return;
    setIsExporting(true);
    setExportStatusBanner(null);
    const res = await exportElementToPdf(targetEl, {
      titleBn: activeBuilding.nameBn,
      suffix: 'ভবন_চার্ট',
      orientation: printOrientation,
      fitSinglePage: true
    });
    setIsExporting(false);
    if (res.success) {
      setExportStatusBanner({
        type: 'success',
        message: `পিডিএফ সফলভাবে সংরক্ষণ হয়েছে: ${res.filename}`
      });
    } else {
      setExportStatusBanner({
        type: 'error',
        message: res.error || 'পিডিএফ সংরক্ষণে ত্রুটি হয়েছে।'
      });
    }
  };

  const handleStudioPdfDownload = async () => {
    const targetEl = printStudioSheetRef.current || offscreenSheetRef.current;
    if (!targetEl) return;
    setIsExporting(true);
    setExportStatusBanner(null);
    const titleBn =
      printScope === 'ALL_BUILDINGS'
        ? 'সকল_আবাসিক_ভবন_ও_ডরমেটরী'
        : activeBuilding?.nameBn || 'আবাসিক_ভবন';
    const res = await exportElementToPdf(targetEl, {
      titleBn,
      suffix: 'ভবন_চার্ট',
      orientation: printOrientation,
      fitSinglePage: printScope === 'SINGLE_BUILDING'
    });
    setIsExporting(false);
    if (res.success) {
      setExportStatusBanner({
        type: 'success',
        message: `পিডিএফ ফাইল সফলভাবে ডাউনলোড হয়েছে: ${res.filename}`
      });
    } else {
      setExportStatusBanner({
        type: 'error',
        message: res.error || 'পিডিএফ তৈরিতে ত্রুটি হয়েছে।'
      });
    }
  };

  const handleStudioPngDownload = async () => {
    const targetEl = printStudioSheetRef.current || offscreenSheetRef.current;
    if (!targetEl) return;
    setIsExporting(true);
    setExportStatusBanner(null);
    const titleBn =
      printScope === 'ALL_BUILDINGS'
        ? 'সকল_আবাসিক_ভবন_ও_ডরমেটরী'
        : activeBuilding?.nameBn || 'আবাসিক_ভবন';
    const res = await exportElementToPng(targetEl, titleBn, 'স্যাম্পল_শিট');
    setIsExporting(false);
    if (res.success) {
      setExportStatusBanner({
        type: 'success',
        message: `ইমেজ (PNG) শিট সফলভাবে ডাউনলোড হয়েছে: ${res.filename}`
      });
    } else {
      setExportStatusBanner({
        type: 'error',
        message: res.error || 'ইমেজ ডাউনলোডে ত্রুটি হয়েছে।'
      });
    }
  };

  const handleStudioPrintDialog = async () => {
    const targetEl = printStudioSheetRef.current || offscreenSheetRef.current;
    if (!targetEl) return;
    setIsExporting(true);
    const titleBn =
      printScope === 'ALL_BUILDINGS'
        ? 'সকল আবাসিক ভবন ও ডরমেটরী চার্ট'
        : activeBuilding?.nameBn || 'আবাসিক ভবন চার্ট';
    await triggerElementPrint(targetEl, {
      titleBn,
      suffix: 'ভবন_চার্ট',
      orientation: printOrientation,
      fitSinglePage: printScope === 'SINGLE_BUILDING'
    });
    setIsExporting(false);
    setExportStatusBanner({
      type: 'success',
      message: 'প্রিন্ট ডায়ালগ পাঠানো হয়েছে। প্রিন্টার না থাকলে "পিডিএফ সংরক্ষণ (.pdf)" বাটনে ক্লিক করে সরাসরি ডাউনলোড করুন।'
    });
  };

  const getStatusBadge = (status: RoomOccupancyStatus) => {
    switch (status) {
      case 'VACANT':
        return <Badge variant="success" size="sm">ফাঁকা (বরাদ্দযোগ্য)</Badge>;
      case 'PARTIAL':
        return <Badge variant="info" size="sm">আংশিক বরাদ্দ</Badge>;
      case 'OCCUPIED':
        return <Badge variant="primary" size="sm">বরাদ্দকৃত</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="warning" size="sm">মেরামতাধীন</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Status feedback banner when a PDF/PNG is downloaded directly */}
      {exportStatusBanner && !isPrintStudioOpen && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 no-print ${
            exportStatusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportStatusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportStatusBanner(null)}
            aria-label="বার্তা বন্ধ করুন"
            className="text-xs p-1 rounded hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. THREE SUB-CATEGORY BUILDING CARDS (নরসুন্দা নার্সিং ডরমেটরী, নিহারিকা আবাসিক ভবন, মল্লিকা আবাসিক ভবন) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        {buildings.map((b) => {
          const isSelected = activeBuilding?.id === b.id && subTab !== 'all_buildings';
          const bRooms = rooms.filter(
            (r) => r.buildingId === b.id && !isExcludedNarasundaRoom(r.buildingId, r.roomNumber, r.floor)
          );
          const bOccupied = bRooms.filter(
            (r) => r.status === 'OCCUPIED' || r.status === 'PARTIAL'
          ).length;
          const bVacant = bRooms.filter((r) => r.status === 'VACANT').length;
          const bPercent = bRooms.length > 0 ? Math.round((bOccupied / bRooms.length) * 100) : 0;
          const isDorm = b.code === 'NND-01' || b.id === 'bld-narasunda-01';

          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onSelectBuilding(b.id);
                if (subTab === 'all_buildings') setSubTab('smart_matrix');
              }}
              className={`text-left rounded-xl p-4 border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#0f2d4a] text-white border-[#0e7484] shadow-md ring-2 ring-[#0e7484]/40'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-teal-600/60 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#0e7484] text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="font-mono">{b.code}</span>
                    <span>•</span>
                    <span>{isDorm ? '৬ কলাম ডরমেটরী চার্ট' : '৪ কলাম ইউনিট চার্ট (A-D)'}</span>
                  </span>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      isSelected ? 'text-teal-300' : 'text-[#0e7484]'
                    }`}
                  >
                    {toBanglaNumber(bPercent)}% পূর্ণ
                  </span>
                </div>

                <h3
                  className={`text-base font-bold mt-2 flex items-center gap-2 ${
                    isSelected ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  <Building2
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-teal-300' : 'text-[#0e7484]'
                    }`}
                  />
                  <span>{b.nameBn}</span>
                </h3>

                <p
                  className={`text-xs mt-1 line-clamp-1 ${
                    isSelected ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {isDorm
                    ? 'তলা ২–৬ • প্রতি তলায় ৬টি কক্ষ (২০১–৬০৬)'
                    : b.code === 'NRB-02'
                    ? 'তলা ২–৬ • প্রতি তলায় ৪টি ইউনিট (2-A হতে 6-D)'
                    : 'তলা ১–৬ • প্রতি তলায় ৪টি ইউনিট (1-A হতে 6-D)'}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-between text-xs tabular-nums">
                <span>
                  মোট: <strong>{toBanglaNumber(bRooms.length)}</strong> টি
                </span>
                <span className={isSelected ? 'text-sky-300' : 'text-blue-700'}>
                  বরাদ্দ: <strong>{toBanglaNumber(bOccupied)}</strong>
                </span>
                <span className={isSelected ? 'text-emerald-300' : 'text-emerald-700'}>
                  ফাঁকা: <strong>{toBanglaNumber(bVacant)}</strong>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. VIEW MODE SWITCHER & ACTION TOOLBAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setSubTab('smart_matrix')}
            className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              subTab === 'smart_matrix'
                ? 'bg-[#0e7484] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>ভিজ্যুয়াল ভবন চার্ট (স্মার্ট গ্রিড)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('sample_sheet')}
            className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              subTab === 'sample_sheet'
                ? 'bg-[#0e7484] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>দাপ্তরিক স্যাম্পল শিট (প্রিন্ট ভিউ)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('rooms_table')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              subTab === 'rooms_table'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>কক্ষ রেজিস্টার ({toBanglaNumber(totalRoomsCount)})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('building_residents')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap ${
              subTab === 'building_residents'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ভবনের বাসিন্দা ({toBanglaNumber(currentOccupantsCount)})
          </button>

          <button
            type="button"
            onClick={() => setSubTab('all_buildings')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap ${
              subTab === 'all_buildings'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ভবন সেটআপ
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Number Format Switcher (Bangla vs English digits) */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setDigitMode('bn')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                digitMode === 'bn'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="বাংলা সংখ্যায় তারিখ ও মোবাইল নম্বর দেখুন"
            >
              বাংলা সংখ্যা (০১/১০)
            </button>
            <button
              type="button"
              onClick={() => setDigitMode('en')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors font-mono ${
                digitMode === 'en'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ইংরেজি সংখ্যায় তারিখ ও মোবাইল নম্বর দেখুন"
            >
              ENG (01/10)
            </button>
          </div>

          {canManageRooms && (
            <button
              type="button"
              onClick={handleOpenAddRoom}
              className="px-3 py-1.5 bg-[#0e7484] hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন কক্ষ/ইউনিট যুক্ত করুন</span>
            </button>
          )}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDirectPdfDownload}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>সরাসরি PDF ডাউনলোড</span>
          </button>
          <button
            type="button"
            onClick={handleOpenPrintStudio}
            className="px-3 py-1.5 bg-[#0f2d4a] hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট / পিডিএফ সংরক্ষণ</span>
          </button>
        </div>
      </div>

      {subTab === 'all_buildings' ? (
        <BuildingsView
          buildings={buildings}
          rooms={rooms}
          onSaveBuilding={onSaveBuilding}
          onToggleMaintenance={onToggleBuildingMaintenance}
          canManage={canManageBuildings}
        />
      ) : activeBuilding ? (
        <>
          {/* Active Building Summary Strip & Filter Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4 no-print">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-[#0f2d4a] text-white">
                    {activeBuilding.code}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeBuilding.nameBn}
                  </h2>
                  <span className="text-xs text-slate-600">
                    · {isNarasundaDorm ? '৬ কলাম বিশিষ্ট নার্সিং ডরমেটরী কক্ষ চার্ট (601–606 হতে 201–206)' : '৪ কলাম বিশিষ্ট আবাসিক ইউনিট চার্ট (A, B, C, D)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {activeBuilding.description} · <MapPin className="w-3.5 h-3.5 inline text-slate-400" /> {activeBuilding.address}
                </p>
              </div>

              {/* Compact KPI Summary */}
              <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200/80">
                <div>
                  <span className="text-slate-500">মোট কক্ষ/ইউনিট: </span>
                  <strong className="text-slate-900">{toBanglaNumber(totalRoomsCount)} টি</strong>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  <span className="text-blue-700">বরাদ্দকৃত: </span>
                  <strong className="text-blue-900">{toBanglaNumber(occupiedRoomsCount)} টি</strong>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  <span className="text-emerald-700">ফাঁকা (বরাদ্দযোগ্য): </span>
                  <strong className="text-emerald-900">{toBanglaNumber(vacantRoomsCount)} টি</strong>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  <span className="text-teal-700">দখল হার: </span>
                  <strong className="text-teal-900">{toBanglaNumber(occupancyRate)}%</strong>
                </div>
              </div>
            </div>

            {/* Interactive Floor Selector & Search Filter Bar */}
            {subTab !== 'building_residents' && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-600 mr-1">তলা ফিল্টার:</span>
                  <button
                    type="button"
                    onClick={() => setFloorFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                      floorFilter === 'ALL'
                        ? 'bg-[#0f2d4a] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    সকল তলা ({toBanglaNumber(buildingRooms.length)})
                  </button>
                  {floorsDescending.map((fl) => (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => setFloorFilter(fl)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                        floorFilter === fl
                          ? 'bg-[#0e7484] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {toBanglaNumber(fl)} তলা
                    </button>
                  ))}

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="কক্ষের অবস্থা ফিল্টার"
                    className="ml-1 px-2.5 py-1 rounded-md border border-slate-300 bg-slate-50 text-slate-700 font-medium"
                  >
                    <option value="ALL">সকল অবস্থা</option>
                    <option value="OCCUPIED">বরাদ্দকৃত কক্ষ</option>
                    <option value="VACANT">ফাঁকা কক্ষ</option>
                    <option value="MAINTENANCE">মেরামতাধীন</option>
                  </select>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কক্ষ নং (601, 6-A), নাম বা মোবাইল খুঁজুন..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs focus:bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* =====================================================================
              SUB-TAB 1: SMART INTERACTIVE BUILDING MATRIX (৬-কলাম / ৪-কলাম স্মার্ট ভবন চার্ট)
             ===================================================================== */}
          {subTab === 'smart_matrix' && (
            <div className="space-y-4">
              {groupedFloorMatrix.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                  নির্বাচিত ফিল্টারে কোনো কক্ষ বা ইউনিট পাওয়া যায়নি।
                </div>
              ) : (
                groupedFloorMatrix.map(({ floor, rooms: floorRooms }) => {
                  const occupiedInFloor = floorRooms.filter(
                    (r) => r.status === 'OCCUPIED' || r.status === 'PARTIAL'
                  ).length;
                  const vacantInFloor = floorRooms.filter((r) => r.status === 'VACANT').length;

                  return (
                    <div
                      key={floor}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                    >
                      {/* Floor Header Ribbon */}
                      <div className="bg-[#0f2d4a] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-teal-300" />
                          <h3 className="text-xs font-bold tracking-wide">
                            {getFloorTitleBn(floor)} — {activeBuilding.nameBn}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-200 tabular-nums">
                          <span>মোট কক্ষ: {toBanglaNumber(floorRooms.length)} টি</span>
                          <span>•</span>
                          <span className="text-sky-300">
                            বরাদ্দকৃত: {toBanglaNumber(occupiedInFloor)} টি
                          </span>
                          <span>•</span>
                          <span className="text-emerald-300">
                            ফাঁকা: {toBanglaNumber(vacantInFloor)} টি
                          </span>
                        </div>
                      </div>

                      {/* Architectural Room/Unit Matrix Grid:
                          - 6 Columns on desktop for নরসুন্দা নার্সিং ডরমেটরী (601..606 down to 201..206)
                          - 4 Columns on desktop for নিহারিকা & মল্লিকা আবাসিক ভবন (6-A..6-D) */}
                      <div
                        className={`p-3.5 grid gap-3 ${
                          isNarasundaDorm
                            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                        }`}
                      >
                        {floorRooms.map((room) => {
                          const roomAllocations = activeAllocationsInBuilding.filter(
                            (a) => a.roomId === room.id
                          );
                          const primaryAlloc = roomAllocations[0];
                          const residentObj = primaryAlloc
                            ? residents.find((r) => r.id === primaryAlloc.residentId)
                            : undefined;
                          const isOccupied = roomAllocations.length > 0;
                          const isMaintenance = room.status === 'MAINTENANCE';

                          const seatTypeText = normalizeNarasundaRoomType(
                            primaryAlloc?.seatTypeLabel || room.seatTypeLabel
                          );

                          const dateText = primaryAlloc
                            ? formatBanglaSlashDate(primaryAlloc.startDate, digitMode)
                            : '—';

                          const phoneText = primaryAlloc
                            ? formatBanglaPhone(
                                primaryAlloc.residentPhone || residentObj?.mobileNumber || '',
                                digitMode
                              )
                            : '—';

                          return (
                            <div
                              key={room.id}
                              className={`rounded-lg border flex flex-col justify-between transition-all overflow-hidden ${
                                isMaintenance
                                  ? 'border-amber-300 bg-amber-50/30'
                                  : isOccupied
                                  ? 'border-slate-300 bg-white hover:border-[#0e7484] hover:shadow-sm'
                                  : 'border-emerald-300 bg-emerald-50/25 hover:border-emerald-600'
                              }`}
                            >
                              {/* Cell Header Bar (Room Number e.g. 601 or 6-A + Quick Controls) */}
                              <div
                                className={`px-3 py-1.5 border-b flex items-center justify-between gap-1.5 ${
                                  isMaintenance
                                    ? 'bg-amber-100/80 border-amber-200 text-amber-950'
                                    : isOccupied
                                    ? 'bg-slate-100 border-slate-200 text-slate-900'
                                    : 'bg-emerald-100/70 border-emerald-200 text-emerald-950'
                                }`}
                              >
                                <span className="font-mono font-bold text-sm tracking-tight text-slate-950">
                                  {room.roomNumber}
                                </span>

                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                      isMaintenance
                                        ? 'text-amber-800'
                                        : isOccupied
                                        ? 'text-teal-800'
                                        : 'text-emerald-800'
                                    }`}
                                  >
                                    {isMaintenance
                                      ? 'মেরামত'
                                      : isOccupied
                                      ? 'বরাদ্দকৃত'
                                      : 'ফাঁকা'}
                                  </span>

                                  {canManageRooms && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditRoom(room)}
                                      title="কক্ষ সেটিংস সম্পাদনা"
                                      aria-label={`কক্ষ ${room.roomNumber} সেটিংস`}
                                      className="p-1 rounded hover:bg-black/10 text-slate-600 transition-colors"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Cell Body: 5-Line Sample Information with High-Legibility Bengali & Number Font */}
                              {isOccupied && primaryAlloc ? (
                                <div className="p-3 text-center flex-1 flex flex-col justify-between">
                                  <div className="space-y-1">
                                    {/* Line 1: Resident Name */}
                                    <div className="font-bold text-slate-950 text-[14px] leading-snug">
                                      {primaryAlloc.residentName}
                                    </div>
                                    {/* Line 2: Designation */}
                                    <div className="text-[12.5px] text-slate-800 font-medium leading-snug">
                                      {primaryAlloc.residentDesignation}
                                    </div>
                                    {/* Line 3: কক্ষের ধরন (Only for নরসুন্দা নার্সিং ডরমেটরী) */}
                                    {isNarasundaDorm && (
                                      <div className="text-[12px] text-teal-900 font-semibold leading-snug pt-0.5">
                                        {seatTypeText}
                                      </div>
                                    )}
                                    {/* Line 4: Date (DD/MM/YYYY in crystal-clear number font) */}
                                    <div className="font-num-clear text-[13.5px] font-semibold text-slate-900 leading-snug pt-0.5">
                                      {dateText}
                                    </div>
                                    {/* Line 5: Mobile Number (Hyphenated in crystal-clear number font) */}
                                    <div className="font-num-clear text-[13.5px] font-bold text-slate-950 leading-snug">
                                      {phoneText}
                                    </div>
                                  </div>

                                  {canCreateAllocations && (
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenCellAllocationModal(room, primaryAlloc)
                                        }
                                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#0e7484] hover:text-white text-slate-700 text-[11px] font-semibold transition-colors w-full"
                                      >
                                        তথ্য সম্পাদনা / পরিবর্তন
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : isMaintenance ? (
                                <div className="p-3 text-center flex-1 flex flex-col items-center justify-center space-y-2">
                                  <Wrench className="w-5 h-5 text-amber-600" />
                                  <p className="text-xs font-semibold text-amber-900">
                                    কক্ষটি মেরামতাধীন
                                  </p>
                                  {canManageRooms && (
                                    <button
                                      type="button"
                                      onClick={() => onToggleRoomMaintenance(room.id)}
                                      className="px-2.5 py-1 rounded bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700"
                                    >
                                      সচল করুন
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="p-3 text-center flex-1 flex flex-col justify-between items-center">
                                  <div className="space-y-1 my-auto py-1">
                                    <span className="text-xs font-bold text-emerald-800 block">
                                      ফাঁকা কক্ষ (বরাদ্দযোগ্য)
                                    </span>
                                    {isNarasundaDorm && (
                                      <span className="text-xs text-slate-700 block">
                                        {seatTypeText}
                                      </span>
                                    )}
                                  </div>

                                  {canCreateAllocations && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCellAllocationModal(room)}
                                      className="mt-2 w-full py-1.5 px-2.5 bg-[#0e7484] hover:bg-teal-700 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>বরাদ্দ দিন</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* =====================================================================
              SUB-TAB 2: OFFICIAL PRINTABLE SAMPLE SHEET VIEW (দাপ্তরিক স্যাম্পল শিট ভিউ)
              Matches the exact tabular format of the user's 3 uploaded PNG samples!
             ===================================================================== */}
          {subTab === 'sample_sheet' && (
            <div className="bg-white rounded-xl border border-slate-300 p-6 shadow-xs overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    {activeBuilding.nameBn}
                  </h2>
                  <p className="text-xs text-slate-500 no-print">
                    দাপ্তরিক স্যাম্পল শিট ভিউ — যেকোনো কক্ষের ঘরে ক্লিক করে সরাসরি তথ্য সম্পাদনা বা নতুন বরাদ্দ প্রদান করতে পারবেন।
                  </p>
                </div>
                <div className="flex items-center gap-2 no-print">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleDirectPdfDownload}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>সরাসরি PDF ডাউনলোড</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPrintStudio}
                    className="px-3.5 py-2 bg-[#0f2d4a] hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>প্রিন্ট / পিডিএফ সংরক্ষণ</span>
                  </button>
                </div>
              </div>

              <div className="min-w-[820px]">
                {groupedFloorMatrix.map(({ floor, rooms: floorRooms }) => (
                  <div key={floor} className="border-x border-t last:border-b border-slate-900">
                    {/* Room Number Header Row (e.g. 601 | 602 | 603 | 604 | 605 | 606 or 6-A | 6-B | 6-C | 6-D) */}
                    <div
                      className={`grid divide-x divide-slate-900 border-b border-slate-900 bg-slate-50/70 ${
                        isNarasundaDorm ? 'grid-cols-6' : 'grid-cols-4'
                      }`}
                    >
                      {floorRooms.map((room) => (
                        <div
                          key={`hdr-${room.id}`}
                          className="px-2.5 py-1.5 text-sm font-mono font-bold text-slate-950 flex items-center justify-between"
                        >
                          <span>{room.roomNumber}</span>
                          {room.status === 'VACANT' && (
                            <span className="text-[11px] font-sans font-normal text-emerald-700 no-print">
                              (ফাঁকা)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Room Resident 5-Line Body Row */}
                    <div
                      className={`grid divide-x divide-slate-900 ${
                        isNarasundaDorm ? 'grid-cols-6' : 'grid-cols-4'
                      }`}
                    >
                      {floorRooms.map((room) => {
                        const primaryAlloc = activeAllocationsInBuilding.find(
                          (a) => a.roomId === room.id
                        );
                        const residentObj = primaryAlloc
                          ? residents.find((r) => r.id === primaryAlloc.residentId)
                          : undefined;

                        const seatTypeText = normalizeNarasundaRoomType(
                          primaryAlloc?.seatTypeLabel || room.seatTypeLabel
                        );

                        return (
                          <button
                            key={`cell-${room.id}`}
                            type="button"
                            onClick={() => handleOpenCellAllocationModal(room, primaryAlloc)}
                            className="p-2.5 text-center min-h-[116px] flex flex-col items-center justify-center hover:bg-teal-50/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0e7484]"
                          >
                            {primaryAlloc ? (
                              <div className="space-y-0.5 text-[13px] text-slate-950 leading-snug">
                                <div className="font-bold text-[13.5px]">{primaryAlloc.residentName}</div>
                                <div className="font-medium text-slate-900">{primaryAlloc.residentDesignation}</div>
                                {isNarasundaDorm && (
                                  <div className="font-medium text-slate-900">{seatTypeText}</div>
                                )}
                                <div className="font-num-clear font-semibold text-[13.5px] text-slate-950">
                                  {formatBanglaSlashDate(primaryAlloc.startDate, digitMode)}
                                </div>
                                <div className="font-num-clear font-bold text-[13.5px] text-slate-950">
                                  {formatBanglaPhone(
                                    primaryAlloc.residentPhone || residentObj?.mobileNumber || '',
                                    digitMode
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500 no-print flex flex-col items-center gap-1">
                                <span>ফাঁকা কক্ষ</span>
                                <span className="text-teal-700 font-semibold underline">
                                  + বরাদ্দ দিন
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =====================================================================
              SUB-TAB 3: ROOMS REGISTER TABLE
             ===================================================================== */}
          {subTab === 'rooms_table' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">কক্ষ/ইউনিট নং</th>
                      <th className="py-3 px-4">তলা</th>
                      {isNarasundaDorm && <th className="py-3 px-4">কক্ষের ধরন</th>}
                      <th className="py-3 px-4">বর্তমান বাসিন্দা ও পদবী</th>
                      <th className="py-3 px-4">বরাদ্দ তারিখ ও মোবাইল</th>
                      <th className="py-3 px-4">অবস্থা</th>
                      <th className="py-3 px-4 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRooms.map((room) => {
                      const primaryAlloc = activeAllocationsInBuilding.find(
                        (a) => a.roomId === room.id
                      );
                      const residentObj = primaryAlloc
                        ? residents.find((r) => r.id === primaryAlloc.residentId)
                        : undefined;
                      const seatLabel = normalizeNarasundaRoomType(
                        primaryAlloc?.seatTypeLabel || room.seatTypeLabel
                      );

                      return (
                        <tr key={room.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {room.roomNumber}
                          </td>
                          <td className="py-3 px-4">{toBanglaNumber(room.floor)} তলা</td>
                          {isNarasundaDorm && <td className="py-3 px-4">{seatLabel}</td>}
                          <td className="py-3 px-4">
                            {primaryAlloc ? (
                              <div>
                                <div className="font-bold text-slate-900">
                                  {primaryAlloc.residentName}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {primaryAlloc.residentDesignation}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">ফাঁকা</span>
                            )}
                          </td>
                          <td className="py-3 px-4 tabular-nums">
                            {primaryAlloc ? (
                              <div>
                                <div>{formatBanglaSlashDate(primaryAlloc.startDate, digitMode)}</div>
                                <div className="text-[11px] text-slate-500">
                                  {formatBanglaPhone(
                                    primaryAlloc.residentPhone || residentObj?.mobileNumber || '',
                                    digitMode
                                  )}
                                </div>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(room.status)}</td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canCreateAllocations && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenCellAllocationModal(room, primaryAlloc)
                                  }
                                  className="px-2.5 py-1 bg-[#0e7484] hover:bg-teal-700 text-white rounded font-semibold text-[11px]"
                                >
                                  {primaryAlloc ? 'তথ্য পরিবর্তন' : 'বরাদ্দ দিন'}
                                </button>
                              )}
                              {canManageRooms && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRoom(room)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px]"
                                >
                                  কক্ষ সেটিংস
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              SUB-TAB 4: BUILDING RESIDENTS DIRECTORY
             ===================================================================== */}
          {subTab === 'building_residents' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeBuilding.nameBn}-এ বসবাসরত কর্মকর্তা ও কর্মচারীবৃন্দ
                  </h3>
                  <p className="text-xs text-slate-500">
                    মোট সক্রিয় বাসিন্দা: {toBanglaNumber(activeAllocationsInBuilding.length)} জন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToResidents}
                  className="px-3 py-1.5 bg-[#0e7484] hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>সকল বাসিন্দা ডিরেক্টরি</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">কক্ষ/ইউনিট নং</th>
                      <th className="py-3 px-4">বাসিন্দার নাম ও পদবী</th>
                      {isNarasundaDorm && <th className="py-3 px-4">কক্ষের ধরন</th>}
                      <th className="py-3 px-4">বরাদ্দ তারিখ</th>
                      <th className="py-3 px-4">মোবাইল নম্বর</th>
                      <th className="py-3 px-4">সরকারি স্মারক নং</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeAllocationsInBuilding.length === 0 ? (
                      <tr>
                        <td colSpan={isNarasundaDorm ? 6 : 5} className="py-8 text-center text-slate-400">
                          এই ভবনে বর্তমানে কোনো সক্রিয় বরাদ্দকৃত বাসিন্দা নেই।
                        </td>
                      </tr>
                    ) : (
                      activeAllocationsInBuilding.map((alloc) => {
                        const resObj = residents.find((r) => r.id === alloc.residentId);
                        return (
                          <tr key={alloc.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono font-bold text-teal-900">
                              {alloc.roomNumber}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{alloc.residentName}</div>
                              <div className="text-[11px] text-slate-500">
                                {alloc.residentDesignation}
                              </div>
                            </td>
                            {isNarasundaDorm && (
                              <td className="py-3 px-4">
                                {alloc.seatTypeLabel || 'একক রুম'}
                              </td>
                            )}
                            <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                              {formatBanglaSlashDate(alloc.startDate, digitMode)}
                            </td>
                            <td className="py-3 px-4 font-semibold tabular-nums">
                              {formatBanglaPhone(
                                alloc.residentPhone || resObj?.mobileNumber || '',
                                digitMode
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {alloc.officialOrderNo}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Modal 1: Add/Edit Room Configuration in Active Building */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={
          editingRoom?.id
            ? `কক্ষ/ইউনিট সেটিংস — ${editingRoom.roomNumber}`
            : `${activeBuilding?.nameBn || ''}-এ নতুন কক্ষ/ইউনিট সংযোজন`
        }
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
      >
        <form onSubmit={handleSaveRoomSubmit} className="space-y-4 text-xs">
          {roomError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{roomError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">আবাসিক ভবন *</label>
              <select
                required
                value={editingRoom?.buildingId || ''}
                onChange={(e) => setEditingRoom({ ...editingRoom, buildingId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameBn} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                কক্ষ / ইউনিট নম্বর *
              </label>
              <input
                type="text"
                required
                value={editingRoom?.roomNumber || ''}
                onChange={(e) => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                placeholder="যেমন: 601, 502 অথবা 6-A, 5-B"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div
            className={`grid gap-3 ${
              shouldShowRoomTypeField(editingRoom?.buildingId || activeBuilding?.id)
                ? 'grid-cols-3'
                : 'grid-cols-2'
            }`}
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">তলা *</label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={editingRoom?.floor || 1}
                onChange={(e) =>
                  setEditingRoom({ ...editingRoom, floor: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            {shouldShowRoomTypeField(editingRoom?.buildingId || activeBuilding?.id) && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">কক্ষের ধরন *</label>
                <select
                  value={normalizeNarasundaRoomType(editingRoom?.seatTypeLabel)}
                  onChange={(e) =>
                    setEditingRoom({ ...editingRoom, seatTypeLabel: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {NARASUNDA_ROOM_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ধারণক্ষমতা (জন) *</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={editingRoom?.capacity || 1}
                onChange={(e) =>
                  setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0e7484] hover:bg-teal-700 text-white font-bold rounded-lg"
            >
              সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: 1-Step Room Cell Allocation & Direct Editor */}
      <Modal
        isOpen={isAllocModalOpen}
        onClose={() => setIsAllocModalOpen(false)}
        title={
          editingAllocationId
            ? `কক্ষ/ইউনিট ${allocRoom?.roomNumber || ''} — বাসিন্দার তথ্য সম্পাদনা (${activeBuilding?.nameBn || ''})`
            : `কক্ষ/ইউনিট ${allocRoom?.roomNumber || ''}-এ বরাদ্দ প্রদান (${activeBuilding?.nameBn || ''})`
        }
        subtitle={
          shouldShowRoomTypeField(allocRoom?.buildingId || activeBuilding?.id)
            ? 'ভবন চার্টের ৫টি তথ্য (নাম, পদবী, কক্ষের ধরন, তারিখ ও মোবাইল নম্বর) সরাসরি পূরণ বা হালনাগাদ করুন'
            : 'ভবন চার্টের ৪টি তথ্য (নাম, পদবী, তারিখ ও মোবাইল নম্বর) সরাসরি পূরণ বা হালনাগাদ করুন'
        }
      >
        <form onSubmit={handleCellAllocationSubmit} className="space-y-4 text-xs">
          {allocError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{allocError}</span>
            </div>
          )}

          {!editingAllocationId && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setEntryMode('DIRECT_ENTRY')}
                className={`flex-1 py-1.5 px-3 rounded-md font-bold transition-colors ${
                  entryMode === 'DIRECT_ENTRY'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {shouldShowRoomTypeField(allocRoom?.buildingId || activeBuilding?.id)
                  ? 'সরাসরি এন্ট্রি (৫টি তথ্য পূরণ)'
                  : 'সরাসরি এন্ট্রি (৪টি তথ্য পূরণ)'}
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('SELECT_RESIDENT')}
                className={`flex-1 py-1.5 px-3 rounded-md font-bold transition-colors ${
                  entryMode === 'SELECT_RESIDENT'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                তালিকা হতে বাসিন্দা নির্বাচন
              </button>
            </div>
          )}

          {entryMode === 'SELECT_RESIDENT' && !editingAllocationId ? (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                নিবন্ধিত বাসিন্দা নির্বাচন করুন *
              </label>
              <select
                required
                value={allocResidentId}
                onChange={(e) => setAllocResidentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">বাসিন্দা নির্বাচন করুন...</option>
                {residents.map((res) => {
                  const alreadyAllocated = allocations.some(
                    (a) => a.residentId === res.id && a.status === 'ACTIVE'
                  );
                  return (
                    <option key={res.id} value={res.id} disabled={alreadyAllocated}>
                      {res.fullName} ({res.designation} - {res.mobileNumber})
                      {alreadyAllocated ? ' [বরাদ্দপ্রাপ্ত]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ১. বাসিন্দার নাম *
                </label>
                <input
                  type="text"
                  required
                  value={directResidentName}
                  onChange={(e) => setDirectResidentName(e.target.value)}
                  placeholder="যেমন: সাইফুল ইসলাম"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ২. পদবী *
                </label>
                <input
                  type="text"
                  required
                  value={directDesignation}
                  onChange={(e) => setDirectDesignation(e.target.value)}
                  placeholder="যেমন: সিনিয়র স্টাফ নার্স"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              {shouldShowRoomTypeField(allocRoom?.buildingId || activeBuilding?.id) && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ৩. কক্ষের ধরন *
                  </label>
                  <select
                    value={normalizeNarasundaRoomType(directSeatType)}
                    onChange={(e) => setDirectSeatType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {NARASUNDA_ROOM_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {shouldShowRoomTypeField(allocRoom?.buildingId || activeBuilding?.id)
                    ? '৪. বরাদ্দ তারিখ *'
                    : '৩. বরাদ্দ তারিখ *'}
                </label>
                <input
                  type="date"
                  required
                  value={allocStartDate}
                  onChange={(e) => setAllocStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div
                className={
                  shouldShowRoomTypeField(allocRoom?.buildingId || activeBuilding?.id)
                    ? 'sm:col-span-2'
                    : ''
                }
              >
                <label className="block font-semibold text-slate-700 mb-1">
                  {shouldShowRoomTypeField(allocRoom?.buildingId || activeBuilding?.id)
                    ? '৫. মোবাইল নম্বর *'
                    : '৪. মোবাইল নম্বর *'}
                </label>
                <input
                  type="text"
                  required
                  value={directMobile}
                  onChange={(e) => setDirectMobile(e.target.value)}
                  placeholder="যেমন: 01711-112233"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              সরকারি অফিস স্মারক নং *
            </label>
            <input
              type="text"
              required
              value={allocOrderNo}
              onChange={(e) => setAllocOrderNo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            {editingAllocationId && onReleaseRoomNow ? (
              <button
                type="button"
                onClick={handleVacateFromModal}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg flex items-center gap-1.5"
              >
                <FileX2 className="w-4 h-4" />
                <span>বরাদ্দ বাতিল ও কক্ষ ফাঁকা করুন</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAllocModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0e7484] hover:bg-teal-700 text-white font-bold rounded-lg flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingAllocationId ? 'তথ্য হালনাগাদ করুন' : 'বরাদ্দ নিশ্চিত করুন'}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          OFFSCREEN PRINT-READY SHEET FOR 1-CLICK DIRECT PDF DOWNLOAD FROM ANY TAB
         ===================================================================== */}
      {activeBuilding && (
        <div
          aria-hidden="true"
          className="fixed -left-[12000px] top-0 w-[920px] bg-white p-6 text-slate-950 pointer-events-none"
        >
          <div ref={offscreenSheetRef} className="bg-white p-4">
            <h2 className="text-xl font-bold text-slate-950 mb-2">
              {activeBuilding.nameBn}
            </h2>
            <div>
              {groupRoomsByFloorDescending(buildingRooms).map(({ floor, rooms: flRooms }) => (
                <div key={`off-fl-${floor}`} className="border-x border-t last:border-b border-slate-900">
                  <div
                    className={`grid divide-x divide-slate-900 border-b border-slate-900 bg-slate-50 ${
                      isNarasundaDorm ? 'grid-cols-6' : 'grid-cols-4'
                    }`}
                  >
                    {flRooms.map((room) => (
                      <div
                        key={`off-hdr-${room.id}`}
                        className="px-2.5 py-1 text-xs font-mono font-bold text-slate-950"
                      >
                        {room.roomNumber}
                      </div>
                    ))}
                  </div>

                  <div
                    className={`grid divide-x divide-slate-900 ${
                      isNarasundaDorm ? 'grid-cols-6' : 'grid-cols-4'
                    }`}
                  >
                    {flRooms.map((room) => {
                      const primaryAlloc = activeAllocationsInBuilding.find(
                        (a) => a.roomId === room.id
                      );
                      const residentObj = primaryAlloc
                        ? residents.find((r) => r.id === primaryAlloc.residentId)
                        : undefined;
                      const seatTypeText = normalizeNarasundaRoomType(
                        primaryAlloc?.seatTypeLabel || room.seatTypeLabel
                      );

                      return (
                        <div
                          key={`off-cell-${room.id}`}
                          className="p-2 text-center min-h-[108px] flex flex-col items-center justify-center"
                        >
                          {primaryAlloc ? (
                            <div className="space-y-0.5 text-xs text-slate-950 leading-snug">
                              <div className="font-bold text-[12.5px]">{primaryAlloc.residentName}</div>
                              <div>{primaryAlloc.residentDesignation}</div>
                              {isNarasundaDorm && <div>{seatTypeText}</div>}
                              <div className="font-num-clear font-semibold text-[12.5px]">
                                {formatBanglaSlashDate(primaryAlloc.startDate, digitMode)}
                              </div>
                              <div className="font-num-clear font-bold text-[12.5px]">
                                {formatBanglaPhone(
                                  primaryAlloc.residentPhone || residentObj?.mobileNumber || '',
                                  digitMode
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: INTERACTIVE PRINT & PDF SAVE STUDIO (প্রিন্ট ও পিডিএফ সংরক্ষণ স্টুডিও)
         ===================================================================== */}
      <Modal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        title="প্রিন্ট ও পিডিএফ সংরক্ষণ স্টুডিও (Print & PDF Save)"
        subtitle="দাপ্তরিক স্যাম্পল শিট প্রিন্ট, সরাসরি এ-ফোর (A4) পিডিএফ ডাউনলোড এবং ইমেজ সংরক্ষণ"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Top Action & Configuration Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleStudioPdfDownload}
                  className="px-4 py-2 bg-[#0e7484] hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>পিডিএফ ফাইল সংরক্ষণ (.pdf)</span>
                </button>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleStudioPngDownload}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>ইমেজ শিট ডাউনলোড (.png)</span>
                </button>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleStudioPrintDialog}
                  className="px-3.5 py-2 bg-[#0f2d4a] hover:bg-slate-800 disabled:opacity-60 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্টার ডায়ালগ খুলুন (Print)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPrintStudioOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold"
              >
                বন্ধ করুন
              </button>
            </div>

            {/* Print Customization Controls */}
            <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700">ভবন নির্বাচন:</span>
                {buildings.map((b) => (
                  <button
                    key={`pr-b-${b.id}`}
                    type="button"
                    onClick={() => {
                      onSelectBuilding(b.id);
                      setPrintScope('SINGLE_BUILDING');
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      printScope === 'SINGLE_BUILDING' && activeBuilding?.id === b.id
                        ? 'bg-[#0f2d4a] text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {b.nameBn}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPrintScope('ALL_BUILDINGS')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                    printScope === 'ALL_BUILDINGS'
                      ? 'bg-[#0e7484] text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  সকল ৩টি ভবন একত্রে
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showOfficialHeaderInPrint}
                    onChange={(e) => setShowOfficialHeaderInPrint(e.target.checked)}
                    className="rounded border-slate-300 text-[#0e7484]"
                  />
                  <span>হাসপাতাল শিরোনাম ও স্বাক্ষর ব্লক যুক্ত করুন</span>
                </label>

                <select
                  value={printOrientation}
                  onChange={(e) => setPrintOrientation(e.target.value as 'portrait' | 'landscape')}
                  aria-label="পৃষ্ঠার বিন্যাস"
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 font-medium"
                >
                  <option value="portrait">A4 লম্বালম্বি (Portrait)</option>
                  <option value="landscape">A4 আড়াআড়ি (Landscape)</option>
                </select>
              </div>
            </div>

            {exportStatusBanner && (
              <div
                className={`p-2.5 rounded-lg border flex items-center gap-2 font-semibold ${
                  exportStatusBanner.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{exportStatusBanner.message}</span>
              </div>
            )}
          </div>

          {/* Printable A4 Sheet Preview Surface */}
          <div className="border border-slate-300 rounded-xl bg-slate-100 p-4 overflow-x-auto max-h-[62vh] overflow-y-auto">
            <div
              ref={printStudioSheetRef}
              className="bg-white p-6 mx-auto min-w-[820px] max-w-[920px] text-slate-950 shadow-xs space-y-8"
            >
              {(printScope === 'ALL_BUILDINGS' ? buildings : activeBuilding ? [activeBuilding] : []).map(
                (bld) => {
                  const bldRooms = rooms.filter(
                    (r) =>
                      r.buildingId === bld.id &&
                      !isExcludedNarasundaRoom(r.buildingId, r.roomNumber, r.floor)
                  );
                  const bldAllocations = allocations.filter(
                    (a) =>
                      a.buildingId === bld.id &&
                      a.status === 'ACTIVE' &&
                      !isExcludedNarasundaRoom(a.buildingId, a.roomNumber)
                  );
                  const bldIsDorm = bld.code === 'NND-01' || bld.id === 'bld-narasunda-01';
                  const bldGroupedFloors = groupRoomsByFloorDescending(bldRooms);

                  return (
                    <div key={`studio-sheet-${bld.id}`} className="space-y-3">
                      {showOfficialHeaderInPrint && (
                        <div className="text-center space-y-0.5 pb-3 border-b-2 border-slate-900">
                          <p className="text-xs font-bold">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</p>
                          <h1 className="text-base font-extrabold text-[#0f2b48]">
                            শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
                          </h1>
                          <p className="text-[11px] text-slate-700">
                            সরকারি আবাসিক কোয়ার্টার ও ডরমেটরী বরাদ্দ বিবরণী — তারিখ: {formatBanglaDate(new Date())}
                          </p>
                        </div>
                      )}

                      <h2 className="text-xl font-bold text-slate-950">
                        {bld.nameBn}
                      </h2>

                      <div>
                        {bldGroupedFloors.map(({ floor, rooms: flRooms }) => (
                          <div
                            key={`pr-fl-${bld.id}-${floor}`}
                            className="border-x border-t last:border-b border-slate-900"
                          >
                            <div
                              className={`grid divide-x divide-slate-900 border-b border-slate-900 bg-slate-50/60 ${
                                bldIsDorm ? 'grid-cols-6' : 'grid-cols-4'
                              }`}
                            >
                              {flRooms.map((room) => (
                                <div
                                  key={`pr-hdr-${room.id}`}
                                  className="px-2.5 py-1 text-xs font-mono font-bold text-slate-950"
                                >
                                  {room.roomNumber}
                                </div>
                              ))}
                            </div>

                            <div
                              className={`grid divide-x divide-slate-900 ${
                                bldIsDorm ? 'grid-cols-6' : 'grid-cols-4'
                              }`}
                            >
                              {flRooms.map((room) => {
                                const primaryAlloc = bldAllocations.find(
                                  (a) => a.roomId === room.id
                                );
                                const residentObj = primaryAlloc
                                  ? residents.find((r) => r.id === primaryAlloc.residentId)
                                  : undefined;
                                const seatTypeText = normalizeNarasundaRoomType(
                                  primaryAlloc?.seatTypeLabel || room.seatTypeLabel
                                );

                                return (
                                  <div
                                    key={`pr-cell-${room.id}`}
                                    className="p-2 text-center min-h-[108px] flex flex-col items-center justify-center"
                                  >
                                    {primaryAlloc ? (
                                      <div className="space-y-0.5 text-xs text-slate-950 leading-snug">
                                        <div className="font-bold text-[12.5px]">
                                          {primaryAlloc.residentName}
                                        </div>
                                        <div>{primaryAlloc.residentDesignation}</div>
                                        {bldIsDorm && <div>{seatTypeText}</div>}
                                        <div className="font-num-clear font-semibold text-[12.5px]">
                                          {formatBanglaSlashDate(primaryAlloc.startDate, digitMode)}
                                        </div>
                                        <div className="font-num-clear font-bold text-[12.5px]">
                                          {formatBanglaPhone(
                                            primaryAlloc.residentPhone ||
                                              residentObj?.mobileNumber ||
                                              '',
                                            digitMode
                                          )}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {showOfficialHeaderInPrint && (
                        <div className="pt-10 grid grid-cols-3 gap-4 text-center text-[11px] text-slate-800">
                          <div>
                            <div className="w-32 border-b border-slate-700 mx-auto mb-1" />
                            <p className="font-bold">হাউজ কিপার / তত্ত্বাবধায়ক</p>
                          </div>
                          <div>
                            <div className="w-32 border-b border-slate-700 mx-auto mb-1" />
                            <p className="font-bold">উপ-পরিচালক ও সদস্য সচিব</p>
                          </div>
                          <div>
                            <div className="w-36 border-b border-slate-900 mx-auto mb-1" />
                            <p className="font-bold">পরিচালক ও সভাপতি, বরাদ্দ কমিটি</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

