import React, { useState } from 'react';
import {
  FileX2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Calendar,
  AlertCircle,
  Eye,
  FileCheck2,
  FileText,
  Download
} from 'lucide-react';
import type { CancellationRequest, Allocation, User } from '../../types/index.ts';
import { toBanglaNumber, formatBanglaDate, isCancellationEffective } from '../../logic/rules.ts';
import { exportElementToPdf, triggerElementPrint } from '../../utils/printPdf.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';

interface CancellationsViewProps {
  cancellations: CancellationRequest[];
  allocations: Allocation[];
  currentUser: User;
  onSubmitRequest: (data: any) => void;
  onApproveReject: (id: string, action: 'APPROVE' | 'REJECT', remarks?: string) => void;
  onReleaseRoomNow: (allocationId: string, trackingNumber: string) => void;
  canRequest: boolean;
  canApprove: boolean;
  onOpenDocumentModal: (canc: CancellationRequest) => void;
}

export const CancellationsView: React.FC<CancellationsViewProps> = ({
  cancellations,
  allocations,
  currentUser,
  onSubmitRequest,
  onApproveReject,
  onReleaseRoomNow,
  canRequest,
  canApprove,
  onOpenDocumentModal
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<CancellationRequest | null>(null);
  const [approvalModalReq, setApprovalModalReq] = useState<CancellationRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [allocationId, setAllocationId] = useState('');
  const [cancellationOrderNo, setCancellationOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('অন্যত্র বদলি / চাকুরি পরিত্যাগ / ব্যক্তিগত কারণে বাসস্থান অবমুক্তকরণ।');
  const [requestedBy, setRequestedBy] = useState(currentUser.fullName);
  const [requestingDesignation, setRequestingDesignation] = useState(currentUser.designation);
  const [remarks, setRemarks] = useState('');

  // Active allocations only
  const activeAllocations = allocations.filter((a) => a.status === 'ACTIVE');

  const handleOpenAdd = () => {
    setErrorMessage(null);
    if (activeAllocations.length === 0) {
      alert('বর্তমানে কোনো সক্রিয় বাসা বরাদ্দ নেই যা বাতিল করা সম্ভব।');
      return;
    }
    const firstAlloc = activeAllocations[0];
    setAllocationId(firstAlloc.id);
    const year = new Date().getFullYear();
    setCancellationOrderNo(`স্মারক নং-বাতিল/${year}/${toBanglaNumber(cancellations.length + 1)}`);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setReason('চাকরি থেকে অবসর / অন্যত্র বদলি / নিজস্ব বাসায় স্থানান্তর।');
    setRequestedBy(currentUser.fullName);
    setRequestingDesignation(currentUser.designation);
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!allocationId || !cancellationOrderNo || !orderDate || !effectiveDate || !reason) {
      setErrorMessage('অনুগ্রহ করে সকল আবশ্যকীয় তথ্য পূরণ করুন।');
      return;
    }

    try {
      onSubmitRequest({
        allocationId,
        cancellationOrderNo,
        orderDate,
        effectiveDate,
        reason,
        requestedBy,
        requestingDesignation,
        remarks
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'বাতিল আবেদন জমা দেওয়া সম্ভব হয়নি।');
    }
  };

  const handleOpenApprovalModal = (req: CancellationRequest, action: 'APPROVE' | 'REJECT') => {
    setApprovalModalReq(req);
    setApprovalAction(action);
    setApprovalRemarks(action === 'APPROVE' ? 'যাচাইপূর্বক বাতিল আবেদন অনুমোদন করা হলো। সরকারি বিধি মোতাবেক কার্যকর হবে।' : 'প্রয়োজনীয় নথি বা কারণের অপর্যাপ্ততার কারণে আবেদনটি নামঞ্জুর করা হলো।');
  };

  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalReq) return;
    try {
      onApproveReject(approvalModalReq.id, approvalAction, approvalRemarks);
      setApprovalModalReq(null);
    } catch (err: any) {
      alert(err.message || 'অনুমোদন প্রক্রিয়া ব্যর্থ হয়েছে।');
    }
  };

  const getStatusBadge = (status: CancellationRequest['status']) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="neutral" size="sm">খসড়া (Draft)</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning" size="sm">অনুমোদনাধীন (Pending)</Badge>;
      case 'APPROVED':
        return <Badge variant="info" size="sm">অনুমোদিত (Approved)</Badge>;
      case 'COMPLETED':
        return <Badge variant="success" size="sm">কার্যকর সম্পন্ন (Completed)</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" size="sm">প্রত্যাখ্যাত (Rejected)</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const filteredCancellations = cancellations.filter((c) => {
    if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTrack = c.trackingNumber.toLowerCase().includes(q);
      const matchOrder = c.cancellationOrderNo.toLowerCase().includes(q);
      const matchRes = c.residentName.toLowerCase().includes(q);
      const matchRoom = c.roomNumber.toLowerCase().includes(q);
      if (!matchTrack && !matchOrder && !matchRes && !matchRoom) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileX2 className="w-5 h-5 text-amber-600" />
            <span>বাসা বরাদ্দ বাতিল ব্যবস্থাপনা (Cancellation & Approval Workflow)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            সরকারি বাসা বরাদ্দ বাতিলের আনুষ্ঠানিক আবেদন, অনুমোদন প্রক্রিয়া, কার্যকর তারিখ ও কক্ষ অবমুক্তকরণ রেজিস্ট্রি।
          </p>
        </div>

        {canRequest && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন বাতিল আবেদন দাখিল</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>অবস্থা ফিল্টার:</span>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল বাতিল আবেদন ({cancellations.length})</option>
            <option value="PENDING_APPROVAL">অনুমোদনের অপেক্ষায় (Pending)</option>
            <option value="APPROVED">অনুমোদিত (Approved)</option>
            <option value="COMPLETED">কার্যকর সম্পন্ন (Completed)</option>
            <option value="REJECTED">প্রত্যাখ্যাত (Rejected)</option>
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ট্র্যাকিং নং, স্মারক, বাসিন্দা বা কক্ষ নং..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs focus:bg-white"
          />
        </div>
      </div>

      {/* Cancellations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">ট্র্যাকিং নম্বর</th>
                <th className="py-3 px-4">বাসিন্দার নাম ও পদবী</th>
                <th className="py-3 px-4">ভবন ও কক্ষ নং</th>
                <th className="py-3 px-4">বাতিল স্মারক নং</th>
                <th className="py-3 px-4">কার্যকর তারিখ</th>
                <th className="py-3 px-4">বাতিলের কারণ</th>
                <th className="py-3 px-4">বর্তমান অবস্থা</th>
                <th className="py-3 px-4 text-right">পদক্ষেপ ও সিদ্ধান্ত</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCancellations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    কোনো বরাদ্দ বাতিলের আবেদন পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredCancellations.map((canc) => {
                  const effectivePassed = isCancellationEffective(canc.effectiveDate);
                  return (
                    <tr key={canc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {canc.trackingNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{canc.residentName}</div>
                        <div className="text-[11px] text-slate-500">{canc.residentDesignation}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{canc.buildingNameBn}</div>
                        <div className="text-[11px] text-slate-600">কক্ষ: {canc.roomNumber}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {canc.cancellationOrderNo}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatBanglaDate(canc.effectiveDate)}</div>
                        <span className={`text-[10px] ${effectivePassed ? 'text-emerald-700 font-bold' : 'text-amber-700'}`}>
                          {effectivePassed ? 'কার্যকর সময় উপস্থিত' : 'ভবিষ্যৎ কার্যকর'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-slate-600" title={canc.reason}>
                        {canc.reason}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(canc.status)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setViewingRequest(canc)}
                            title="বিস্তারিত ও সরকারি আদেশ পত্র"
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Approval / Rejection Controls for Approving Officer */}
                          {canApprove && canc.status === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                onClick={() => handleOpenApprovalModal(canc, 'APPROVE')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs"
                                title="আবেদন অনুমোদন করুন"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>অনুমোদন</span>
                              </button>

                              <button
                                onClick={() => handleOpenApprovalModal(canc, 'REJECT')}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs"
                                title="আবেদন প্রত্যাখ্যান করুন"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>বাতিল</span>
                              </button>
                            </>
                          )}

                          {/* Future effective date manual execution button */}
                          {canc.status === 'APPROVED' && (
                            <button
                              onClick={() => onReleaseRoomNow(canc.allocationId, canc.trackingNumber)}
                              className="px-2 py-1 bg-teal-700 hover:bg-teal-600 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs"
                              title="কক্ষ অবমুক্তকরণ কার্যকর সম্পন্ন করুন"
                            >
                              <FileCheck2 className="w-3 h-3" />
                              <span>কক্ষ অবমুক্ত</span>
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
          <span>মোট আবেদন: <strong>{toBanglaNumber(filteredCancellations.length)}</strong> টি</span>
          <span>অনুমোদনাধীন: <strong>{toBanglaNumber(filteredCancellations.filter(c => c.status === 'PENDING_APPROVAL').length)}</strong> টি</span>
        </div>
      </div>

      {/* New Cancellation Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="বাসা বরাদ্দ বাতিলের আনুষ্ঠানিক আবেদন দাখিল"
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

          <div>
            <label className="block font-semibold text-slate-700 mb-1">বাতিলযোগ্য সক্রিয় বাসা বরাদ্দ নির্বাচন *</label>
            <select
              required
              value={allocationId}
              onChange={(e) => setAllocationId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            >
              {activeAllocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.residentName} ({a.residentDesignation}) - {a.buildingNameBn}, কক্ষ {a.roomNumber} [বরাদ্দ নং: {a.allocationNumber}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">অফিসিয়াল বাতিল আদেশ স্মারক নম্বর *</label>
              <input
                type="text"
                required
                value={cancellationOrderNo}
                onChange={(e) => setCancellationOrderNo(e.target.value)}
                placeholder="যেমন: স্মারক নং-বাতিল/২০২৬/০৫"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">কার্যকর বাতিলের তারিখ (Effective Date) *</label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
              <p className="text-[10px] text-slate-500 mt-1">ভবিষ্যৎ তারিখ হলে উক্ত তারিখের পূর্বে কক্ষ খালি হবে না।</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">আবেদনকারী কর্মকর্তার নাম ও পদবী *</label>
              <input
                type="text"
                required
                value={`${requestedBy} (${requestingDesignation})`}
                disabled
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">বাসা বরাদ্দ বাতিলের প্রাতিষ্ঠানিক কারণ *</label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="যেমন: অন্যত্র বদলি জনিত কারণে বাসা পরিত্যাগ / অবসর গ্রহণ / স্বেচ্ছায় অবমুক্তকরণ..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">মন্তব্য ও সুপারিশ</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="কমিটির সিদ্ধান্তের জন্য অতিরিক্ত কোনো নির্দেশনা..."
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-xs"
            >
              আবেদন দাখিল করুন
            </button>
          </div>
        </form>
      </Modal>

      {/* Approval / Rejection Decision Modal */}
      <Modal
        isOpen={Boolean(approvalModalReq)}
        onClose={() => setApprovalModalReq(null)}
        title={approvalAction === 'APPROVE' ? 'বাসা বরাদ্দ বাতিল আদেশ অনুমোদন' : 'বাতিল আবেদন নামঞ্জুর / প্রত্যাখ্যান'}
        subtitle={`ট্র্যাকিং নম্বর: ${approvalModalReq?.trackingNumber} • বাসিন্দা: ${approvalModalReq?.residentName}`}
      >
        <form onSubmit={handleConfirmApproval} className="space-y-4 text-xs">
          <div className={`p-4 rounded-xl border ${approvalAction === 'APPROVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
            <p className="font-bold text-sm">
              {approvalAction === 'APPROVE' ? 'অনুমোদনের পর কার্যকারিতা:' : 'আবেদনটি প্রত্যাখ্যান করা হচ্ছে:'}
            </p>
            <p className="mt-1 leading-relaxed">
              {approvalAction === 'APPROVE'
                ? `আবেদনটি অনুমোদিত হলে কার্যকর তারিখ (${formatBanglaDate(approvalModalReq?.effectiveDate)}) অনুযায়ী কক্ষটি অবমুক্ত হবে এবং বরাদ্দ স্থিতি বাতিল বলে গণ্য হবে।`
                : 'আবেদনটি নামঞ্জুর করা হলে পূর্বের বরাদ্দ যথারীতি সক্রিয় থাকবে।'}
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">অনুমোদনকারী কর্মকর্তার মন্তব্য ও আদেশ *</label>
            <textarea
              rows={3}
              required
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setApprovalModalReq(null)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white font-bold rounded-lg shadow-xs ${
                approvalAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {approvalAction === 'APPROVE' ? 'চূড়ান্ত অনুমোদন নিশ্চিত করুন' : 'প্রত্যাখ্যান নিশ্চিত করুন'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Cancellation Order Letter Preview */}
      <Modal
        isOpen={Boolean(viewingRequest)}
        onClose={() => setViewingRequest(null)}
        title="সরকারি বাসা বরাদ্দ বাতিল আদেশ পত্র"
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
        maxWidth="2xl"
      >
        {viewingRequest && (
          <div
            id="cancellation-order-printable"
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
              <p className="text-[11px] font-semibold text-rose-800">সরকারি আবাসিক কোয়ার্টার বরাদ্দ বাতিল ও প্রত্যাহার শাখা</p>
            </div>

            {/* Reference and Date */}
            <div className="flex justify-between text-xs pt-2 font-medium">
              <div><strong>স্মারক নম্বর:</strong> {viewingRequest.cancellationOrderNo}</div>
              <div><strong>তারিখ:</strong> {formatBanglaDate(viewingRequest.orderDate)} খ্রি.</div>
            </div>

            {/* Subject */}
            <div className="pt-2 font-bold text-sm text-center underline text-rose-900">
              বিষয়: আবাসিক কোয়ার্টার / ডরমেটরী কক্ষ বরাদ্দ বাতিল ও অবমুক্তকরণ আদেশ।
            </div>

            {/* Order Body Text */}
            <p className="text-xs leading-relaxed text-justify indent-8">
              উপর্যুক্ত বিষয়ের প্রেক্ষিতে জানানো যাচ্ছে যে, শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জের 
              <strong> {viewingRequest.residentName}</strong>, পদবী: <strong>{viewingRequest.residentDesignation}</strong> 
              -এর অনুকূলে ইতিপূর্বে বরাদ্দকৃত হাসপাতালের <strong>{viewingRequest.buildingNameBn}</strong> ভবনের 
              <strong> {viewingRequest.roomNumber}</strong> নং কক্ষটির বরাদ্দ আদেশ 
              কারণ: &quot;{viewingRequest.reason}&quot; এর প্রেক্ষিতে আগামী 
              <strong> {formatBanglaDate(viewingRequest.effectiveDate)}</strong> খ্রি. তারিখ হতে সরকারিভাবে বাতিল ও প্রত্যাহার করা হলো।
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <p><strong>অনুমোদন স্থিতি:</strong> {viewingRequest.status}</p>
              <p><strong>অনুমোদনকারী কর্মকর্তা:</strong> {viewingRequest.approvingOfficer || 'প্রক্রিয়াধীন'} ({viewingRequest.approvingDesignation || ''})</p>
              <p><strong>অনুমোদন মন্তব্য:</strong> {viewingRequest.approvalRemarks || 'প্রক্রিয়াধীন'}</p>
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
                  {viewingRequest.approvingOfficer || 'প্রফেসর ডাঃ এ. কে. এম. মোর্শেদ'}
                </div>
                <p className="font-bold">পরিচালক</p>
                <p className="text-[10px] text-slate-500">ও সভাপতি, বাসা বরাদ্দ কমিটি</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-slate-200 no-print">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('cancellation-order-printable');
                  exportElementToPdf(el, {
                    titleBn: `${viewingRequest.residentName || 'বাতিল'}_${viewingRequest.roomNumber || ''}`,
                    suffix: 'বাতিল_আদেশ_পত্র',
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
                  const el = document.getElementById('cancellation-order-printable');
                  triggerElementPrint(el, {
                    titleBn: `${viewingRequest.residentName || 'বাতিল'}_${viewingRequest.roomNumber || ''}`,
                    suffix: 'বাতিল_আদেশ_পত্র',
                    orientation: 'portrait',
                    fitSinglePage: true
                  });
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>বাতিল আদেশ পত্র প্রিন্ট করুন</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
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

