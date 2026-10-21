import React, { useState } from 'react';
import { History, Search, Filter, ShieldCheck, Eye, Terminal } from 'lucide-react';
import type { AuditLog } from '../../types/index.ts';
import { formatBanglaDate, toBanglaNumber } from '../../logic/rules.ts';
import { Modal } from '../common/Modal.tsx';

interface AuditLogsViewProps {
  auditLogs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ auditLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [viewingLog, setViewingLog] = useState<AuditLog | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
    if (selectedEntity !== 'ALL' && log.entityType !== selectedEntity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchActor = log.actorName.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchId = log.entityId.toLowerCase().includes(q);
      if (!matchActor && !matchDetails && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-700" />
            <span>অপরিবর্তনীয় অডিট লগ ট্রেইল (Security & System Audit Trail)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            সিস্টেমের সকল প্রশাসনিক সিদ্ধান্ত, বাসা বরাদ্দ, বাতিলকরণ, পরিবর্তন এবং নিরাপত্তা ইভেন্টের পুঙ্খানুপুঙ্খ রেকর্ড।
          </p>
        </div>

        <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold">
          মোট সংরক্ষিত অডিট এন্ট্রি: {toBanglaNumber(auditLogs.length)} টি
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>ফিল্টার:</span>
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল অ্যাকশন</option>
            <option value="CREATE">CREATE (নতুন রেকর্ড)</option>
            <option value="UPDATE">UPDATE (হালনাগাদ)</option>
            <option value="APPROVE">APPROVE (অনুমোদন)</option>
            <option value="REJECT">REJECT (প্রত্যাখ্যান)</option>
            <option value="DELETE">DELETE (মুছে ফেলা)</option>
            <option value="LOGIN">LOGIN (লগইন)</option>
            <option value="LOGOUT">LOGOUT (লগআউট)</option>
            <option value="BACKUP">BACKUP (ব্যাকআপ)</option>
            <option value="RESTORE">RESTORE (রিস্টোর)</option>
          </select>

          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল মডিউল / সত্তা</option>
            <option value="ALLOCATION">ALLOCATION (বাসা বরাদ্দ)</option>
            <option value="CANCELLATION">CANCELLATION (বরাদ্দ বাতিল)</option>
            <option value="ROOM">ROOM (কক্ষ)</option>
            <option value="BUILDING">BUILDING (ভবন)</option>
            <option value="RESIDENT">RESIDENT (বাসিন্দা)</option>
            <option value="USER">USER (ব্যবহারকারী)</option>
            <option value="DOCUMENT">DOCUMENT (নথি)</option>
            <option value="SETTINGS">SETTINGS (সেটিংস)</option>
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ইউজার, বিবরণ বা আইডি দিয়ে খুঁজুন..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs focus:bg-white"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">সময় ও তারিখ</th>
                <th className="py-3 px-4">কর্মকর্তা / ইউজার</th>
                <th className="py-3 px-4">পদমর্যাদা</th>
                <th className="py-3 px-4">অ্যাকশন</th>
                <th className="py-3 px-4">মডিউল</th>
                <th className="py-3 px-4">বিবরণ (Details)</th>
                <th className="py-3 px-4 text-right">আগে/পরে</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    কোনো অডিট লগ রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {formatBanglaDate(log.timestamp)} • {new Date(log.timestamp).toLocaleTimeString('bn-BD')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.actorName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {log.actorRole}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        log.action === 'APPROVE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        log.action === 'REJECT' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        log.action === 'DELETE' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {(log.beforeData || log.afterData) ? (
                        <button
                          onClick={() => setViewingLog(log)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 inline-flex"
                          title="ডাটা পরিবর্তন স্ন্যাপশট দেখুন"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>স্ন্যাপশট</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Modal */}
      <Modal
        isOpen={Boolean(viewingLog)}
        onClose={() => setViewingLog(null)}
        title="অডিট লগ পরিবর্তন স্ন্যাপশট (Before vs After Data)"
        subtitle={`লগ আইডি: ${viewingLog?.id} • অ্যাকশন: ${viewingLog?.action} • মডিউল: ${viewingLog?.entityType}`}
        maxWidth="xl"
      >
        {viewingLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 font-sans">পূর্ববর্তী ডাটা (Before Mutation):</label>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto max-h-[300px] text-[11px]">
                  {viewingLog.beforeData ? JSON.stringify(JSON.parse(viewingLog.beforeData), null, 2) : 'কোনো পূর্ববর্তী ডাটা নেই (নতুন এন্ট্রি)'}
                </pre>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 font-sans">হালনাগাদ পরবর্তী ডাটা (After Mutation):</label>
                <pre className="p-3 bg-slate-900 text-teal-300 rounded-lg overflow-x-auto max-h-[300px] text-[11px]">
                  {viewingLog.afterData ? JSON.stringify(JSON.parse(viewingLog.afterData), null, 2) : 'কোনো পরবর্তী ডাটা নেই (মুছে ফেলা)'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 font-sans">
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="px-4 py-1.5 bg-[#0f2b48] text-white font-bold rounded-lg"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
