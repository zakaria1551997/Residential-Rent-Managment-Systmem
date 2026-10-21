import React, { useState, useRef } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Building2,
  DoorClosed,
  Users2,
  KeyRound,
  FileX2,
  Calendar,
  AlertTriangle,
  History,
  ShieldCheck,
  CheckCircle,
  FileCheck2,
  Download,
  Loader2,
  X
} from 'lucide-react';
import type { Building, Room, Resident, Allocation, CancellationRequest, AuditLog, AppSettings } from '../../types/index.ts';
import { toBanglaNumber, formatBanglaDate } from '../../logic/rules.ts';
import { exportElementToPdf, triggerElementPrint } from '../../utils/printPdf.ts';

interface ReportsViewProps {
  buildings: Building[];
  rooms: Room[];
  residents: Resident[];
  allocations: Allocation[];
  cancellations: CancellationRequest[];
  auditLogs: AuditLog[];
  settings: AppSettings;
}

export type ReportType =
  | 'BUILDING_WISE_RESIDENTS' // ১. ভবনভিত্তিক বাসিন্দাদের তালিকা
  | 'ROOM_INVENTORY'          // ২. কক্ষ ইনভেন্টরি ও বিবরণী
  | 'VACANT_ROOMS'            // ৩. ফাঁকা ও বরাদ্দযোগ্য কক্ষ
  | 'OCCUPIED_ROOMS'          // ৪. বরাদ্দকৃত কক্ষ ও বাসিন্দা
  | 'ACTIVE_ALLOCATIONS'      // ৫. চলতি সক্রিয় বরাদ্দ রেজিস্টার
  | 'ALLOCATION_HISTORY'      // ৬. বরাদ্দ ইতিহাস রেজিস্টার
  | 'CANCELLATION_REGISTER'   // ৭. বরাদ্দ বাতিল রেজিস্টার
  | 'PENDING_CANCELLATIONS'   // ৮. অনুমোদনাধীন বাতিল আবেদন
  | 'RESIDENT_HISTORY'        // ৯. বাসিন্দা বরাদ্দের ইতিহাস
  | 'DATE_RANGE_REPORT'       // ১০. তারিখভিত্তিক প্রতিবেদন
  | 'MISSING_DOCS'            // ১১. নথিপত্রবিহীন বরাদ্দের তালিকা
  | 'USER_ACTIVITY'           // ১২. ইউজার কার্যক্রম অডিট রিপোর্ট
  | 'ADMIN_SUMMARY';          // ১৩. সার্বিক প্রশাসনিক সারসংক্ষেপ

