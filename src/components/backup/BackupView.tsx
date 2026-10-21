import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck,
  RotateCcw,
  ShieldCheck,
  Terminal,
  FileText
} from 'lucide-react';
import type { BackupMetadata } from '../../types/index.ts';
import { toBanglaNumber, formatBanglaDate } from '../../logic/rules.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';

interface BackupViewProps {
  backupHistory: BackupMetadata[];
  onCreateBackup: () => { jsonString: string; metadata: BackupMetadata };
  onRestoreBackup: (jsonContent: string) => { success: boolean; message: string; recordCount: number };
  canManage: boolean;
}

export const BackupView: React.FC<BackupViewProps> = ({
  backupHistory,
  onCreateBackup,
  onRestoreBackup,
  canManage
}) => {
  const [restoreJson, setRestoreJson] = useState<string | null>(null);
  const [restoreStats, setRestoreStats] = useState<{ buildings?: any[]; rooms?: any[]; residents?: any[]; allocations?: any[] } | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleManualBackup = () => {
    try {
      const { jsonString, metadata } = onCreateBackup();
      // Trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = metadata.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: `সফলভাবে পূর্ণাঙ্গ ডাটাবেজ ব্যাকআপ সম্পন্ন হয়েছে (${metadata.fileName}, মোট রেকর্ড: ${toBanglaNumber(metadata.totalRecords)})।`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'ব্যাকআপ প্রক্রিয়া ব্যর্থ হয়েছে: ' + err.message });
    }
  };

  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = reader.result as string;
          const parsed = JSON.parse(content);
          if (!parsed.buildings || !parsed.rooms) {
            throw new Error('অবৈধ ব্যাকআপ ফাইল। প্রয়োজনীয় প্রাতিষ্ঠানিক ডাটা অনুপস্থিত।');
          }
          setRestoreJson(content);
          setRestoreStats({
            buildings: parsed.buildings,
            rooms: parsed.rooms,
            residents: parsed.residents,
            allocations: parsed.allocations
          });
          setIsRestoreModalOpen(true);
        } catch (err: any) {
          alert('ফাইলটি সঠিক ব্যাকআপ JSON নয়: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmRestore = () => {
    if (!restoreJson) return;
    try {
      const result = onRestoreBackup(restoreJson);
      setIsRestoreModalOpen(false);
      setRestoreJson(null);
      setRestoreStats(null);
      setStatusMessage({
        type: 'success',
        text: `${result.message} (মোট ${toBanglaNumber(result.recordCount)} টি রেকর্ড প্রতিস্থাপিত হয়েছে)`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-700" />
            <span>সেন্ট্রাল ব্যাকআপ ও রিস্টোর ব্যবস্থাপনা (Backup & Disaster Recovery)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতালের ডাটাবেজ স্ন্যাপশট, অখণ্ডতা যাচাই এবং নিরাপদ রিকভারি।
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-3">
            <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center gap-2 cursor-pointer shrink-0">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>ব্যাকআপ ফাইল হতে রিস্টোর</span>
              <input type="file" accept=".json" onChange={handleFileSelectForRestore} className="hidden" />
            </label>

            <button
              onClick={handleManualBackup}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>তাৎক্ষণিক সিস্টেম ব্যাকআপ গ্রহণ</span>
            </button>
          </div>
        )}
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
          statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Backup Instructions & Architecture Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>ব্যাকআপ নিরাপত্তা নীতি</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            প্রত্যেক ব্যাকআপ স্ন্যাপশটে ৩টি আবাসিক ভবন, সকল কক্ষ ইনভেন্টরি, বাসিন্দা প্রোফাইল, সক্রিয় বরাদ্দ, বাতিলকরণ আদেশ এবং অডিট ট্রেইল সংরক্ষিত হয়।
          </p>
          <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
            <div>• SHA-256 চেকার দ্বারা ফাইল অখণ্ডতা যাচাই</div>
            <div>• অনুমোদিত সুপার অ্যাডমিন ব্যতীত রিস্টোর নিয়ন্ত্রিত</div>
            <div>• অফলাইন স্টোরেজ ব্যাকআপ রাখার পরামর্শ দেওয়া হয়</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>PostgreSQL সার্ভার ব্যাকআপ কমান্ড</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            হাসপাতালের সেন্ট্রাল লিনাক্স/উইন্ডোজ সার্ভারে সরাসরি স্বয়ংক্রিয় ক্রোন ব্যাকআপ স্ক্রিপ্ট:
          </p>
          <div className="p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded overflow-x-auto">
            <code>pg_dump -U ssnimch_user -d ssnimch_db -F c -b -v -f /backup/ssnimch_$(date +%F).dump</code>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>দুর্যোগ পুনরুদ্ধার ও রিস্টোর (Disaster Recovery)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            সার্ভার হার্ডওয়্যার বা সিস্টেম ক্র্যাশের ক্ষেত্রে সর্বশেষ ব্যাকআপ ফাইলটি আপলোড করলেই কয়েক সেকেন্ডের মধ্যে সম্পূর্ণ ডাটাবেজ পুনরুদ্ধার হয়ে যায়।
          </p>
          <div className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-600">
            রিস্টোরের পূর্বে সর্বদা প্রিভিউতে রেকর্ডের সংখ্যা ও তারিখ দেখে নিন।
          </div>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <span>সংরক্ষিত ব্যাকআপ স্ন্যাপশট হিস্ট্রি</span>
          </h3>
          <span className="text-xs text-slate-500">মোট ব্যাকআপ: {toBanglaNumber(backupHistory.length)} টি</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">ফাইলের নাম</th>
                <th className="py-3 px-4">ব্যাকআপ তৈরির সময়</th>
                <th className="py-3 px-4">আকার (Size)</th>
                <th className="py-3 px-4 text-center">মোট রেকর্ড</th>
                <th className="py-3 px-4">চেকসাম (Checksum)</th>
                <th className="py-3 px-4">ধরন</th>
                <th className="py-3 px-4 text-right">স্থিতি</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backupHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    এখনো কোনো ব্যাকআপ রেকর্ড তৈরি করা হয়নি। উপরের বোতাম চেপে প্রথম ব্যাকআপ নিন।
                  </td>
                </tr>
              ) : (
                backupHistory.map((bak) => (
                  <tr key={bak.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{bak.fileName}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatBanglaDate(bak.createdAt)} • {new Date(bak.createdAt).toLocaleTimeString('bn-BD')}
                    </td>
                    <td className="py-3 px-4 font-mono">{toBanglaNumber(Math.round(bak.fileSize / 1024))} KB</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{toBanglaNumber(bak.totalRecords)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{bak.checksum}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                        {bak.type === 'MANUAL' ? 'ম্যানুয়াল' : 'তফসিলি'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant="success" size="sm">বৈধ ও অক্ষত</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="ডাটাবেজ রিস্টোর নিশ্চিতকরণ (Database Restore Preview)"
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
            <p className="font-bold text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>সতর্কবাণী: রিস্টোর প্রক্রিয়া বর্তমান ডাটা প্রতিস্থাপন করবে!</span>
            </p>
            <p className="leading-relaxed">
              আপনি নিশ্চিত হলে ডাটাবেজ ব্যাকআপ ফাইল থেকে সকল তথ্য পুনরুদ্ধার হবে। অনুগ্রহ করে যাচাই করুন:
            </p>
          </div>

          {restoreStats && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="text-slate-500 block">পুনরুদ্ধারযোগ্য ভবন:</span>
                <span className="font-bold text-slate-900 text-sm">{toBanglaNumber(restoreStats.buildings?.length || 0)} টি</span>
              </div>
              <div>
                <span className="text-slate-500 block">পুনরুদ্ধারযোগ্য কক্ষ:</span>
                <span className="font-bold text-slate-900 text-sm">{toBanglaNumber(restoreStats.rooms?.length || 0)} টি</span>
              </div>
              <div>
                <span className="text-slate-500 block">নিবন্ধিত বাসিন্দা:</span>
                <span className="font-bold text-slate-900 text-sm">{toBanglaNumber(restoreStats.residents?.length || 0)} জন</span>
              </div>
              <div>
                <span className="text-slate-500 block">বরাদ্দ রেকর্ড:</span>
                <span className="font-bold text-slate-900 text-sm">{toBanglaNumber(restoreStats.allocations?.length || 0)} টি</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleConfirmRestore}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-xs"
            >
              হ্যাঁ, ডাটাবেজ রিস্টোর সম্পন্ন করুন
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
