import React, { useState, useRef } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  Filter,
  FileText,
  Printer,
  Calendar,
  Building2,
  DoorClosed,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Download
} from 'lucide-react';
import type { Allocation, Building, Room, Resident, DocumentRecord } from '../../types/index.ts';
import { toBanglaNumber, formatBanglaDate } from '../../logic/rules.ts';
import { exportElementToPdf, triggerElementPrint } from '../../utils/printPdf.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';

interface AllocationsViewProps {
  allocations: Allocation[];
  buildings: Building[];
  rooms: Room[];
  residents: Resident[];
  documents: DocumentRecord[];
  onCreateAllocation: (data: any) => void;
  canManage: boolean;
  onOpenDocumentModal: (alloc: Allocation) => void;
}

export const AllocationsView: React.FC<AllocationsViewProps> = ({
  allocations,
  buildings,
  rooms,
  residents,
  documents,
  onCreateAllocation,
  canManage,
  onOpenDocumentModal
}) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Allocation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [residentId, setResidentId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [officialOrderNo, setOfficialOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [remarks, setRemarks] = useState('');

  // Eligible rooms based on selected building
  const availableRooms = rooms.filter(
    (r) =>
      r.buildingId === buildingId &&
      r.status !== 'MAINTENANCE' &&
      r.currentOccupancy < r.capacity
  );

  const selectedRoomObj = rooms.find((r) => r.id === roomId);

  const handleOpenAdd = () => {
    setErrorMessage(null);
    setResidentId(residents[0]?.id || '');
    const firstBld = buildings[0]?.id || '';
    setBuildingId(firstBld);
    const bRooms = rooms.filter((r) => r.buildingId === firstBld && r.currentOccupancy < r.capacity && r.status !== 'MAINTENANCE');
    const firstRoom = bRooms[0];
    setRoomId(firstRoom?.id || '');
    setMonthlyRent(firstRoom?.monthlyRent || 1500);
    const currentYear = new Date().getFullYear();
    setOfficialOrderNo(`স্মারক নং-স্বা/শৈসনইমেকহা/${currentYear}/${toBanglaNumber(allocations.length + 10)}`);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setExpectedEndDate('');
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleBuildingChange = (bId: string) => {
    setBuildingId(bId);
    const bRooms = rooms.filter((r) => r.buildingId === bId && r.currentOccupancy < r.capacity && r.status !== 'MAINTENANCE');
    const firstRoom = bRooms[0];
    setRoomId(firstRoom?.id || '');
    setMonthlyRent(firstRoom?.monthlyRent || 0);
  };

  const handleRoomChange = (rId: string) => {
    setRoomId(rId);
    const rm = rooms.find((r) => r.id === rId);
    if (rm) {
      setMonthlyRent(rm.monthlyRent);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!residentId || !buildingId || !roomId || !officialOrderNo || !orderDate || !startDate) {
      setErrorMessage('অনুগ্রহ করে সকল আবশ্যকীয় তথ্য সঠিকভাবে পূরণ করুন।');
      return;
    }

    try {
      onCreateAllocation({
        residentId,
        buildingId,
        roomId,
        officialOrderNo,
        orderDate,
        startDate,
        expectedEndDate: expectedEndDate || undefined,
        monthlyRent: Number(monthlyRent),
        remarks
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'বাসা বরাদ্দ প্রদান ব্যর্থ হয়েছে।');
    }
  };

  const filteredAllocations = allocations.filter((a) => {
    if (selectedBuildingId !== 'ALL' && a.buildingId !== selectedBuildingId) return false;
    if (selectedStatus !== 'ALL' && a.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchAllocNo = a.allocationNumber.toLowerCase().includes(q);
      const matchOrderNo = (a.officialOrderNo || '').toLowerCase().includes(q);
      const matchResident = (a.residentName || '').toLowerCase().includes(q);
      const matchRoom = (a.roomNumber || '').toLowerCase().includes(q);
      if (!matchAllocNo && !matchOrderNo && !matchResident && !matchRoom) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-teal-700" />
            <span>বাসা ও কোয়ার্টার বরাদ্দ ব্যবস্থাপনা (Allocation Lifecycle)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            সরকারি বিধিমালা মোতাবেক কর্মকর্তা ও কর্মচারীদের অনুকূলে বাসা বরাদ্দ প্রদান, অনুমোদন এবং রেজিস্ট্রি।
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন বাসা বরাদ্দ প্রদান</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>ফিল্টার:</span>
          </div>

          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল আবাসিক ভবন</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.nameBn}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল বরাদ্দ অবস্থা</option>
            <option value="ACTIVE">সক্রিয় বরাদ্দ (Active)</option>
            <option value="CANCELLED">বাতিলকৃত (Cancelled)</option>
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="বরাদ্দ নং, স্মারক, বাসিন্দা বা কক্ষ নং..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs focus:bg-white"
          />
        </div>
      </div>

      {/* Allocations Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">বরাদ্দ আইডি</th>
                <th className="py-3 px-4">বাসিন্দার নাম ও পদবী</th>
                <th className="py-3 px-4">ভবন ও কক্ষ নং</th>
                <th className="py-3 px-4">সরকারি স্মারক নং</th>
                <th className="py-3 px-4">বরাদ্দ শুরুর তারিখ</th>
                <th className="py-3 px-4">মাসিক ভাড়া কর্তন</th>
                <th className="py-3 px-4 text-center">নথিপত্র</th>
                <th className="py-3 px-4">অবস্থা</th>
                <th className="py-3 px-4 text-right">অফিস আদেশ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    কোনো বাসা বরাদ্দের রেকর্ড পাওয়া যায়নি। &apos;নতুন বাসা বরাদ্দ প্রদান&apos; বোতাম চাপুন।
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((alloc) => {
                  const hasDoc = alloc.documentIds && alloc.documentIds.length > 0;
                  return (
                    <tr key={alloc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {alloc.allocationNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{alloc.residentName}</div>
                        <div className="text-[11px] text-slate-500">{alloc.residentDesignation}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{alloc.buildingNameBn}</div>
                        <div className="text-[11px] text-teal-800 font-semibold">কক্ষ: {alloc.roomNumber}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {alloc.officialOrderNo}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {formatBanglaDate(alloc.startDate)}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-semibold tabular-nums">
                        ৳ {toBanglaNumber(alloc.monthlyRent)}/-
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onOpenDocumentModal(alloc)}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium ${
                            hasDoc 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>{hasDoc ? 'সংযুক্ত (' + toBanglaNumber(alloc.documentIds.length) + ')' : 'অনুপস্থিত'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {alloc.status === 'ACTIVE' ? (
                          <Badge variant="success" size="sm">সক্রিয় বরাদ্দ</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">বাতিলকৃত</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setViewingOrder(alloc)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-xs transition-colors flex items-center gap-1 inline-flex"
                          title="অফিস আদেশ পত্র প্রদর্শন ও প্রিন্ট"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>আদেশ পত্র</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>মোট বরাদ্দ রেকর্ড: <strong>{toBanglaNumber(filteredAllocations.length)}</strong> টি</span>
          <span>বর্তমানে সক্রিয় বরাদ্দ: <strong>{toBanglaNumber(filteredAllocations.filter(a => a.status === 'ACTIVE').length)}</strong> টি</span>
        </div>
      </div>

      {/* New Allocation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="নতুন বাসা বরাদ্দ প্রদান ফরম (Official Allocation Order)"
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

          {/* Resident Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">বরাদ্দ প্রাপক বাসিন্দা নির্বাচন *</label>
            <select
              required
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            >
              <option value="">বাসিন্দা বাছাই করুন...</option>
              {residents.map((res) => {
                const hasActiveAlloc = allocations.some(a => a.residentId === res.id && a.status === 'ACTIVE');
                return (
                  <option key={res.id} value={res.id} disabled={hasActiveAlloc}>
                    {res.fullName} ({res.designation} - {res.department}) {hasActiveAlloc ? '[ইতোমধ্যে কোয়ার্টার বরাদ্দকৃত]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Building and Room Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ভবন নির্বাচন *</label>
              <select
                required
                value={buildingId}
                onChange={(e) => handleBuildingChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameBn} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">কক্ষ নির্বাচন (শুধুমাত্র প্রাপ্যতা যোগ্য) *</label>
              <select
                required
                value={roomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              >
                {availableRooms.length === 0 ? (
                  <option value="">এই ভবনে কোনো ফাঁকা কক্ষ নেই</option>
                ) : (
                  availableRooms.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      কক্ষ নং {rm.roomNumber} ({toBanglaNumber(rm.floor)} তলা) - খালি: {toBanglaNumber(rm.capacity - rm.currentOccupancy)} সিট
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Official Order details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">অফিস স্মারক নং (Order Reference No.) *</label>
              <input
                type="text"
                required
                value={officialOrderNo}
                onChange={(e) => setOfficialOrderNo(e.target.value)}
                placeholder="যেমন: স্মারক নং-স্বা/শৈসনইমেকহা/২০২৬/৪৫"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">আদেশ জারির তারিখ *</label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">বরাদ্দ শুরুর তারিখ *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">প্রত্যাশিত শেষ তারিখ (ঐচ্ছিক)</label>
              <input
                type="date"
                value={expectedEndDate}
                onChange={(e) => setExpectedEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">মাসিক বাড়িভাড়া কর্তন হার (টাকা) *</label>
              <input
                type="number"
                min="0"
                required
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">বরাদ্দ আদেশের বিশেষ শর্ত ও মন্তব্য</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="সরকারি বিধি অনুযায়ী বিদ্যুৎ/পানি বিল কর্তন এবং বাসা রক্ষণাবেক্ষণ শর্তাবলী..."
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
              বাসা বরাদ্দ নিশ্চিত করুন
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Printable Allocation Order Letter Preview */}
      <Modal
        isOpen={Boolean(viewingOrder)}
        onClose={() => setViewingOrder(null)}
        title="সরকারি বাসা বরাদ্দ অফিস আদেশ পত্র"
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
        maxWidth="2xl"
      >
        {viewingOrder && (
          <div
            id="allocation-order-printable"
            className="space-y-6 text-xs text-slate-900 bg-white p-6 border border-slate-300 rounded-xl print:border-none print:p-0"
          >
            {/* Government Heading */}
            <div className="text-center space-y-1 border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h3>
              <p className="text-xs">স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়, স্বাস্থ্য সেবা বিভাগ</p>
              <h2 className="text-base font-extrabold text-[#0f2b48]">
                শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল
              </h2>
              <p className="text-xs">যশোদল, কিশোরগঞ্জ-২৩০০</p>
              <p className="text-[11px] font-semibold text-slate-600">সরকারি আবাসিক কোয়ার্টার বরাদ্দ প্রশাসন শাখা</p>
            </div>

            {/* Reference and Date */}
            <div className="flex justify-between text-xs pt-2 font-medium">
              <div><strong>স্মারক নম্বর:</strong> {viewingOrder.officialOrderNo}</div>
              <div><strong>তারিখ:</strong> {formatBanglaDate(viewingOrder.orderDate)} খ্রি.</div>
            </div>

            {/* Subject */}
            <div className="pt-2 font-bold text-sm text-center underline">
              বিষয়: আবাসিক কোয়ার্টার / ডরমেটরী কক্ষ বরাদ্দ প্রসঙ্গে।
            </div>

            {/* Order Body Text */}
            <p className="text-xs leading-relaxed text-justify indent-8">
              উপর্যুক্ত বিষয়ের প্রেক্ষিতে শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জের 
              <strong> {viewingOrder.residentName}</strong>, পদবী: <strong>{viewingOrder.residentDesignation}</strong> 
              -এর আবেদনের প্রেক্ষিতে ও সরকারি বাসা বরাদ্দ কমিটির সুপারিশক্রমে হাসপাতালের 
              <strong> &apos;{viewingOrder.buildingNameBn}&apos;</strong> এর 
              <strong> {viewingOrder.roomNumber}</strong> নং কক্ষটি আগামী 
              <strong> {formatBanglaDate(viewingOrder.startDate)}</strong> খ্রি. তারিখ হতে শর্তসাপেক্ষে সাময়িকভাবে বরাদ্দ প্রদান করা হলো।
            </p>

            {/* Terms and conditions */}
            <div className="space-y-1.5 pl-4 border-l-2 border-slate-400">
              <p className="font-bold">শর্তাবলী:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700">
                <li>সরকারি বিধি মোতাবেক মাসিক বেতন হতে নির্ধারিত বাড়িভাড়া বাবদ ৳ {toBanglaNumber(viewingOrder.monthlyRent)}/- এবং গ্যাস/বিদ্যুৎ/পানি বিল যথানিয়মে কর্তন করা হবে।</li>
                <li>বরাদ্দকৃত কক্ষটি কোনো অবস্থাতেই কোনো অননুমোদিত ব্যক্তি বা অন্য কারো নিকট সাব-লেট বা হস্তান্তর করা যাবে না।</li>
                <li>ক্যাম্পাসের সুষ্ঠু পরিবেশ ও স্বাস্থ্যবিধি বজায় রাখা বাধ্যকর। অন্যথায় এই বরাদ্দ তাৎক্ষণিকভাবে বাতিল বলে গণ্য হবে।</li>
                <li>বদলি, অবসর বা বাসস্থান ত্যাগের ক্ষেত্রে কমপক্ষে ১৫ দিন পূর্বে লিখিতভাবে কর্তৃপক্ষকে অবহিত করতে হবে।</li>
              </ol>
            </div>

            {/* Signature Area */}
            <div className="pt-12 flex justify-between items-end text-xs">
              <div className="text-center">
                <div className="w-32 border-b border-slate-400 pb-1 mb-1"></div>
                <p className="font-bold">প্রশাসনিক কর্মকর্তা</p>
                <p className="text-[10px] text-slate-500">শহীদ সৈয়দ নজরুল ইসলাম মেকহা, কিশোরগঞ্জ</p>
              </div>

              <div className="text-center">
                <div className="w-40 border-b border-slate-700 pb-1 mb-1 font-bold">
                  প্রফেসর ডাঃ এ. কে. এম. মোর্শেদ
                </div>
                <p className="font-bold">পরিচালক</p>
                <p className="text-[10px] text-slate-500">ও সভাপতি, বাসা বরাদ্দ কমিটি</p>
              </div>
            </div>

            {/* Action Buttons for Print & PDF Save */}
            <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-slate-200 no-print">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('allocation-order-printable');
                  exportElementToPdf(el, {
                    titleBn: `${viewingOrder.residentName || 'বরাদ্দ'}_${viewingOrder.roomNumber || ''}`,
                    suffix: 'বরাদ্দ_আদেশ_পত্র',
                    orientation: 'portrait',
                    fitSinglePage: true
                  });
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>পিডিএফ সংরক্ষণ (.pdf)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('allocation-order-printable');
                  triggerElementPrint(el, {
                    titleBn: `${viewingOrder.residentName || 'বরাদ্দ'}_${viewingOrder.roomNumber || ''}`,
                    suffix: 'বরাদ্দ_আদেশ_পত্র',
                    orientation: 'portrait',
                    fitSinglePage: true
                  });
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>অফিস আদেশ পত্র প্রিন্ট করুন</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
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