export const ReportsView: React.FC<ReportsViewProps> = ({
  buildings,
  rooms,
  residents,
  allocations,
  cancellations,
  auditLogs,
  settings
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>('ADMIN_SUMMARY');
  const [filterBuildingId, setFilterBuildingId] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('2026-01-01');
  const [endDateFilter, setEndDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const reportSurfaceRef = useRef<HTMLDivElement>(null);

  const reportList: { id: ReportType; title: string; category: string; icon: React.ElementType }[] = [
    { id: 'ADMIN_SUMMARY', title: '১৩. সার্বিক প্রশাসনিক সারসংক্ষেপ', category: 'সার্বিক', icon: FileCheck2 },
    { id: 'BUILDING_WISE_RESIDENTS', title: '১. ভবনভিত্তিক বাসিন্দাদের তালিকা', category: 'বাসিন্দা', icon: Building2 },
    { id: 'ROOM_INVENTORY', title: '২. কক্ষ ইনভেন্টরি ও বিবরণী', category: 'কক্ষ', icon: DoorClosed },
    { id: 'VACANT_ROOMS', title: '৩. ফাঁকা ও বরাদ্দযোগ্য কক্ষের তালিকা', category: 'কক্ষ', icon: CheckCircle },
    { id: 'OCCUPIED_ROOMS', title: '৪. বরাদ্দকৃত কক্ষ ও বাসিন্দার তালিকা', category: 'কক্ষ', icon: DoorClosed },
    { id: 'ACTIVE_ALLOCATIONS', title: '৫. চলতি সক্রিয় বাসা বরাদ্দ রেজিস্টার', category: 'বরাদ্দ', icon: KeyRound },
    { id: 'ALLOCATION_HISTORY', title: '৬. বরাদ্দ ইতিহাস ও ঐতিহাসিক রেজিস্টার', category: 'বরাদ্দ', icon: History },
    { id: 'CANCELLATION_REGISTER', title: '৭. বাসা বরাদ্দ বাতিল রেজিস্টার', category: 'বাতিল', icon: FileX2 },
    { id: 'PENDING_CANCELLATIONS', title: '৮. অনুমোদনাধীন বাতিল আবেদনের বিবরণী', category: 'বাতিল', icon: AlertTriangle },
    { id: 'RESIDENT_HISTORY', title: '৯. বাসিন্দা বরাদ্দ ইতিহাস ও তালিকা', category: 'বাসিন্দা', icon: Users2 },
    { id: 'DATE_RANGE_REPORT', title: '১০. তারিখভিত্তিক বরাদ্দ ও বাতিল বিবরণী', category: 'তারিখ', icon: Calendar },
    { id: 'MISSING_DOCS', title: '১১. নথিপত্রবিহীন অসমাপ্ত বরাদ্দের তালিকা', category: 'নথি', icon: AlertTriangle },
    { id: 'USER_ACTIVITY', title: '১২. ইউজার ও প্রশাসনিক কার্যক্রম অডিট রিপোর্ট', category: 'অডিট', icon: ShieldCheck }
  ];

  const currentReportTitle = reportList.find(r => r.id === activeReport)?.title || 'প্রশাসনিক_প্রতিবেদন';

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    const res = await exportElementToPdf(reportSurfaceRef.current, {
      titleBn: currentReportTitle,
      suffix: 'অফিশিয়াল_রিপোর্ট',
      orientation: 'portrait',
      fitSinglePage: false
    });
    setIsExporting(false);
    if (res.success) {
      setStatusMessage(`পিডিএফ প্রতিবেদন সফলভাবে সংরক্ষণ হয়েছে: ${res.filename}`);
    }
  };

  const handlePrint = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    await triggerElementPrint(reportSurfaceRef.current, {
      titleBn: currentReportTitle,
      suffix: 'অফিশিয়াল_রিপোর্ট',
      orientation: 'portrait',
      fitSinglePage: false
    });
    setIsExporting(false);
    setStatusMessage('প্রিন্ট ডায়ালগ প্রস্তুত করা হয়েছে। সরাসরি ফাইলে সংরক্ষণ করতে "পিডিএফ সংরক্ষণ (.pdf)" চাপুন।');
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between no-print">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            aria-label="বার্তা বন্ধ করুন"
            className="p-1 rounded hover:bg-emerald-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header - No Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs no-print">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-teal-700" />
            <span>প্রশাসনিক রিপোর্ট ও অফিশিয়াল প্রিন্ট (Official Institutional Reports)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            সরকারি বিধি মোতাবেক নির্ধারিত ১৩টি অফিশিয়াল বাংলা এ-ফোর (A4) প্রতিবেদন, রেজিস্টার এবং স্বাক্ষর ব্লক।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>পিডিএফ সংরক্ষণ (.pdf)</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handlePrint}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>এ-ফোর (A4) প্রিন্ট / PDF সংরক্ষণ</span>
          </button>
        </div>
      </div>

      {/* Report Selection Sidebar & Controls - No Print */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs no-print">
        <div className="flex flex-wrap items-center gap-2">
          <label className="font-bold text-slate-700">রিপোর্ট নির্বাচন:</label>
          <select
            value={activeReport}
            onChange={(e) => setActiveReport(e.target.value as ReportType)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-semibold focus:bg-white"
          >
            {reportList.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.title}
              </option>
            ))}
          </select>
        </div>

        {/* Additional Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {(activeReport === 'BUILDING_WISE_RESIDENTS' || activeReport === 'ROOM_INVENTORY' || activeReport === 'VACANT_ROOMS' || activeReport === 'OCCUPIED_ROOMS') && (
            <div className="flex items-center gap-1.5">
              <span>ভবন:</span>
              <select
                value={filterBuildingId}
                onChange={(e) => setFilterBuildingId(e.target.value)}
                className="px-2.5 py-1 rounded border border-slate-300 bg-slate-50"
              >
                <option value="ALL">সকল আবাসিক ভবন</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.nameBn}</option>
                ))}
              </select>
            </div>
          )}

          {activeReport === 'DATE_RANGE_REPORT' && (
            <div className="flex items-center gap-2">
              <span>হতে:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-slate-50"
              />
              <span>পর্যন্ত:</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-slate-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE A4 DOCUMENT SURFACE
      ========================================================================= */}
      <div
        ref={reportSurfaceRef}
        className="bg-white p-8 md:p-12 rounded-xl border border-slate-300 shadow-md text-slate-900 max-w-5xl mx-auto print:p-0 print:border-none print:shadow-none"
      >
        
        {/* Institutional Government Official Header */}
        <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
          <p className="text-xs font-bold tracking-wide">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</p>
          <p className="text-[11px] font-medium text-slate-700">{settings.ministryNameBn}</p>
          <h1 className="text-lg md:text-xl font-extrabold text-[#0f2b48] tracking-tight mt-1">
            {settings.hospitalNameBn}
          </h1>
          <p className="text-xs text-slate-600">{settings.addressBn}</p>
          <p className="text-[11px] font-semibold text-teal-800 bg-slate-100 inline-block px-3 py-0.5 rounded border border-slate-300 mt-1">
            {settings.subTitleBn}
          </p>
        </div>

        {/* Report Metadata Title Bar */}
        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs border-b border-slate-300 gap-2 font-medium">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              প্রতিবেদন: {reportList.find(r => r.id === activeReport)?.title}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
            </p>
          </div>
          <div className="text-right">
            <div>প্রতিবেদন তৈরির তারিখ: <strong>{formatBanglaDate(new Date())}</strong></div>
            <div className="text-[11px] text-slate-500">সময়: {new Date().toLocaleTimeString('bn-BD')}</div>
          </div>
        </div>

        {/* Dynamic Report Content based on selection */}
        <div className="py-6">
          {/* REPORT 13: ADMINISTRATIVE SUMMARY */}
          {activeReport === 'ADMIN_SUMMARY' && (
            <div className="space-y-6 text-xs">
              <p className="text-slate-700 leading-relaxed indent-6">
                শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জের আবাসিক কোয়ার্টার ও নার্সিং ডরমেটরী প্রশাসন শাখার অধীনে বর্তমানে 
                <strong> {toBanglaNumber(buildings.length)}</strong> টি আবাসিক ভবন এবং সর্বমোট 
                <strong> {toBanglaNumber(rooms.length)}</strong> টি কক্ষ বিদ্যমান। নিম্নে এর সামগ্রিক পরিসংখ্যান উপস্থাপন করা হলো:
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 border border-slate-300 rounded-lg">
                  <span className="block text-slate-500">মোট কক্ষ ইনভেন্টরি</span>
                  <span className="text-lg font-bold text-slate-900">{toBanglaNumber(rooms.length)} টি</span>
                </div>
                <div className="p-3 border border-slate-300 rounded-lg">
                  <span className="block text-slate-500">বরাদ্দকৃত কক্ষ</span>
                  <span className="text-lg font-bold text-blue-900">{toBanglaNumber(rooms.filter(r => r.status === 'OCCUPIED' || r.status === 'PARTIAL').length)} টি</span>
                </div>
                <div className="p-3 border border-slate-300 rounded-lg">
                  <span className="block text-slate-500">ফাঁকা ও অবমুক্ত কক্ষ</span>
                  <span className="text-lg font-bold text-emerald-800">{toBanglaNumber(rooms.filter(r => r.status === 'VACANT').length)} টি</span>
                </div>
                <div className="p-3 border border-slate-300 rounded-lg">
                  <span className="block text-slate-500">মেরামতাধীন কক্ষ</span>
                  <span className="text-lg font-bold text-amber-800">{toBanglaNumber(rooms.filter(r => r.status === 'MAINTENANCE').length)} টি</span>
                </div>
              </div>

              {/* Building Table Breakdown */}
              <table className="w-full text-left text-xs border border-slate-400 mt-4">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300">ক্র.নং</th>
                    <th className="p-2 border-r border-slate-300">ভবনের নাম ও কোড</th>
                    <th className="p-2 border-r border-slate-300 text-center">তলা</th>
                    <th className="p-2 border-r border-slate-300 text-center">মোট কক্ষ</th>
                    <th className="p-2 border-r border-slate-300 text-center">বরাদ্দকৃত</th>
                    <th className="p-2 border-r border-slate-300 text-center">ফাঁকা</th>
                    <th className="p-2 text-center">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {buildings.map((b, i) => {
                    const bRooms = rooms.filter(r => r.buildingId === b.id);
                    const bOcc = bRooms.filter(r => r.status === 'OCCUPIED' || r.status === 'PARTIAL').length;
                    const bVac = bRooms.filter(r => r.status === 'VACANT').length;
                    return (
                      <tr key={b.id}>
                        <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(i + 1)}</td>
                        <td className="p-2 border-r border-slate-300 font-bold">{b.nameBn} ({b.code})</td>
                        <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(b.totalFloors)}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold">{toBanglaNumber(bRooms.length)}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold text-blue-900">{toBanglaNumber(bOcc)}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold text-emerald-800">{toBanglaNumber(bVac)}</td>
                        <td className="p-2 text-center">{b.maintenanceStatus === 'NORMAL' ? 'স্বাভাবিক' : 'মেরামতাধীন'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 1: BUILDING WISE RESIDENTS */}
          {activeReport === 'BUILDING_WISE_RESIDENTS' && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border border-slate-400">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center">ক্র.নং</th>
                    <th className="p-2 border-r border-slate-300">বাসিন্দার নাম</th>
                    <th className="p-2 border-r border-slate-300">পদবী ও বিভাগ</th>
                    <th className="p-2 border-r border-slate-300">আবাসিক ভবন</th>
                    <th className="p-2 border-r border-slate-300 text-center">কক্ষ নং</th>
                    <th className="p-2 border-r border-slate-300">মোবাইল নম্বর</th>
                    <th className="p-2">স্মারক নম্বর</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {allocations
                    .filter(a => a.status === 'ACTIVE' && (filterBuildingId === 'ALL' || a.buildingId === filterBuildingId))
                    .map((alloc, i) => (
                      <tr key={alloc.id}>
                        <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(i + 1)}</td>
                        <td className="p-2 border-r border-slate-300 font-bold">{alloc.residentName}</td>
                        <td className="p-2 border-r border-slate-300">{alloc.residentDesignation}</td>
                        <td className="p-2 border-r border-slate-300">{alloc.buildingNameBn}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold">{alloc.roomNumber}</td>
                        <td className="p-2 border-r border-slate-300 font-mono">{toBanglaNumber(alloc.residentPhone)}</td>
                        <td className="p-2 font-semibold text-[11px]">{alloc.officialOrderNo}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 2, 3, 4: ROOM INVENTORY / VACANT / OCCUPIED */}
          {(activeReport === 'ROOM_INVENTORY' || activeReport === 'VACANT_ROOMS' || activeReport === 'OCCUPIED_ROOMS') && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border border-slate-400">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center">ক্র.নং</th>
                    <th className="p-2 border-r border-slate-300">কক্ষ নং</th>
                    <th className="p-2 border-r border-slate-300">ভবনের নাম</th>
                    <th className="p-2 border-r border-slate-300 text-center">তলা</th>
                    <th className="p-2 border-r border-slate-300">শ্রেণি</th>
                    <th className="p-2 border-r border-slate-300 text-center">ধারণক্ষমতা</th>
                    <th className="p-2 border-r border-slate-300 text-center">বর্তমান বরাদ্দ</th>
                    <th className="p-2 border-r border-slate-300">মাসিক সরকারি ভাড়া</th>
                    <th className="p-2 text-center">বর্তমান অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {rooms
                    .filter(r => {
                      if (filterBuildingId !== 'ALL' && r.buildingId !== filterBuildingId) return false;
                      if (activeReport === 'VACANT_ROOMS' && r.status !== 'VACANT') return false;
                      if (activeReport === 'OCCUPIED_ROOMS' && r.status !== 'OCCUPIED' && r.status !== 'PARTIAL') return false;
                      return true;
                    })
                    .map((rm, i) => (
                      <tr key={rm.id}>
                        <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(i + 1)}</td>
                        <td className="p-2 border-r border-slate-300 font-bold text-center">{rm.roomNumber}</td>
                        <td className="p-2 border-r border-slate-300">{rm.buildingNameBn}</td>
                        <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(rm.floor)} তলা</td>
                        <td className="p-2 border-r border-slate-300">{rm.category}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold">{toBanglaNumber(rm.capacity)} জন</td>
                        <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(rm.currentOccupancy)} জন</td>
                        <td className="p-2 border-r border-slate-300 font-mono">৳ {toBanglaNumber(rm.monthlyRent)}/-</td>
                        <td className="p-2 text-center font-bold">{rm.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 5 & 6: ACTIVE ALLOCATIONS & ALLOCATION HISTORY */}
          {(activeReport === 'ACTIVE_ALLOCATIONS' || activeReport === 'ALLOCATION_HISTORY') && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border border-slate-400">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center">ক্র.নং</th>
                    <th className="p-2 border-r border-slate-300">বরাদ্দ আইডি</th>
                    <th className="p-2 border-r border-slate-300">বাসিন্দার নাম ও পদবী</th>
                    <th className="p-2 border-r border-slate-300">ভবন ও কক্ষ নং</th>
                    <th className="p-2 border-r border-slate-300">স্মারক নম্বর</th>
                    <th className="p-2 border-r border-slate-300">বরাদ্দ তারিখ</th>
                    <th className="p-2 border-r border-slate-300">মাসিক কর্তন</th>
                    <th className="p-2 text-center">স্থিতি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {allocations
                    .filter(a => activeReport === 'ALLOCATION_HISTORY' || a.status === 'ACTIVE')
                    .map((alloc, i) => (
                      <tr key={alloc.id}>
                        <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(i + 1)}</td>
                        <td className="p-2 border-r border-slate-300 font-mono font-bold">{alloc.allocationNumber}</td>
                        <td className="p-2 border-r border-slate-300 font-bold">
                          {alloc.residentName} ({alloc.residentDesignation})
                        </td>
                        <td className="p-2 border-r border-slate-300">{alloc.buildingNameBn} • {alloc.roomNumber}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold text-[11px]">{alloc.officialOrderNo}</td>
                        <td className="p-2 border-r border-slate-300">{formatBanglaDate(alloc.startDate)}</td>
                        <td className="p-2 border-r border-slate-300 font-mono">৳ {toBanglaNumber(alloc.monthlyRent)}</td>
                        <td className="p-2 text-center font-bold">{alloc.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 7 & 8: CANCELLATION REGISTER & PENDING CANCELLATIONS */}
          {(activeReport === 'CANCELLATION_REGISTER' || activeReport === 'PENDING_CANCELLATIONS') && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border border-slate-400">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center">ক্র.নং</th>
                    <th className="p-2 border-r border-slate-300">ট্র্যাকিং নং</th>
                    <th className="p-2 border-r border-slate-300">বাসিন্দার নাম</th>
                    <th className="p-2 border-r border-slate-300">ভবন ও কক্ষ নং</th>
                    <th className="p-2 border-r border-slate-300">বাতিল স্মারক নং</th>
                    <th className="p-2 border-r border-slate-300">কার্যকর তারিখ</th>
                    <th className="p-2 border-r border-slate-300">বাতিলের কারণ</th>
                    <th className="p-2 text-center">সিদ্ধান্ত স্থিতি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {cancellations
                    .filter(c => activeReport === 'CANCELLATION_REGISTER' || c.status === 'PENDING_APPROVAL')
                    .map((canc, i) => (
                      <tr key={canc.id}>
                        <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(i + 1)}</td>
                        <td className="p-2 border-r border-slate-300 font-mono font-bold">{canc.trackingNumber}</td>
                        <td className="p-2 border-r border-slate-300 font-bold">{canc.residentName}</td>
                        <td className="p-2 border-r border-slate-300">{canc.buildingNameBn} • {canc.roomNumber}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold text-[11px]">{canc.cancellationOrderNo}</td>
                        <td className="p-2 border-r border-slate-300">{formatBanglaDate(canc.effectiveDate)}</td>
                        <td className="p-2 border-r border-slate-300">{canc.reason}</td>
                        <td className="p-2 text-center font-bold">{canc.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 9: RESIDENTS ALLOCATION HISTORY */}
          {activeReport === 'RESIDENT_HISTORY' && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border border-slate-400">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center">ক্র.নং</th>
                    <th className="p-2 border-r border-slate-300">পরিচিতি নং</th>
                    <th className="p-2 border-r border-slate-300">পূর্ণ নাম</th>
                    <th className="p-2 border-r border-slate-300">পদবী ও বিভাগ</th>
                    <th className="p-2 border-r border-slate-300">মোবাইল</th>
                    <th className="p-2 border-r border-slate-300">স্থায়ী ঠিকানা</th>
                    <th className="p-2 text-center">বর্তমান স্থিতি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {residents.map((res, i) => (
                    <tr key={res.id}>
                      <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(i + 1)}</td>
                      <td className="p-2 border-r border-slate-300 font-mono font-bold">{res.residentIdNumber}</td>
                      <td className="p-2 border-r border-slate-300 font-bold">{res.fullName}</td>
                      <td className="p-2 border-r border-slate-300">{res.designation} ({res.department})</td>
                      <td className="p-2 border-r border-slate-300 font-mono">{toBanglaNumber(res.mobileNumber)}</td>
                      <td className="p-2 border-r border-slate-300">{res.permanentAddress}</td>
                      <td className="p-2 text-center">{res.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 10: DATE RANGE REPORT */}
          {activeReport === 'DATE_RANGE_REPORT' && (
            <div className="space-y-4">
              <p className="font-semibold text-slate-700">
                তারিখ পরিসীমা: {formatBanglaDate(startDateFilter)} হতে {formatBanglaDate(endDateFilter)}
              </p>
              <table className="w-full text-left text-xs border border-slate-400">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300">তারিখ</th>
                    <th className="p-2 border-r border-slate-300">কার্যক্রমের ধরন</th>
                    <th className="p-2 border-r border-slate-300">স্মারক / রেফারেন্স</th>
                    <th className="p-2 border-r border-slate-300">বাসিন্দা</th>
                    <th className="p-2 border-r border-slate-300">ভবন ও কক্ষ নং</th>
                    <th className="p-2 text-center">স্থিতি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {allocations.map(a => (
                    <tr key={a.id}>
                      <td className="p-2 border-r border-slate-300">{formatBanglaDate(a.startDate)}</td>
                      <td className="p-2 border-r border-slate-300 font-bold text-teal-800">বাসা বরাদ্দ</td>
                      <td className="p-2 border-r border-slate-300 font-semibold text-[11px]">{a.officialOrderNo}</td>
                      <td className="p-2 border-r border-slate-300">{a.residentName}</td>
                      <td className="p-2 border-r border-slate-300">{a.buildingNameBn} • {a.roomNumber}</td>
                      <td className="p-2 text-center">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 11: MISSING DOCUMENT REPORT */}
          {activeReport === 'MISSING_DOCS' && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border border-slate-400">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center">ক্র.নং</th>
                    <th className="p-2 border-r border-slate-300">বরাদ্দ আইডি</th>
                    <th className="p-2 border-r border-slate-300">বাসিন্দার নাম ও পদবী</th>
                    <th className="p-2 border-r border-slate-300">ভবন ও কক্ষ</th>
                    <th className="p-2 border-r border-slate-300">স্মারক নং</th>
                    <th className="p-2 text-rose-800 text-center">অনুপস্থিত নথি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {allocations
                    .filter(a => a.status === 'ACTIVE' && (!a.documentIds || a.documentIds.length === 0))
                    .map((alloc, i) => (
                      <tr key={alloc.id}>
                        <td className="p-2 border-r border-slate-300 text-center">{toBanglaNumber(i + 1)}</td>
                        <td className="p-2 border-r border-slate-300 font-mono font-bold">{alloc.allocationNumber}</td>
                        <td className="p-2 border-r border-slate-300 font-bold">{alloc.residentName} ({alloc.residentDesignation})</td>
                        <td className="p-2 border-r border-slate-300">{alloc.buildingNameBn} • কক্ষ {alloc.roomNumber}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold">{alloc.officialOrderNo}</td>
                        <td className="p-2 text-rose-700 font-bold text-center">স্বাক্ষরিত অফিস আদেশপত্র অনুপস্থিত</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 12: USER ACTIVITY REPORT */}
          {activeReport === 'USER_ACTIVITY' && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border border-slate-400">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300">সময় ও তারিখ</th>
                    <th className="p-2 border-r border-slate-300">কর্মকর্তা / ইউজার</th>
                    <th className="p-2 border-r border-slate-300">অ্যাকশন</th>
                    <th className="p-2 border-r border-slate-300">মডিউল</th>
                    <th className="p-2">কার্যক্রম বিবরণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {auditLogs.slice(0, 25).map(log => (
                    <tr key={log.id}>
                      <td className="p-2 border-r border-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {formatBanglaDate(log.timestamp)} {new Date(log.timestamp).toLocaleTimeString('bn-BD')}
                      </td>
                      <td className="p-2 border-r border-slate-300 font-bold">{log.actorName}</td>
                      <td className="p-2 border-r border-slate-300 font-bold">{log.action}</td>
                      <td className="p-2 border-r border-slate-300">{log.entityType}</td>
                      <td className="p-2 text-[11px]">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Official Institutional Signature Block for All Reports */}
        <div className="pt-16 mt-8 border-t border-slate-400 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="w-36 border-b border-slate-600 mx-auto pb-1 mb-1"></div>
            <p className="font-bold">প্রশাসনিক কর্মকর্তা</p>
            <p className="text-[10px] text-slate-600">আবাসিক কোয়ার্টার শাখা</p>
            <p className="text-[10px] text-slate-500">শহীদ সৈয়দ নজরুল ইসলাম মেকহা</p>
          </div>

          <div>
            <div className="w-36 border-b border-slate-600 mx-auto pb-1 mb-1"></div>
            <p className="font-bold">উপ-পরিচালক</p>
            <p className="text-[10px] text-slate-600">ও সদস্য সচিব, বরাদ্দ কমিটি</p>
            <p className="text-[10px] text-slate-500">শহীদ সৈয়দ নজরুল ইসলাম মেকহা</p>
          </div>

          <div>
            <div className="w-40 border-b border-slate-800 mx-auto pb-1 mb-1 font-bold">
              {settings.directorNameBn}
            </div>
            <p className="font-bold">{settings.directorDesignationBn}</p>
            <p className="text-[10px] text-slate-600">ও সভাপতি, বাসা বরাদ্দ কমিটি</p>
            <p className="text-[10px] text-slate-500">শহীদ সৈয়দ নজরুল ইসলাম মেকহা</p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-8 text-center text-[10px] text-slate-500 font-medium">
          এই প্রতিবেদনটি শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ এর সেন্ট্রাল ডাটাবেজ সিস্টেম হতে স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত।
        </div>
      </div>
    </div>
  );
};
