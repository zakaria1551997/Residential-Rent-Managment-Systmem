import React, { useState } from 'react';
import { Building2, Plus, Edit, Wrench, CheckCircle, MapPin, Layers, DoorClosed } from 'lucide-react';
import type { Building, Room } from '../../types/index.ts';
import { toBanglaNumber } from '../../logic/rules.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';

interface BuildingsViewProps {
  buildings: Building[];
  rooms: Room[];
  onSaveBuilding: (building: Partial<Building>) => void;
  onToggleMaintenance: (buildingId: string) => void;
  canManage: boolean;
}

export const BuildingsView: React.FC<BuildingsViewProps> = ({
  buildings,
  rooms,
  onSaveBuilding,
  onToggleMaintenance,
  canManage
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Partial<Building> | null>(null);

  const handleOpenAdd = () => {
    setEditingBuilding({
      nameBn: '',
      nameEn: '',
      code: '',
      totalFloors: 4,
      address: 'হাসপাতাল ক্যাম্পাস, কিশোরগঞ্জ সদর',
      description: '',
      isActive: true,
      maintenanceStatus: 'NORMAL'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (building: Building) => {
    setEditingBuilding(building);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding?.nameBn || !editingBuilding?.code) {
      alert('অনুগ্রহ করে ভবনের নাম এবং ভবন কোড প্রদান করুন।');
      return;
    }
    onSaveBuilding(editingBuilding);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-700" />
            <span>ভবন ব্যবস্থাপনা (Hospital Residential Buildings)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতালের নির্ধারিত আবাসিক ভবনসমূহ ও ডরমেটরী পরিচালনা।
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ভবন যুক্ত করুন</span>
          </button>
        )}
      </div>

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {buildings.map((building) => {
          const bRooms = rooms.filter((r) => r.buildingId === building.id);
          const occupiedCount = bRooms.filter((r) => r.status === 'OCCUPIED' || r.status === 'PARTIAL').length;
          const vacantCount = bRooms.filter((r) => r.status === 'VACANT').length;
          const maintenanceCount = bRooms.filter((r) => r.status === 'MAINTENANCE').length;
          const totalCapacity = bRooms.reduce((sum, r) => sum + r.capacity, 0);

          return (
            <div
              key={building.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                {/* Building Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0f2b48] text-white font-bold tracking-wider">
                      {building.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-2 leading-tight">
                      {building.nameBn}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{building.nameEn}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {building.maintenanceStatus === 'UNDER_MAINTENANCE' ? (
                      <Badge variant="warning" size="sm">মেরামত চলমান</Badge>
                    ) : (
                      <Badge variant="success" size="sm">সক্রিয়</Badge>
                    )}
                  </div>
                </div>

                {/* Description and Address */}
                <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                  {building.description || 'হাসপাতালের কর্মকর্তা/কর্মচারীদের নির্ধারিত সরকারি বাসস্থান।'}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{building.address || 'কিশোরগঞ্জ সদর'}</span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>মোট তলা: {toBanglaNumber(building.totalFloors)} টি</span>
                </div>

                {/* Stats Summary Box */}
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block text-[11px] text-slate-500">মোট কক্ষ</span>
                    <span className="text-sm font-bold text-slate-900">{toBanglaNumber(bRooms.length)}</span>
                  </div>
                  <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                    <span className="block text-[11px] text-emerald-700">ফাঁকা কক্ষ</span>
                    <span className="text-sm font-bold text-emerald-800">{toBanglaNumber(vacantCount)}</span>
                  </div>
                  <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                    <span className="block text-[11px] text-blue-700">বরাদ্দকৃত</span>
                    <span className="text-sm font-bold text-blue-800">{toBanglaNumber(occupiedCount)}</span>
                  </div>
                </div>

                {maintenanceCount > 0 && (
                  <p className="text-[11px] text-amber-700 mt-2 font-medium flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    <span>{toBanglaNumber(maintenanceCount)} টি কক্ষ মেরামতের জন্য বন্ধ রয়েছে</span>
                  </p>
                )}
              </div>

              {/* Action Buttons Footer */}
              {canManage && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onToggleMaintenance(building.id)}
                    className={`text-xs px-2.5 py-1.5 rounded font-medium border transition-colors flex items-center gap-1.5 ${
                      building.maintenanceStatus === 'UNDER_MAINTENANCE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{building.maintenanceStatus === 'UNDER_MAINTENANCE' ? 'মেরামত সম্পন্ন' : 'মেরামত শুরু'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(building)}
                    className="text-xs px-2.5 py-1.5 rounded font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                    <span>সম্পাদনা</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Building Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBuilding?.id ? 'ভবনের তথ্য সম্পাদনা' : 'নতুন আবাসিক ভবন নিবন্ধন'}
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ভবনের নাম (বাংলা) *</label>
              <input
                type="text"
                required
                value={editingBuilding?.nameBn || ''}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, nameBn: e.target.value })}
                placeholder="যেমন: নরসুন্ধা নার্সিং ডরমেটরী"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ভবনের নাম (English)</label>
              <input
                type="text"
                value={editingBuilding?.nameEn || ''}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, nameEn: e.target.value })}
                placeholder="e.g. Narasunda Nursing Dormitory"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ইউনিক ভবন কোড *</label>
              <input
                type="text"
                required
                value={editingBuilding?.code || ''}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, code: e.target.value.toUpperCase() })}
                placeholder="যেমন: NND-01, NRB-02"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">মোট তলা সংখ্যা *</label>
              <input
                type="number"
                min="1"
                max="25"
                required
                value={editingBuilding?.totalFloors || 4}
                onChange={(e) => setEditingBuilding({ ...editingBuilding, totalFloors: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ঠিকানা / ক্যাম্পাসে অবস্থান</label>
            <input
              type="text"
              value={editingBuilding?.address || ''}
              onChange={(e) => setEditingBuilding({ ...editingBuilding, address: e.target.value })}
              placeholder="যেমন: হাসপাতাল ক্যাম্পাস পূর্ব অংশ, কিশোরগঞ্জ"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">প্রশাসনিক বিবরণ ও মন্তব্য</label>
            <textarea
              rows={3}
              value={editingBuilding?.description || ''}
              onChange={(e) => setEditingBuilding({ ...editingBuilding, description: e.target.value })}
              placeholder="ভবন ব্যবহারের উদ্দেশ্য বা আবাসিক শ্রেণি সংক্রান্ত বিবরণ..."
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
              সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
