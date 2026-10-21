import React, { useState } from 'react';
import { DoorClosed, Plus, Edit, Wrench, Search, Filter, AlertCircle } from 'lucide-react';
import type { Room, Building, RoomCategory, RoomOccupancyStatus } from '../../types/index.ts';
import { toBanglaNumber } from '../../logic/rules.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';

interface RoomsViewProps {
  rooms: Room[];
  buildings: Building[];
  onSaveRoom: (room: Partial<Room>) => void;
  onToggleMaintenance: (roomId: string) => void;
  canManage: boolean;
}

export const RoomsView: React.FC<RoomsViewProps> = ({
  rooms,
  buildings,
  onSaveRoom,
  onToggleMaintenance,
  canManage
}) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Room> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categoryLabels: Record<RoomCategory, string> = {
    SINGLE_ROOM: 'একক কক্ষ (Single)',
    SHARED_ROOM: 'যৌথ কক্ষ (Shared/Dorm)',
    OFFICER_QUARTER: 'কর্মকর্তা কোয়ার্টার',
    DOCTOR_SUITE: 'চিকিৎসক স্যুট',
    FAMILY_FLAT: 'পারিবারিক ফ্ল্যাট'
  };

  const filteredRooms = rooms.filter((r) => {
    if (selectedBuildingId !== 'ALL' && r.buildingId !== selectedBuildingId) return false;
    if (selectedCategory !== 'ALL' && r.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = r.roomNumber.toLowerCase().includes(q);
      const matchBld = (r.buildingNameBn || '').toLowerCase().includes(q);
      if (!matchNum && !matchBld) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setErrorMessage(null);
    setEditingRoom({
      buildingId: buildings[0]?.id || '',
      floor: 1,
      roomNumber: '',
      category: 'SINGLE_ROOM',
      capacity: 1,
      monthlyRent: 1500,
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setErrorMessage(null);
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!editingRoom?.buildingId || !editingRoom?.roomNumber) {
      setErrorMessage('ভবন এবং কক্ষ নম্বর আবশ্যক।');
      return;
    }
    try {
      onSaveRoom(editingRoom);
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'কক্ষ সংরক্ষণ ব্যর্থ হয়েছে।');
    }
  };

  const getStatusBadge = (status: RoomOccupancyStatus) => {
    switch (status) {
      case 'VACANT':
        return <Badge variant="success" size="sm">ফাঁকা (Vacant)</Badge>;
      case 'PARTIAL':
        return <Badge variant="info" size="sm">আংশিক বরাদ্দ</Badge>;
      case 'OCCUPIED':
        return <Badge variant="primary" size="sm">পূর্ণ বরাদ্দকৃত</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="warning" size="sm">মেরামত চলমান</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DoorClosed className="w-5 h-5 text-teal-700" />
            <span>কক্ষ ইনভেন্টরি ও প্রাপ্যতা ব্যবস্থাপনা (Room Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            হাসপাতালের সকল ভবনের কক্ষ তালিকা, তলা, ধারণক্ষমতা, সরকারি ভাড়া কর্তন এবং বর্তমান অবস্থান।
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন কক্ষ এন্ট্রি</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>ফিল্টার:</span>
          </div>

          {/* Building Filter */}
          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল আবাসিক ভবন ({buildings.length})</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameBn} ({b.code})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল কক্ষের শ্রেণি</option>
            <option value="SINGLE_ROOM">একক কক্ষ</option>
            <option value="SHARED_ROOM">যৌথ কক্ষ</option>
            <option value="OFFICER_QUARTER">কর্মকর্তা কোয়ার্টার</option>
            <option value="DOCTOR_SUITE">চিকিৎসক স্যুট</option>
            <option value="FAMILY_FLAT">পারিবারিক ফ্ল্যাট</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:bg-white"
          >
            <option value="ALL">সকল প্রাপ্যতা অবস্থা</option>
            <option value="VACANT">ফাঁকা (Vacant)</option>
            <option value="PARTIAL">আংশিক বরাদ্দ</option>
            <option value="OCCUPIED">পূর্ণ বরাদ্দ (Occupied)</option>
            <option value="MAINTENANCE">মেরামতাধীন</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কক্ষ নম্বর দিয়ে খুঁজুন..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs focus:bg-white"
          />
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">কক্ষ নং</th>
                <th className="py-3 px-4">ভবনের নাম ও কোড</th>
                <th className="py-3 px-4">তলা</th>
                <th className="py-3 px-4">কক্ষ শ্রেণি</th>
                <th className="py-3 px-4 text-center">ধারণক্ষমতা</th>
                <th className="py-3 px-4 text-center">বর্তমান বরাদ্দ</th>
                <th className="py-3 px-4">মাসিক সরকারি ভাড়া</th>
                <th className="py-3 px-4">অবস্থা (Status)</th>
                <th className="py-3 px-4 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    কোনো কক্ষের তথ্য পাওয়া যায়নি। উপরের &apos;নতুন কক্ষ এন্ট্রি&apos; বোতাম চেপে নতুন কক্ষ যুক্ত করুন।
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => {
                  return (
                    <tr key={room.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm whitespace-nowrap">
                        {room.roomNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {room.buildingNameBn}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {toBanglaNumber(room.floor)} তলা
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">
                          {categoryLabels[room.category] || room.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        {toBanglaNumber(room.capacity)} জন
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={room.currentOccupancy >= room.capacity ? 'text-blue-700' : 'text-emerald-700'}>
                          {toBanglaNumber(room.currentOccupancy)} জন
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 tabular-nums">
                        ৳ {toBanglaNumber(room.monthlyRent)}/-
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(room.status)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <>
                              <button
                                onClick={() => {
                                  try {
                                    onToggleMaintenance(room.id);
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }}
                                title="মেরামত স্ট্যাটাস পরিবর্তন"
                                className="p-1.5 rounded text-amber-700 hover:bg-amber-50 transition-colors"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(room)}
                                title="কক্ষের তথ্য সম্পাদনা"
                                className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </>
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
        
        {/* Table Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>মোট কক্ষ প্রদর্শিত: <strong>{toBanglaNumber(filteredRooms.length)}</strong> টি</span>
          <span>সর্বমোট অনুমোদিত ধারণক্ষমতা: <strong>{toBanglaNumber(filteredRooms.reduce((acc, r) => acc + r.capacity, 0))}</strong> জন</span>
        </div>
      </div>

      {/* Add/Edit Room Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom?.id ? 'কক্ষের বিবরণ সম্পাদনা' : 'নতুন আবাসিক কক্ষ অন্তর্ভুক্তি'}
        subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
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
              <label className="block font-semibold text-slate-700 mb-1">আবাসিক ভবন নির্বাচন *</label>
              <select
                required
                value={editingRoom?.buildingId || ''}
                onChange={(e) => setEditingRoom({ ...editingRoom, buildingId: e.target.value })}
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
              <label className="block font-semibold text-slate-700 mb-1">কক্ষ নম্বর (Room Number) *</label>
              <input
                type="text"
                required
                value={editingRoom?.roomNumber || ''}
                onChange={(e) => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                placeholder="যেমন: ১০১, ২০৩, ৩০৪"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">তলা (Floor) *</label>
              <input
                type="number"
                min="0"
                max="25"
                required
                value={editingRoom?.floor || 1}
                onChange={(e) => setEditingRoom({ ...editingRoom, floor: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">কক্ষের শ্রেণি (Category) *</label>
              <select
                value={editingRoom?.category || 'SINGLE_ROOM'}
                onChange={(e) => setEditingRoom({ ...editingRoom, category: e.target.value as RoomCategory })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              >
                <option value="SINGLE_ROOM">একক কক্ষ (Single)</option>
                <option value="SHARED_ROOM">যৌথ কক্ষ (Shared/Dorm)</option>
                <option value="OFFICER_QUARTER">কর্মকর্তা কোয়ার্টার</option>
                <option value="DOCTOR_SUITE">চিকিৎসক স্যুট</option>
                <option value="FAMILY_FLAT">পারিবারিক ফ্ল্যাট</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ধারণক্ষমতা (জন) *</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={editingRoom?.capacity || 1}
                onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">মাসিক সরকারি বাড়িভাড়া কর্তন হার (টাকা) *</label>
            <input
              type="number"
              min="0"
              required
              value={editingRoom?.monthlyRent || 0}
              onChange={(e) => setEditingRoom({ ...editingRoom, monthlyRent: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">বিশেষ মন্তব্য বা সুযোগ-সুবিধা</label>
            <textarea
              rows={2}
              value={editingRoom?.remarks || ''}
              onChange={(e) => setEditingRoom({ ...editingRoom, remarks: e.target.value })}
              placeholder="সংযুক্ত বাথরুম, বারান্দা বা বিশেষ বিবরণ..."
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
              কক্ষ তথ্য সংরক্ষণ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
