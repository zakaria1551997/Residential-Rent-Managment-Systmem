import React, { useState } from 'react';
import { Users2, Plus, Edit, Search, Phone, UserCheck, Eye, Printer, MapPin, Building, AlertCircle, Download } from 'lucide-react';
import type { Resident, Allocation } from '../../types/index.ts';
import { toBanglaNumber, formatBanglaDate, isValidBangladeshiMobile } from '../../logic/rules.ts';
import { exportElementToPdf, triggerElementPrint } from '../../utils/printPdf.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';

interface ResidentsViewProps {
  residents: Resident[];
  allocations: Allocation[];
  onSaveResident: (resident: Partial<Resident>) => void;
  canManage: boolean;
}

export const ResidentsView: React.FC<ResidentsViewProps> = ({
  residents,
  allocations,
  onSaveResident,
  canManage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Partial<Resident> | null>(null);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const departments = Array.from(new Set(residents.map((r) => r.department))).filter(Boolean);

  const filteredResidents = residents.filter((r) => {
    if (selectedDept !== 'ALL' && r.department !== selectedDept) return false;
    if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.fullName.toLowerCase().includes(q);
      const matchId = (r.residentIdNumber || '').toLowerCase().includes(q);
      const matchEmp = (r.employeeId || '').toLowerCase().includes(q);
      const matchPhone = r.mobileNumber.includes(q);
      const matchDesig = r.designation.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchEmp && !matchPhone && !matchDesig) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setErrorMessage(null);
    setEditingResident({
      fullName: '',
      designation: 'সিনিয়র স্টাফ নার্স',
      department: 'নার্সিং শাখা',
      employeeId: '',
      mobileNumber: '',
      altPhone: '',
      email: '',
      nidNumber: '',
      presentAddress: '',
      permanentAddress: '',
      status: 'ACTIVE',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res: Resident) => {
    setErrorMessage(null);
    setEditingResident(res);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!editingResident?.fullName || !editingResident?.mobileNumber || !editingResident?.permanentAddress) {
      setErrorMessage('বাসিন্দার পূর্ণ নাম, মোবাইল নম্বর এবং স্থায়ী ঠিকানা আবশ্যক।');
      return;
    }

    if (!isValidBangladeshiMobile(editingResident.mobileNumber)) {
      setErrorMessage('অনুগ্রহ করে সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর প্রদান করুন (যেমন: 017xxxxxxxx)।');
      return;
    }

    try {
      onSaveResident(editingResident);
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'বাসিন্দা সংরক্ষণ ব্যর্থ হয়েছে।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users2 className="w-5 h-5 text-teal-700" />
            <span>বাসিন্দা প্রোফাইল ব্যবস্থাপনা (Hospital Residents Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতালের চিকিৎসক, নার্স, কর্মকর্তা ও কর্মচারীদের আবাসিক নিবন্ধন প্রোফাইল।
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন বাসিন্দা নিবন্ধন</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল বিভাগ / শাখা ({departments.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল স্ট্যাটাস</option>
            <option value="ACTIVE">সক্রিয় বাসিন্দা (Active)</option>
            <option value="FORMER">সাবেক বাসিন্দা (Former)</option>
            <option value="INACTIVE">নিষ্ক্রিয়</option>
          </select>
        </div>

        {/* Global / Local search query */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, মোবাইল, পরিচিতি নং..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs focus:bg-white"
          />
        </div>
      </div>

      {/* Residents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">আইডি নম্বর</th>
                <th className="py-3 px-4">বাসিন্দার পূর্ণ নাম</th>
                <th className="py-3 px-4">পদবী ও বিভাগ</th>
                <th className="py-3 px-4">পরিচিতি নং (PDS/Emp ID)</th>
                <th className="py-3 px-4">মোবাইল নম্বর</th>
                <th className="py-3 px-4">বর্তমান বরাদ্দ কোয়ার্টার</th>
                <th className="py-3 px-4">অবস্থা</th>
                <th className="py-3 px-4 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    কোনো বাসিন্দার রেকর্ড পাওয়া যায়নি। &apos;নতুন বাসিন্দা নিবন্ধন&apos; বোতাম চাপুন।
                  </td>
                </tr>
              ) : (
                filteredResidents.map((res) => {
                  const currentAlloc = allocations.find(
                    (a) => a.residentId === res.id && a.status === 'ACTIVE'
                  );

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {res.residentIdNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {res.fullName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{res.designation}</div>
                        <div className="text-[11px] text-slate-500">{res.department}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {res.employeeId || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800 whitespace-nowrap">
                        {toBanglaNumber(res.mobileNumber)}
                      </td>
                      <td className="py-3 px-4">
                        {currentAlloc ? (
                          <div className="text-teal-800 bg-teal-50/80 px-2 py-0.5 rounded border border-teal-200 font-medium text-[11px]">
                            {currentAlloc.buildingNameBn} • কক্ষ {currentAlloc.roomNumber}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">বরাদ্দ নেই</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {res.status === 'ACTIVE' ? (
                          <Badge variant="success" size="sm">সক্রিয়</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">সাবেক</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingResident(res)}
                            title="প্রোফাইল বিবরণ ও বরাদ্দ ইতিহাস"
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canManage && (
                            <button
                              onClick={() => handleOpenEdit(res)}
                              title="প্রোফাইল সম্পাদনা"
                              className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>মোট বাসিন্দা: <strong>{toBanglaNumber(filteredResidents.length)}</strong> জন</span>
          <span>সক্রিয় কোয়ার্টারবাসী: <strong>{toBanglaNumber(filteredResidents.filter(r => allocations.some(a => a.residentId === r.id && a.status === 'ACTIVE')).length)}</strong> জন</span>
        </div>
      </div>

      {/* Add / Edit Resident Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingResident?.id ? 'বাসিন্দা তথ্য হালনাগাদ' : 'নতুন বাসিন্দা নিবন্ধন ফরম'}
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">বাসিন্দার পূর্ণ নাম *</label>
              <input
                type="text"
                required
                value={editingResident?.fullName || ''}
                onChange={(e) => setEditingResident({ ...editingResident, fullName: e.target.value })}
                placeholder="যেমন: মোছাঃ নাসরীন আক্তার"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">পদবী (Designation) *</label>
              <input
                type="text"
                required
                value={editingResident?.designation || ''}
                onChange={(e) => setEditingResident({ ...editingResident, designation: e.target.value })}
                placeholder="যেমন: সিনিয়র স্টাফ নার্স, সহকারী সার্জন"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">বিভাগ বা কর্মস্থল *</label>
              <input
                type="text"
                required
                value={editingResident?.department || ''}
                onChange={(e) => setEditingResident({ ...editingResident, department: e.target.value })}
                placeholder="যেমন: নার্সিং শাখা, কার্ডিওলজি, প্রশাসনিক শাখা"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">সরকারি পরিচিতি নং (PDS/Employee ID)</label>
              <input
                type="text"
                value={editingResident?.employeeId || ''}
                onChange={(e) => setEditingResident({ ...editingResident, employeeId: e.target.value })}
                placeholder="যেমন: PDS-884129"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর (১১ ডিজিট) *</label>
              <input
                type="tel"
                required
                value={editingResident?.mobileNumber || ''}
                onChange={(e) => setEditingResident({ ...editingResident, mobileNumber: e.target.value })}
                placeholder="যেমন: 01712345678"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">বিকল্প যোগাযোগ নম্বর / ইমেইল</label>
              <input
                type="text"
                value={editingResident?.altPhone || ''}
                onChange={(e) => setEditingResident({ ...editingResident, altPhone: e.target.value })}
                placeholder="বিকল্প ফোন নম্বর বা ইমেইল"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">জাতীয় পরিচয়পত্র নম্বর (NID)</label>
              <input
                type="text"
                value={editingResident?.nidNumber || ''}
                onChange={(e) => setEditingResident({ ...editingResident, nidNumber: e.target.value })}
                placeholder="১০ বা ১৭ ডিজিটের এনআইডি"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">রেকর্ড স্ট্যাটাস</label>
              <select
                value={editingResident?.status || 'ACTIVE'}
                onChange={(e) => setEditingResident({ ...editingResident, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              >
                <option value="ACTIVE">সক্রিয় বাসিন্দা (Active)</option>
                <option value="FORMER">সাবেক বাসিন্দা (Former)</option>
                <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">স্থায়ী ঠিকানা *</label>
            <textarea
              rows={2}
              required
              value={editingResident?.permanentAddress || ''}
              onChange={(e) => setEditingResident({ ...editingResident, permanentAddress: e.target.value })}
              placeholder="গ্রাম/রাস্তা, ডাকঘর, উপজেলা, জেলা..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">প্রশাসনিক মন্তব্য</label>
            <input
              type="text"
              value={editingResident?.remarks || ''}
              onChange={(e) => setEditingResident({ ...editingResident, remarks: e.target.value })}
              placeholder="অতিরিক্ত কোনো তথ্য বা শর্ত..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-xs"
            >
              বাসিন্দা তথ্য সংরক্ষণ
            </button>
          </div>
        </form>
      </Modal>

      {/* View Resident Profile & Allocation History Modal */}
      <Modal
        isOpen={Boolean(viewingResident)}
        onClose={() => setViewingResident(null)}
        title="বাসিন্দা পরিচিতি ও বাসা বরাদ্দের ইতিহাস"
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
        maxWidth="lg"
      >
        {viewingResident && (
          <div id="resident-profile-printable" className="space-y-5 text-xs bg-white">
            {/* Resident Card Top */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-900 text-teal-200 font-bold">
                  {viewingResident.residentIdNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{viewingResident.fullName}</h3>
                <p className="text-slate-600 font-medium">{viewingResident.designation} • {viewingResident.department}</p>
                <p className="text-slate-500 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span className="font-num-clear">মোবাইল: {toBanglaNumber(viewingResident.mobileNumber)}</span>
                </p>
              </div>

              <div className="text-right sm:text-right">
                <span className="block text-[11px] text-slate-400">নিবন্ধন তারিখ</span>
                <span className="font-semibold text-slate-700">{formatBanglaDate(viewingResident.createdAt)}</span>
              </div>
            </div>

            {/* Resident Details Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div>
                <span className="text-slate-400 block">সরকারি পরিচিতি নং (PDS):</span>
                <span className="font-mono font-bold text-slate-800">{viewingResident.employeeId || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">এনআইডি নম্বর:</span>
                <span className="font-mono font-bold text-slate-800">{viewingResident.nidNumber || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">স্থায়ী ঠিকানা:</span>
                <span className="font-medium text-slate-800">{viewingResident.permanentAddress}</span>
              </div>
            </div>

            {/* Allocation History */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-teal-700" />
                <span>বরাদ্দের ইতিহাস ও বর্তমান স্থিতি</span>
              </h4>

              {allocations.filter(a => a.residentId === viewingResident.id).length === 0 ? (
                <p className="text-slate-400 p-4 text-center bg-slate-50 rounded-lg border border-slate-200">
                  এই বাসিন্দার কোনো অতীত বা বর্তমান বাসা বরাদ্দের রেকর্ড নেই।
                </p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-2 px-3">বরাদ্দ আইডি</th>
                        <th className="py-2 px-3">ভবন ও কক্ষ</th>
                        <th className="py-2 px-3">স্মারক নং</th>
                        <th className="py-2 px-3">মেয়াদকাল</th>
                        <th className="py-2 px-3">অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allocations
                        .filter(a => a.residentId === viewingResident.id)
                        .map(alloc => (
                          <tr key={alloc.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-semibold text-slate-900">{alloc.allocationNumber}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{alloc.buildingNameBn} (কক্ষ {alloc.roomNumber})</td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{alloc.officialOrderNo}</td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              {formatBanglaDate(alloc.startDate)} হতে {alloc.expectedEndDate ? formatBanglaDate(alloc.expectedEndDate) : 'অনির্দিষ্ট'}
                            </td>
                            <td className="py-2 px-3">
                              {alloc.status === 'ACTIVE' ? (
                                <Badge variant="success" size="sm">সক্রিয়</Badge>
                              ) : (
                                <Badge variant="neutral" size="sm">বাতিলকৃত</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200 no-print">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('resident-profile-printable');
                  exportElementToPdf(el, {
                    titleBn: viewingResident.fullName,
                    suffix: 'বাসিন্দা_প্রোফাইল',
                    orientation: 'portrait',
                    fitSinglePage: true
                  });
                }}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>পিডিএফ সংরক্ষণ (.pdf)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('resident-profile-printable');
                  triggerElementPrint(el, {
                    titleBn: viewingResident.fullName,
                    suffix: 'বাসিন্দা_প্রোফাইল',
                    orientation: 'portrait',
                    fitSinglePage: true
                  });
                }}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট করুন</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingResident(null)}
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
