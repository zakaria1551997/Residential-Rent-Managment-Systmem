import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, ShieldCheck, Printer, Building, FileCheck2 } from 'lucide-react';
import type { AppSettings } from '../../types/index.ts';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  canManage: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  canManage
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-700" />
            <span>প্রাতিষ্ঠানিক সেটিংস ও ব্র্যান্ডিং (Institutional Branding & Configuration)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতালের সরকারি শিরোনাম, রিপোর্ট হেডার, স্বাক্ষরকারী এবং কাজের নীতি নির্ধারণ।
          </p>
        </div>

        {canManage && (
          <button
            type="submit"
            form="settings-form"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>সেটিংস সংরক্ষণ করুন</span>
          </button>
        )}
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>প্রাতিষ্ঠানিক সেটিংস সফলভাবে সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা হয়েছে।</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <form id="settings-form" onSubmit={handleSubmit} className="space-y-5 text-xs">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-600" />
              <span>হাসপাতাল শিরোনাম ও যোগাযোগের বিবরণ</span>
            </h3>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">হাসপাতালের আনুষ্ঠানিক নাম (বাংলা) *</label>
              <input
                type="text"
                required
                disabled={!canManage}
                value={formData.hospitalNameBn}
                onChange={(e) => setFormData({ ...formData, hospitalNameBn: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">হাসপাতালের নাম (English)</label>
              <input
                type="text"
                disabled={!canManage}
                value={formData.hospitalNameEn}
                onChange={(e) => setFormData({ ...formData, hospitalNameEn: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">মন্ত্রণালয় ও বিভাগের নাম *</label>
                <input
                  type="text"
                  required
                  disabled={!canManage}
                  value={formData.ministryNameBn}
                  onChange={(e) => setFormData({ ...formData, ministryNameBn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">আবাসিক প্রশাসন উপ-শিরোনাম *</label>
                <input
                  type="text"
                  required
                  disabled={!canManage}
                  value={formData.subTitleBn}
                  onChange={(e) => setFormData({ ...formData, subTitleBn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">হাসপাতালের প্রাতিষ্ঠানিক ঠিকানা</label>
              <input
                type="text"
                disabled={!canManage}
                value={formData.addressBn}
                onChange={(e) => setFormData({ ...formData, addressBn: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">অফিসিয়াল যোগাযোগ ফোন</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">অফিসিয়াল ইমেইল</label>
                <input
                  type="email"
                  disabled={!canManage}
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
                />
              </div>
            </div>

            <h3 className="font-bold text-slate-900 text-sm pt-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-teal-600" />
              <span>অনুমোদনকারী কর্মকর্তা ও নীতিমালা</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">পরিচালক কর্মকর্তার নাম (বাংলা)</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formData.directorNameBn}
                  onChange={(e) => setFormData({ ...formData, directorNameBn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">পদবী ও মর্যাদা</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formData.directorDesignationBn}
                  onChange={(e) => setFormData({ ...formData, directorDesignationBn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 text-slate-800 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={formData.approvalRequiredForAllocation}
                  onChange={(e) => setFormData({ ...formData, approvalRequiredForAllocation: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <span>বাসা বরাদ্দে কমিটির আনুষ্ঠানিক অনুমোদন বাধ্যতামূলক</span>
              </label>

              <label className="flex items-center gap-2 text-slate-800 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={formData.approvalRequiredForCancellation}
                  onChange={(e) => setFormData({ ...formData, approvalRequiredForCancellation: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <span>বাসা বরাদ্দ বাতিলের জন্য অনুমোদনকারী কর্মকর্তার স্বাক্ষর বাধ্যতামূলক</span>
              </label>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Live Header Print Preview */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <Printer className="w-4 h-4 text-teal-600" />
              <span>লাইভ অফিসিয়াল প্রিন্ট হেডার প্রিভিউ</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">
              যেকোনো অফিশিয়াল আদেশ ও ১৩টি রিপোর্টে এই শিরোনামটি দৃশ্যমান হবে:
            </p>

            <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg text-center space-y-1 text-slate-900">
              <p className="text-[10px] font-bold">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</p>
              <p className="text-[9px] text-slate-600">{formData.ministryNameBn}</p>
              <h4 className="text-xs font-extrabold text-[#0f2b48] mt-1">{formData.hospitalNameBn}</h4>
              <p className="text-[10px] text-slate-500">{formData.addressBn}</p>
              <span className="inline-block text-[9px] bg-white border border-slate-300 px-2 py-0.5 rounded text-teal-800 font-bold mt-1">
                {formData.subTitleBn}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-2">
            <h4 className="font-bold text-slate-900">স্বাক্ষরকারী সিলমোহর বিবরণ</h4>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-1">
              <p className="font-bold text-slate-800">{formData.directorNameBn}</p>
              <p className="text-[11px] text-slate-600">{formData.directorDesignationBn}</p>
              <p className="text-[10px] text-slate-400">ও সভাপতি, বাসা বরাদ্দ কমিটি</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
