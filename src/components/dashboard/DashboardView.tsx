import React from 'react';
import {
  Building2,
  DoorClosed,
  Users2,
  KeyRound,
  FileX2,
  AlertTriangle,
  FileCheck2,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Wrench,
  ShieldAlert,
  Printer
} from 'lucide-react';
import type { SystemStats, Building, Room, CancellationRequest, AuditLog } from '../../types/index.ts';
import { toBanglaNumber, formatBanglaDate } from '../../logic/rules.ts';
import { Badge } from '../common/Badge.tsx';

interface DashboardViewProps {
  stats: SystemStats;
  buildings: Building[];
  rooms: Room[];
  pendingCancellations: CancellationRequest[];
  recentLogs: AuditLog[];
  onNavigate: (tab: any) => void;
  onSelectBuilding?: (buildingId: string) => void;
  onOpenNewAllocation: () => void;
  onOpenNewResident: () => void;
  onOpenNewCancellation: () => void;
  onLoadSampleData: () => void;
  hasNoData: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  buildings,
  rooms,
  pendingCancellations,
  recentLogs,
  onNavigate,
  onSelectBuilding,
  onOpenNewAllocation,
  onOpenNewResident,
  onOpenNewCancellation,
  onLoadSampleData,
  hasNoData
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Controls */}
      <div className="bg-gradient-to-r from-[#0f2b48] to-[#184570] text-white rounded-xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded-md border border-teal-800">
              প্রশাসনিক ড্যাশবোর্ড ওভারভিউ
            </span>
            <h1 className="text-xl md:text-2xl font-bold mt-2 text-white">
              হাসপাতাল আবাসিক বরাদ্দ ও কক্ষ পর্যবেক্ষণ পদ্ধতি
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ। সকল আবাসিক ভবন, ডরমেটরী কক্ষ, বরাদ্দ আদেশ এবং বরাদ্দ বাতিল কার্যক্রমের সামগ্রিক বিবরণী।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasNoData && (
              <button
                onClick={onLoadSampleData}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                <span>নমুনা প্রাতিষ্ঠানিক ডাটা লোড</span>
              </button>
            )}

            <button
              onClick={onOpenNewAllocation}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>নতুন বরাদ্দ প্রদান</span>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg border border-white/20 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>রিপোর্ট ও প্রিন্ট</span>
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Buildings */}
        <div 
          onClick={() => onNavigate('residential')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">মোট আবাসিক ভবন</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{toBanglaNumber(stats.totalBuildings)}</span>
            <span className="text-xs text-slate-500">টি আবাসিক ভবন</span>
          </div>
          <p className="text-[11px] text-teal-600 mt-2 flex items-center gap-1 font-medium">
            আবাসিক ব্যবস্থাপনা দেখুন <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* Total Rooms & Vacancy */}
        <div 
          onClick={() => onNavigate('residential')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">মোট কক্ষ ইনভেন্টরি</span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DoorClosed className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{toBanglaNumber(stats.totalRooms)}</span>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
              ফাঁকা: {toBanglaNumber(stats.vacantRooms)} টি
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-2 font-semibold flex items-center gap-2">
            <span>বরাদ্দকৃত: {toBanglaNumber(stats.occupiedRooms)} টি</span>
            <span className="text-slate-300">|</span>
            <span>মেরামতাধীন: {toBanglaNumber(stats.maintenanceRooms)} টি</span>
          </div>
        </div>

        {/* Active Allocations */}
        <div 
          onClick={() => onNavigate('residential')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">সক্রিয় বাসা বরাদ্দ</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{toBanglaNumber(stats.activeAllocations)}</span>
            <span className="text-xs text-slate-400">টি কোয়ার্টার/কক্ষ</span>
          </div>
          <p className="text-[11px] text-indigo-600 mt-2 flex items-center gap-1 font-medium">
            আবাসিক ভবন চার্ট দেখুন <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* Pending Cancellations */}
        <div 
          onClick={() => onNavigate('cancellations')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">বাতিল আবেদন (অপেক্ষমাণ)</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileX2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{toBanglaNumber(stats.pendingCancellations)}</span>
            <span className="text-xs text-slate-400">অনুমোদনের বাকি</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1 font-medium">
            {stats.pendingCancellations > 0 ? 'দ্রুত নিষ্পত্তি করুন' : 'সকল আবেদন হালনাগাদ'} <ArrowRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* Building-wise Occupancy & Institutional Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Institutional Buildings Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">প্রাতিষ্ঠানিক ভবনভিত্তিক ধারণক্ষমতা ও অবস্থান</h2>
              <p className="text-xs text-slate-500 mt-0.5">হাসপাতালের নির্ধারিত ৩টি প্রধান আবাসিক ভবনের পরিসংখ্যান</p>
            </div>
            <button
              onClick={() => onNavigate('residential')}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              সকল ভবন <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {buildings.map((building) => {
              const bRooms = rooms.filter(r => r.buildingId === building.id);
              const bOccupied = bRooms.filter(r => r.status === 'OCCUPIED' || r.status === 'PARTIAL').length;
              const bVacant = bRooms.filter(r => r.status === 'VACANT').length;
              const bMaintenance = bRooms.filter(r => r.status === 'MAINTENANCE').length;
              const total = bRooms.length;
              const percent = total > 0 ? Math.round((bOccupied / total) * 100) : 0;

              return (
                <div
                  key={building.id}
                  onClick={() => {
                    if (onSelectBuilding) onSelectBuilding(building.id);
                    onNavigate('residential');
                  }}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-teal-600/50 cursor-pointer transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{building.nameBn}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                          {building.code}
                        </span>
                        {building.maintenanceStatus === 'UNDER_MAINTENANCE' && (
                          <Badge variant="warning" size="sm">মেরামত চলছে</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{building.description || building.address}</p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="text-slate-600">মোট: <strong className="text-slate-900">{toBanglaNumber(total)}</strong></span>
                      <span className="text-emerald-700">ফাঁকা: <strong>{toBanglaNumber(bVacant)}</strong></span>
                      <span className="text-blue-700">বরাদ্দ: <strong>{toBanglaNumber(bOccupied)}</strong></span>
                      {bMaintenance > 0 && <span className="text-amber-700">মেরামত: <strong>{toBanglaNumber(bMaintenance)}</strong></span>}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium mb-1">
                      <span>বাসিন্দা অকুপেন্সি হার</span>
                      <span className="font-bold text-slate-800">{toBanglaNumber(percent)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${percent}%` }}
                        className="bg-teal-600 h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Important Alerts & Missing Documents */}
        <div className="space-y-6">
          {/* Missing Document or Urgent Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>জরুরি সতর্কতা ও নোটিশ</span>
            </h2>

            <div className="mt-4 space-y-3">
              {stats.pendingCancellations > 0 ? (
                <div 
                  onClick={() => onNavigate('cancellations')}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs cursor-pointer hover:bg-amber-100/70 transition-colors"
                >
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>{toBanglaNumber(stats.pendingCancellations)} টি বরাদ্দ বাতিলের আবেদন অপেক্ষমাণ</span>
                  </p>
                  <p className="text-amber-800 mt-1">অনুমোদনকারী কর্মকর্তার চূড়ান্ত সিদ্ধান্তের অপেক্ষায় রয়েছে।</p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                  <p className="font-semibold flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>কোনো অপেক্ষমাণ বাতিল আবেদন নেই।</span>
                  </p>
                </div>
              )}

              {stats.missingDocuments > 0 ? (
                <div 
                  onClick={() => onNavigate('allocations')}
                  className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs cursor-pointer hover:bg-rose-100/70 transition-colors"
                >
                  <p className="font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                    <span>{toBanglaNumber(stats.missingDocuments)} টি বরাদ্দে সরকারি আদেশ নথি সংযুক্ত নেই</span>
                  </p>
                  <p className="text-rose-800 mt-1">অনুগ্রহ করে স্বাক্ষরিত অফিস কপি দ্রুত আপলোড করুন।</p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                  <p className="font-semibold">সকল বরাদ্দে অফিস আদেশ ও নথিপত্র হালনাগাদ রয়েছে।</p>
                </div>
              )}

              {stats.maintenanceRooms > 0 && (
                <div 
                  onClick={() => onNavigate('rooms')}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-600" />
                    <span>{toBanglaNumber(stats.maintenanceRooms)} টি কক্ষ বর্তমানে মেরামত কাজের জন্য বন্ধ</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">দ্রুত প্রশাসনিক লিংক</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={onOpenNewResident}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 font-semibold text-slate-700 text-left transition-colors flex items-center gap-2"
              >
                <Users2 className="w-4 h-4 text-teal-600" />
                <span>নতুন বাসিন্দা এন্ট্রি</span>
              </button>

              <button
                onClick={onOpenNewAllocation}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 font-semibold text-slate-700 text-left transition-colors flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>বাসা বরাদ্দ ফরম</span>
              </button>

              <button
                onClick={onOpenNewCancellation}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 font-semibold text-slate-700 text-left transition-colors flex items-center gap-2"
              >
                <FileX2 className="w-4 h-4 text-amber-600" />
                <span>বরাদ্দ বাতিল আবেদন</span>
              </button>

              <button
                onClick={() => onNavigate('reports')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 font-semibold text-slate-700 text-left transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>১৩টি সরকারি রিপোর্ট</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Administrative Audit Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">সাম্প্রতিক প্রশাসনিক কার্যক্রম (Audit Log)</h2>
            <p className="text-xs text-slate-500 mt-0.5">সিস্টেমে সংরক্ষিত সাম্প্রতিক অপরিবর্তনীয় অডিট লগ</p>
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            সম্পূর্ণ অডিট লগ <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-3 overflow-x-auto">
          {recentLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">কোনো সাম্প্রতিক লগ রেকর্ড পাওয়া যায়নি।</p>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">সময় ও তারিখ</th>
                  <th className="py-2.5 px-3">কর্মকর্তা / ইউজার</th>
                  <th className="py-2.5 px-3">কার্যক্রম (Action)</th>
                  <th className="py-2.5 px-3">মডিউল</th>
                  <th className="py-2.5 px-3">বিস্তারিত বিবরণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs.slice(0, 6).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString('bn-BD')} • {formatBanglaDate(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {log.actorName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        log.action === 'APPROVE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        log.action === 'REJECT' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">
                      {log.entityType}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
