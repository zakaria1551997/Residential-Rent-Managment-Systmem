import React, { useState } from 'react';
import {
  FolderArchive,
  Upload,
  FileText,
  Download,
  Trash2,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import type { DocumentRecord, User } from '../../types/index.ts';
import { toBanglaNumber, formatBanglaDate } from '../../logic/rules.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';

interface DocumentsViewProps {
  documents: DocumentRecord[];
  currentUser: User;
  onUploadDocument: (doc: DocumentRecord) => void;
  onDeleteDocument: (id: string) => void;
  canManage: boolean;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  currentUser,
  onUploadDocument,
  onDeleteDocument,
  canManage
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload Form State
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentRecord['category']>('ALLOCATION_ORDER');
  const [referenceNo, setReferenceNo] = useState('');
  const [refType, setRefType] = useState<DocumentRecord['refType']>('ALLOCATION');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const categoryLabels: Record<DocumentRecord['category'], string> = {
    ALLOCATION_ORDER: 'বাসা বরাদ্দ অফিস আদেশ',
    CANCELLATION_ORDER: 'বরাদ্দ বাতিল ও প্রত্যাহার আদেশ',
    OFFICIAL_LETTER: 'প্রশাসনিক চিঠিপত্র ও নোটিশ',
    RESIDENT_NID: 'জাতীয় পরিচয়পত্র ও সেবা বই',
    OTHER: 'অন্যান্য সহায়ক রেকর্ড'
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage('শুধুমাত্র PDF, JPG, বা PNG ফরম্যাটের ফাইল আপলোড করা যাবে।');
        setSelectedFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('ফাইলের আকার সর্বোচ্চ ১০ মেগাবাইট (10MB) পর্যন্ত গ্রহণযোগ্য।');
        setSelectedFile(null);
        return;
      }
      setErrorMessage(null);
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!docTitle || !selectedFile) {
      setErrorMessage('অনুগ্রহ করে নথির শিরোনাম প্রদান করুন এবং একটি ফাইল নির্বাচন করুন।');
      return;
    }

    // Generate SHA-256 hash
    const arrayBuffer = await selectedFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Convert to Data URL for in-app storage
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      const newDoc: DocumentRecord = {
        id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: docTitle,
        category: docCategory,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        fileHash,
        dataUrl,
        refType,
        referenceNo: referenceNo || undefined,
        uploadedBy: currentUser.fullName,
        uploadedAt: new Date().toISOString()
      };

      onUploadDocument(newDoc);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocTitle('');
      setReferenceNo('');
    };
    reader.readAsDataURL(selectedFile);
  };

  const filteredDocs = documents.filter((d) => {
    if (selectedCategory !== 'ALL' && d.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchFile = d.fileName.toLowerCase().includes(q);
      const matchRef = (d.referenceNo || '').toLowerCase().includes(q);
      if (!matchTitle && !matchFile && !matchRef) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-teal-700" />
            <span>ডিজিটাল নথি ও অফিস আদেশ সংরক্ষণাগার (Document Repository)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            স্বাক্ষরিত সরকারি বরাদ্দ আদেশ, বাতিল আদেশ, অফিস চিঠি ও এনআইডি নথিপত্র নিরাপদে সংরক্ষণ ও যাচাই।
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setErrorMessage(null);
              setIsUploadModalOpen(true);
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>নতুন নথি আপলোড</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>ক্যাটাগরি:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল নথিপত্র ({documents.length})</option>
            <option value="ALLOCATION_ORDER">বাসা বরাদ্দ আদেশ</option>
            <option value="CANCELLATION_ORDER">বরাদ্দ বাতিল আদেশ</option>
            <option value="OFFICIAL_LETTER">প্রশাসনিক চিঠিপত্র</option>
            <option value="RESIDENT_NID">এনআইডি / জাতীয় পরিচয়পত্র</option>
            <option value="OTHER">অন্যান্য রেকর্ড</option>
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নথির শিরোনাম, স্মারক বা ফাইল নাম..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs focus:bg-white"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            কোনো নথিপত্র পাওয়া যায়নি। &apos;নতুন নথি আপলোড&apos; চেপে ফাইল যুক্ত করুন।
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isPdf = doc.mimeType.includes('pdf');
            const sizeKb = Math.round(doc.fileSize / 1024);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <Badge variant="primary" size="sm">
                      {categoryLabels[doc.category] || doc.category}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-3 leading-snug line-clamp-2" title={doc.title}>
                    {doc.title}
                  </h3>

                  {doc.referenceNo && (
                    <p className="text-[11px] font-mono text-slate-600 mt-1 truncate" title={doc.referenceNo}>
                      স্মারক: {doc.referenceNo}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>ফাইলের নাম:</span>
                      <span className="font-mono truncate max-w-[150px]">{doc.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ফাইলের আকার:</span>
                      <span>{toBanglaNumber(sizeKb)} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>আপলোড তারিখ:</span>
                      <span>{formatBanglaDate(doc.uploadedAt)}</span>
                    </div>
                    <div className="flex justify-between font-mono text-[10px] text-slate-400">
                      <span>SHA-256 হ্যাশ:</span>
                      <span title={doc.fileHash} className="truncate max-w-[120px]">{doc.fileHash.substring(0, 12)}...</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="text-xs px-2.5 py-1.5 rounded font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>প্রিভিউ</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {doc.dataUrl && (
                      <a
                        href={doc.dataUrl}
                        download={doc.fileName}
                        className="p-1.5 rounded text-teal-700 hover:bg-teal-50 transition-colors"
                        title="ফাইল ডাউনলোড করুন"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {canManage && (
                      <button
                        onClick={() => {
                          if (confirm(`আপনি কি '${doc.title}' নথিটি মুছে ফেলতে চান?`)) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                        title="নথি মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="নতুন সরকারি নথি বা আদেশ আপলোড"
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">নথির শিরোনাম (Title) *</label>
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="যেমন: বাসা বরাদ্দ আদেশ নং ৪৫ (স্বাক্ষরিত কপি)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">নথির ক্যাটাগরি *</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              >
                <option value="ALLOCATION_ORDER">বাসা বরাদ্দ অফিস আদেশ</option>
                <option value="CANCELLATION_ORDER">বরাদ্দ বাতিল ও প্রত্যাহার আদেশ</option>
                <option value="OFFICIAL_LETTER">প্রশাসনিক চিঠিপত্র ও নোটিশ</option>
                <option value="RESIDENT_NID">জাতীয় পরিচয়পত্র ও সেবা বই</option>
                <option value="OTHER">অন্যান্য সহায়ক রেকর্ড</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">স্মারক নম্বর (ঐচ্ছিক)</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="যেমন: স্মারক নং-স্বা/শৈসনইমেকহা/২০২৬/৪৫"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ফাইল নির্বাচন (PDF, JPG, PNG - সর্বোচ্চ 10MB) *</label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
            />
            {selectedFile && (
              <p className="text-[11px] text-teal-700 font-medium mt-1">
                নির্বাচিত ফাইল: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-xs"
            >
              আপলোড ও সংরক্ষণ
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || 'নথি প্রদর্শন'}
        subtitle={`ফাইল: ${previewDoc?.fileName} • হ্যাশ: ${previewDoc?.fileHash.substring(0, 16)}...`}
        maxWidth="2xl"
      >
        {previewDoc && (
          <div className="space-y-4 text-xs">
            {previewDoc.dataUrl ? (
              previewDoc.mimeType.includes('pdf') ? (
                <div className="border border-slate-300 rounded-lg p-6 bg-slate-50 text-center space-y-3">
                  <FileText className="w-16 h-16 text-rose-600 mx-auto" />
                  <p className="font-bold text-slate-800 text-sm">{previewDoc.fileName}</p>
                  <p className="text-slate-500">
                    নিরাপদ প্রিভিউ মোড: ব্রাউজারে সরাসরি অথবা বাহ্যিক ভিউয়ারে পিডিএফ ফাইলটি প্রদর্শন বা ডাউনলোড করুন।
                  </p>
                  <div className="flex justify-center gap-3">
                    <a
                      href={previewDoc.dataUrl}
                      download={previewDoc.fileName}
                      className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>পিডিএফ ডাউনলোড</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-300 rounded-lg overflow-hidden flex items-center justify-center bg-slate-900/5 max-h-[500px]">
                  <img src={previewDoc.dataUrl} alt={previewDoc.title} className="max-h-[500px] object-contain" />
                </div>
              )
            ) : (
              <p className="text-center text-slate-400 py-8">নথি প্রিভিউ উপলব্ধ নেই।</p>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="font-mono text-[11px] text-slate-500">
                ডিজিটাল হ্যাশ: {previewDoc.fileHash}
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
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
