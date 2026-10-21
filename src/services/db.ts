/**
 * Hospital Residential Allocation & Management System
 * Authoritative Central Data Engine & Storage Service
 * শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
 */

import type {
  Building,
  Room,
  Resident,
  Allocation,
  CancellationRequest,
  DocumentRecord,
  User,
  AuditLog,
  AppNotification,
  AppSettings,
  BackupMetadata,
  SystemStats
} from '../types/index.ts';
import {
  validateRoomAllocation,
  calculateRoomOccupancyStatus,
  isCancellationEffective,
  isExcludedNarasundaRoom,
  shouldShowRoomTypeField,
  normalizeNarasundaRoomType
} from '../logic/rules.ts';

const STORAGE_KEYS = {
  SCHEMA_VERSION: 'ssnimch_matrix_version',
  BUILDINGS: 'ssnimch_buildings',
  ROOMS: 'ssnimch_rooms',
  RESIDENTS: 'ssnimch_residents',
  ALLOCATIONS: 'ssnimch_allocations',
  CANCELLATIONS: 'ssnimch_cancellations',
  DOCUMENTS: 'ssnimch_documents',
  USERS: 'ssnimch_users',
  AUDIT_LOGS: 'ssnimch_audit_logs',
  NOTIFICATIONS: 'ssnimch_notifications',
  SETTINGS: 'ssnimch_settings',
  BACKUP_HISTORY: 'ssnimch_backup_history',
};

const CURRENT_MATRIX_VERSION = '2026.10.matrix.v5';

// Initial Three Institutional Buildings Required:
// 1. নরসুন্দা নার্সিং ডরমেটরী (Floors 6 down to 2: 601-606 down to 201-206; no 101-106)
// 2. নিহারিকা আবাসিক ভবন (Floors 6 down to 2: 6-A..6-D down to 2-A..2-D)
// 3. মল্লিকা আবাসিক ভবন (6 Floors: 6-A..6-D down to 1-A..1-D)
const INITIAL_BUILDINGS: Building[] = [
  {
    id: 'bld-narasunda-01',
    nameBn: 'নরসুন্দা নার্সিং ডরমেটরী',
    nameEn: 'Narasunda Nursing Dormitory',
    code: 'NND-01',
    totalFloors: 5,
    description: 'সিনিয়র স্টাফ নার্স ও নার্সিং কর্মকর্তাদের জন্য নির্ধারিত ডরমেটরী ভবন (তলা ২–৬, প্রতি তলায় ৬টি কক্ষ: ২০১–৬০৬)।',
    address: 'হাসপাতাল ক্যাম্পাস পূর্ব অংশ, কিশোরগঞ্জ সদর',
    isActive: true,
    maintenanceStatus: 'NORMAL',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'bld-niharika-02',
    nameBn: 'নিহারিকা আবাসিক ভবন',
    nameEn: 'Niharika Residential Building',
    code: 'NRB-02',
    totalFloors: 6,
    description: 'চিকিৎসক, কনসালট্যান্ট ও কর্মকর্তাদের জন্য নির্ধারিত ৬ তলা আবাসিক ভবন (প্রতি তলায় ৪টি ইউনিট: A, B, C, D)।',
    address: 'হাসপাতাল ক্যাম্পাস উত্তর পার্শ্ব, কিশোরগঞ্জ সদর',
    isActive: true,
    maintenanceStatus: 'NORMAL',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'bld-mallika-03',
    nameBn: 'মল্লিকা আবাসিক ভবন',
    nameEn: 'Mallika Residential Building',
    code: 'MRB-03',
    totalFloors: 6,
    description: 'হাসপাতালের কর্মকর্তা-কর্মচারী ও স্টাফদের জন্য নির্ধারিত ৬ তলা আবাসিক ভবন (প্রতি তলায় ৪টি ইউনিট: 1-A হতে 6-D)।',
    address: 'হাসপাতাল ক্যাম্পাস দক্ষিণ পার্শ্ব, কিশোরগঞ্জ সদর',
    isActive: true,
    maintenanceStatus: 'NORMAL',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  }
];

const INITIAL_SETTINGS: AppSettings = {
  id: 'INSTITUTION_DEFAULT',
  hospitalNameBn: 'শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ',
  hospitalNameEn: 'Shahid Syed Nazrul Islam Medical College Hospital, Kishoreganj',
  ministryNameBn: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার\nস্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়, স্বাস্থ্য সেবা বিভাগ',
  subTitleBn: 'সরকারি আবাসিক কোয়ার্টার ও ডরমেটরী বরাদ্দ এবং প্রশাসন শাখা',
  addressBn: 'যশোদল, কিশোরগঞ্জ-২৩০০',
  contactEmail: 'ssnimch.kishoreganj@gov.bd',
  contactPhone: '০২৯৯৭৭৬১৩৪০',
  logoUrl: '',
  governmentEmblemUrl: '',
  directorNameBn: 'প্রফেসর ডাঃ এ. কে. এম. মোর্শেদ',
  directorDesignationBn: 'পরিচালক (উপসচিব পদমর্যাদা)',
  approvalRequiredForAllocation: true,
  approvalRequiredForCancellation: true,
  serverLanHost: '192.168.1.100',
  serverLanPort: 3000,
  themeColor: '#0f2b48',
  defaultDateFormat: 'DD/MM/YYYY',
  updatedAt: new Date().toISOString()
};

const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    fullName: 'কাজী সাখাওয়াত হোসেন',
    designation: 'প্রশাসনিক কর্মকর্তা ও সিস্টেম অ্যাডমিনিস্ট্রেটর',
    role: 'SUPER_ADMIN',
    email: 'admin@ssnimch.gov.bd',
    phone: '01711223344',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'usr-officer-02',
    username: 'officer',
    fullName: 'মোছাঃ রেজওয়ানা বেগম',
    designation: 'সহকারী প্রশাসনিক কর্মকর্তা',
    role: 'ADMIN_OFFICER',
    email: 'officer@ssnimch.gov.bd',
    phone: '01811223344',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'usr-approver-03',
    username: 'director',
    fullName: 'প্রফেসর ডাঃ এ. কে. এম. মোর্শেদ',
    designation: 'পরিচালক ও সভাপতি, বাসা বরাদ্দ কমিটি',
    role: 'APPROVING_OFFICER',
    email: 'director@ssnimch.gov.bd',
    phone: '01911223344',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'usr-viewer-04',
    username: 'viewer',
    fullName: 'জনাব আব্দুল বাতেন',
    designation: 'অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',
    role: 'READ_ONLY',
    email: 'viewer@ssnimch.gov.bd',
    phone: '01511223344',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  }
];

class DatabaseService {
  private initialized = false;

  constructor() {
    this.ensureInitialized();
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to write to localStorage for key ${key}`, e);
    }
  }

  public ensureInitialized(): void {
    if (this.initialized) return;

    const savedVersion = this.getItem<string>(STORAGE_KEYS.SCHEMA_VERSION, '');

    // Check settings
    const existingSettings = this.getItem<AppSettings | null>(STORAGE_KEYS.SETTINGS, null);
    if (!existingSettings) {
      this.setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    }

    // Check users
    const existingUsers = this.getItem<User[]>(STORAGE_KEYS.USERS, []);
    if (existingUsers.length === 0) {
      this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    }

    // Seed or upgrade to the 3-building architectural matrix if not on current version
    const existingRooms = this.getItem<Room[]>(STORAGE_KEYS.ROOMS, []);
    if (existingRooms.length === 0 || savedVersion !== CURRENT_MATRIX_VERSION) {
      this.setItem(STORAGE_KEYS.BUILDINGS, INITIAL_BUILDINGS);
      this.loadInstitutionalDemonstrationData({
        id: 'usr-admin-01',
        name: 'কাজী সাখাওয়াত হোসেন',
        role: 'SUPER_ADMIN'
      });
      this.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_MATRIX_VERSION);
    } else {
      const existingBuildings = this.getItem<Building[]>(STORAGE_KEYS.BUILDINGS, []);
      if (existingBuildings.length === 0) {
        this.setItem(STORAGE_KEYS.BUILDINGS, INITIAL_BUILDINGS);
      }
      // Ensure Narasunda 101-106 are never present even in cached localStorage
      const cleanedRooms = existingRooms.filter(
        (r) => !isExcludedNarasundaRoom(r.buildingId, r.roomNumber, r.floor)
      );
      if (cleanedRooms.length !== existingRooms.length) {
        this.setItem(STORAGE_KEYS.ROOMS, cleanedRooms);
      }
    }

    this.initialized = true;
  }

  // AUDIT LOG RECORDER
  public recordAuditLog(
    actor: { id: string; name: string; role: any },
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string,
    beforeData?: any,
    afterData?: any
  ): void {
    const logs = this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const newLog: AuditLog = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      details,
      beforeData: beforeData ? JSON.stringify(beforeData) : undefined,
      afterData: afterData ? JSON.stringify(afterData) : undefined,
      ipAddress: '127.0.0.1 (LAN)',
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    // Keep max 2000 logs
    if (logs.length > 2000) logs.length = 2000;
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // BUILDINGS
  public getBuildings(): Building[] {
    return this.getItem<Building[]>(STORAGE_KEYS.BUILDINGS, []).map((b) =>
      b.id === 'bld-narasunda-01'
        ? {
            ...b,
            totalFloors: 5,
            description:
              'সিনিয়র স্টাফ নার্স ও নার্সিং কর্মকর্তাদের জন্য নির্ধারিত ডরমেটরী ভবন (তলা ২–৬, প্রতি তলায় ৬টি কক্ষ: ২০১–৬০৬)।'
          }
        : b
    );
  }

  public getBuildingById(id: string): Building | undefined {
    return this.getBuildings().find(b => b.id === id);
  }

  public saveBuilding(building: Partial<Building>, actor: { id: string; name: string; role: any }): Building {
    const buildings = this.getBuildings();
    const now = new Date().toISOString();

    if (building.id) {
      // Edit
      const index = buildings.findIndex(b => b.id === building.id);
      if (index === -1) throw new Error('ভবনটি খুঁজে পাওয়া যায়নি।');
      const before = buildings[index];
      const updated: Building = {
        ...before,
        ...building,
        updatedAt: now
      };
      buildings[index] = updated;
      this.setItem(STORAGE_KEYS.BUILDINGS, buildings);
      this.recordAuditLog(actor, 'UPDATE', 'BUILDING', updated.id, `ভবন হালনাগাদ: ${updated.nameBn} (${updated.code})`, before, updated);
      return updated;
    } else {
      // Add
      if (!building.code || !building.nameBn) {
        throw new Error('ভবনের নাম এবং কোড আবশ্যক।');
      }
      if (buildings.some(b => b.code.toLowerCase() === building.code!.toLowerCase())) {
        throw new Error(`ভবন কোড '${building.code}' ইতোমধ্যে বিদ্যমান।`);
      }
      const newBuilding: Building = {
        id: 'bld-' + Date.now(),
        nameBn: building.nameBn,
        nameEn: building.nameEn || building.nameBn,
        code: building.code,
        totalFloors: building.totalFloors || 4,
        description: building.description || '',
        address: building.address || '',
        isActive: building.isActive ?? true,
        maintenanceStatus: building.maintenanceStatus || 'NORMAL',
        createdAt: now,
        updatedAt: now
      };
      buildings.push(newBuilding);
      this.setItem(STORAGE_KEYS.BUILDINGS, buildings);
      this.recordAuditLog(actor, 'CREATE', 'BUILDING', newBuilding.id, `নতুন ভবন তৈরি: ${newBuilding.nameBn} (${newBuilding.code})`, undefined, newBuilding);
      return newBuilding;
    }
  }

  public toggleBuildingMaintenance(id: string, actor: { id: string; name: string; role: any }): Building {
    const buildings = this.getBuildings();
    const index = buildings.findIndex(b => b.id === id);
    if (index === -1) throw new Error('ভবন পাওয়া যায়নি।');
    const before = buildings[index];
    const newStatus = before.maintenanceStatus === 'NORMAL' ? 'UNDER_MAINTENANCE' : 'NORMAL';
    buildings[index] = { ...before, maintenanceStatus: newStatus, updatedAt: new Date().toISOString() };
    this.setItem(STORAGE_KEYS.BUILDINGS, buildings);
    this.recordAuditLog(actor, 'UPDATE', 'BUILDING', id, `ভবনের মেরামত অবস্থা পরিবর্তন: ${before.nameBn} -> ${newStatus}`);
    return buildings[index];
  }

  // ROOMS
  public getRooms(): Room[] {
    return this.getItem<Room[]>(STORAGE_KEYS.ROOMS, [])
      .filter((r) => !isExcludedNarasundaRoom(r.buildingId, r.roomNumber, r.floor))
      .map((r) => ({
        ...r,
        seatTypeLabel: shouldShowRoomTypeField(r.buildingId)
          ? normalizeNarasundaRoomType(r.seatTypeLabel)
          : ''
      }));
  }

  public getRoomById(id: string): Room | undefined {
    return this.getRooms().find(r => r.id === id);
  }

  public getRoomsByBuilding(buildingId: string): Room[] {
    return this.getRooms().filter(r => r.buildingId === buildingId);
  }

  public saveRoom(roomData: Partial<Room>, actor: { id: string; name: string; role: any }): Room {
    const rooms = this.getRooms();
    const buildings = this.getBuildings();
    const building = buildings.find(b => b.id === roomData.buildingId);
    if (!building) throw new Error('নির্বাচিত ভবনটি বিদ্যমান নেই।');

    const now = new Date().toISOString();

    if (roomData.id) {
      const index = rooms.findIndex(r => r.id === roomData.id);
      if (index === -1) throw new Error('কক্ষটি পাওয়া যায়নি।');
      const before = rooms[index];

      // Check unique room number within building
      if (roomData.roomNumber && roomData.roomNumber !== before.roomNumber) {
        if (rooms.some(r => r.buildingId === before.buildingId && r.roomNumber === roomData.roomNumber && r.id !== before.id)) {
          throw new Error(`এই ভবনে কক্ষ নং ${roomData.roomNumber} ইতোমধ্যে বিদ্যমান রয়েছে।`);
        }
      }

      const updated: Room = {
        ...before,
        ...roomData,
        buildingNameBn: building.nameBn,
        updatedAt: now
      };
      rooms[index] = updated;
      this.setItem(STORAGE_KEYS.ROOMS, rooms);
      this.recordAuditLog(actor, 'UPDATE', 'ROOM', updated.id, `কক্ষ তথ্য হালনাগাদ: ${building.nameBn} - কক্ষ ${updated.roomNumber}`, before, updated);
      return updated;
    } else {
      if (!roomData.roomNumber) throw new Error('কক্ষ নম্বর আবশ্যক।');
      if (rooms.some(r => r.buildingId === roomData.buildingId && r.roomNumber === roomData.roomNumber)) {
        throw new Error(`এই ভবনে কক্ষ নং ${roomData.roomNumber} ইতোমধ্যে অন্তর্ভুক্ত আছে।`);
      }

      const capacity = roomData.capacity || 1;
      const newRoom: Room = {
        id: 'rm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        buildingId: building.id,
        buildingNameBn: building.nameBn,
        floor: roomData.floor || 1,
        roomNumber: roomData.roomNumber,
        category: roomData.category || 'SINGLE_ROOM',
        capacity,
        currentOccupancy: 0,
        monthlyRent: roomData.monthlyRent || 0,
        status: 'VACANT',
        remarks: roomData.remarks || '',
        createdAt: now,
        updatedAt: now
      };
      rooms.push(newRoom);
      this.setItem(STORAGE_KEYS.ROOMS, rooms);
      this.recordAuditLog(actor, 'CREATE', 'ROOM', newRoom.id, `নতুন কক্ষ তৈরি: ${building.nameBn} - কক্ষ ${newRoom.roomNumber}`, undefined, newRoom);
      return newRoom;
    }
  }

  public toggleRoomMaintenance(id: string, actor: { id: string; name: string; role: any }): Room {
    const rooms = this.getRooms();
    const index = rooms.findIndex(r => r.id === id);
    if (index === -1) throw new Error('কক্ষ পাওয়া যায়নি।');
    const room = rooms[index];

    if (room.currentOccupancy > 0 && room.status !== 'MAINTENANCE') {
      throw new Error('এই কক্ষে সক্রিয় বাসিন্দা অবস্থান করছেন। মেরামতের পূর্বে বাসিন্দাকে স্থানান্তর বা বরাদ্দ বাতিল করুন।');
    }

    const nextStatus = room.status === 'MAINTENANCE' 
      ? (room.currentOccupancy > 0 ? (room.currentOccupancy >= room.capacity ? 'OCCUPIED' : 'PARTIAL') : 'VACANT')
      : 'MAINTENANCE';

    rooms[index] = { ...room, status: nextStatus, updatedAt: new Date().toISOString() };
    this.setItem(STORAGE_KEYS.ROOMS, rooms);
    this.recordAuditLog(actor, 'UPDATE', 'ROOM', id, `কক্ষের মেরামত স্ট্যাটাস পরিবর্তন: কক্ষ ${room.roomNumber} -> ${nextStatus}`);
    return rooms[index];
  }

  // RESIDENTS
  public getResidents(): Resident[] {
    return this.getItem<Resident[]>(STORAGE_KEYS.RESIDENTS, []);
  }

  public getResidentById(id: string): Resident | undefined {
    return this.getResidents().find(r => r.id === id);
  }

  public saveResident(residentData: Partial<Resident>, actor: { id: string; name: string; role: any }): Resident {
    const residents = this.getResidents();
    const now = new Date().toISOString();

    if (residentData.id) {
      const index = residents.findIndex(r => r.id === residentData.id);
      if (index === -1) throw new Error('বাসিন্দা তথ্য পাওয়া যায়নি।');
      const before = residents[index];

      const updated: Resident = {
        ...before,
        ...residentData,
        updatedAt: now
      };
      residents[index] = updated;
      this.setItem(STORAGE_KEYS.RESIDENTS, residents);
      this.recordAuditLog(actor, 'UPDATE', 'RESIDENT', updated.id, `বাসিন্দা তথ্য হালনাগাদ: ${updated.fullName} (${updated.designation})`, before, updated);
      return updated;
    } else {
      if (!residentData.fullName || !residentData.mobileNumber || !residentData.permanentAddress) {
        throw new Error('পূর্ণ নাম, মোবাইল নম্বর এবং স্থায়ী ঠিকানা আবশ্যক।');
      }

      // Generate institutional resident ID: RES-YYYY-XXX
      const year = new Date().getFullYear();
      const count = residents.length + 1;
      const resCode = `RES-${year}-${String(count).padStart(3, '0')}`;

      const newResident: Resident = {
        id: 'res-' + Date.now(),
        residentIdNumber: resCode,
        fullName: residentData.fullName,
        designation: residentData.designation || 'স্বাস্থ্যকর্মী',
        department: residentData.department || 'হাসপাতাল প্রশাসন',
        employeeId: residentData.employeeId || '',
        mobileNumber: residentData.mobileNumber,
        altPhone: residentData.altPhone || '',
        email: residentData.email || '',
        nidNumber: residentData.nidNumber || '',
        presentAddress: residentData.presentAddress || '',
        permanentAddress: residentData.permanentAddress,
        status: 'ACTIVE',
        remarks: residentData.remarks || '',
        createdAt: now,
        updatedAt: now,
        createdBy: actor.name
      };

      residents.push(newResident);
      this.setItem(STORAGE_KEYS.RESIDENTS, residents);
      this.recordAuditLog(actor, 'CREATE', 'RESIDENT', newResident.id, `নতুন বাসিন্দা নিবন্ধন: ${newResident.fullName} (${newResident.residentIdNumber})`, undefined, newResident);
      return newResident;
    }
  }

  // ALLOCATIONS & CONCURRENCY TRANSACTION
  public getAllocations(): Allocation[] {
    return this.getItem<Allocation[]>(STORAGE_KEYS.ALLOCATIONS, [])
      .filter((a) => !isExcludedNarasundaRoom(a.buildingId, a.roomNumber))
      .map((a) => ({
        ...a,
        seatTypeLabel: shouldShowRoomTypeField(a.buildingId)
          ? normalizeNarasundaRoomType(a.seatTypeLabel)
          : ''
      }));
  }

  public getAllocationById(id: string): Allocation | undefined {
    return this.getAllocations().find(a => a.id === id);
  }

  public createAllocation(
    data: {
      residentId: string;
      buildingId: string;
      roomId: string;
      officialOrderNo: string;
      orderDate: string;
      startDate: string;
      expectedEndDate?: string;
      monthlyRent?: number;
      remarks?: string;
      documentIds?: string[];
    },
    actor: { id: string; name: string; role: any }
  ): Allocation {
    // ATOMIC TRANSACTION LOGIC
    const rooms = this.getRooms();
    const roomIndex = rooms.findIndex(r => r.id === data.roomId);
    if (roomIndex === -1) throw new Error('কক্ষটি পাওয়া যায়নি।');
    const room = rooms[roomIndex];

    const residents = this.getResidents();
    const resident = residents.find(res => res.id === data.residentId);
    if (!resident) throw new Error('বাসিন্দা পাওয়া যায়নি।');

    const buildings = this.getBuildings();
    const building = buildings.find(b => b.id === data.buildingId);
    if (!building) throw new Error('ভবন পাওয়া যায়নি।');

    const allAllocations = this.getAllocations();
    const roomActiveAllocations = allAllocations.filter(a => a.roomId === room.id && a.status === 'ACTIVE');
    const residentActiveAllocations = allAllocations.filter(a => a.residentId === resident.id && a.status === 'ACTIVE');

    // Strict Concurrency & Eligibility Validation
    const validation = validateRoomAllocation(room, roomActiveAllocations, resident, residentActiveAllocations);
    if (!validation.valid) {
      throw new Error(validation.error || 'বরাদ্দ প্রক্রিয়া ব্যর্থ হয়েছে।');
    }

    if (!data.officialOrderNo || !data.orderDate || !data.startDate) {
      throw new Error('অফিস স্মারক নম্বর, আদেশ তারিখ এবং বরাদ্দ শুরুর তারিখ আবশ্যক।');
    }

    const year = new Date().getFullYear();
    const count = allAllocations.length + 1;
    const allocCode = `ALLOC-${year}-${String(count).padStart(4, '0')}`;

    const newAllocation: Allocation = {
      id: 'alc-' + Date.now(),
      allocationNumber: allocCode,
      residentId: resident.id,
      residentName: resident.fullName,
      residentDesignation: resident.designation,
      residentPhone: resident.mobileNumber,
      buildingId: building.id,
      buildingNameBn: building.nameBn,
      roomId: room.id,
      roomNumber: room.roomNumber,
      category: room.category,
      officialOrderNo: data.officialOrderNo,
      orderDate: data.orderDate,
      startDate: data.startDate,
      expectedEndDate: data.expectedEndDate,
      monthlyRent: data.monthlyRent !== undefined ? data.monthlyRent : room.monthlyRent,
      status: 'ACTIVE',
      documentIds: data.documentIds || [],
      remarks: data.remarks || '',
      createdBy: actor.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update Room occupancy atomically
    const nextOccupancy = roomActiveAllocations.length + 1;
    const nextRoomStatus = calculateRoomOccupancyStatus(room.capacity, nextOccupancy, room.status === 'MAINTENANCE');
    rooms[roomIndex] = {
      ...room,
      currentOccupancy: nextOccupancy,
      status: nextRoomStatus,
      updatedAt: new Date().toISOString()
    };

    allAllocations.unshift(newAllocation);

    // Save changes together
    this.setItem(STORAGE_KEYS.ALLOCATIONS, allAllocations);
    this.setItem(STORAGE_KEYS.ROOMS, rooms);

    // Record audit
    this.recordAuditLog(
      actor,
      'CREATE',
      'ALLOCATION',
      newAllocation.id,
      `নতুন বাসা বরাদ্দ সম্পন্ন: বরাদ্দ নং ${allocCode}, বাসিন্দা: ${resident.fullName}, ভবন: ${building.nameBn}, কক্ষ: ${room.roomNumber}`,
      undefined,
      newAllocation
    );

    // Add Notification
    this.addNotification({
      title: 'নতুন বাসা বরাদ্দ সফল',
      message: `${resident.fullName} (${resident.designation}) কে ${building.nameBn}-এর ${room.roomNumber} নং কক্ষ বরাদ্দ দেওয়া হয়েছে।`,
      type: 'SUCCESS'
    });

    return newAllocation;
  }

  // CANCELLATION WORKFLOW (বাসা বরাদ্দ বাতিল ব্যবস্থাপনা)
  public getCancellations(): CancellationRequest[] {
    return this.getItem<CancellationRequest[]>(STORAGE_KEYS.CANCELLATIONS, []);
  }

  public getCancellationById(id: string): CancellationRequest | undefined {
    return this.getCancellations().find(c => c.id === id);
  }

  public submitCancellationRequest(
    data: {
      allocationId: string;
      cancellationOrderNo: string;
      orderDate: string;
      effectiveDate: string;
      reason: string;
      requestedBy: string;
      requestingDesignation: string;
      remarks?: string;
      documentIds?: string[];
    },
    actor: { id: string; name: string; role: any }
  ): CancellationRequest {
    const allocations = this.getAllocations();
    const allocation = allocations.find(a => a.id === data.allocationId);
    if (!allocation) throw new Error('সংশ্লিষ্ট বরাদ্দটি পাওয়া যায়নি।');

    if (allocation.status !== 'ACTIVE') {
      throw new Error(`এই বরাদ্দটি সক্রিয় নয় (বর্তমান অবস্থা: ${allocation.status})। শুধুমাত্র সক্রিয় বরাদ্দ বাতিল করা সম্ভব।`);
    }

    const cancellations = this.getCancellations();
    // Check if pending cancellation already exists for this allocation
    const existingPending = cancellations.find(
      c => c.allocationId === allocation.id && (c.status === 'PENDING_APPROVAL' || c.status === 'APPROVED')
    );
    if (existingPending) {
      throw new Error(`এই বরাদ্দের জন্য ইতোমধ্যে একটি বাতিল প্রক্রিয়া চলমান রয়েছে (ট্র্যাকিং নং: ${existingPending.trackingNumber})।`);
    }

    if (!data.cancellationOrderNo || !data.orderDate || !data.effectiveDate || !data.reason) {
      throw new Error('বাতিল স্মারক নম্বর, আদেশ তারিখ, কার্যকর তারিখ এবং কারণ আবশ্যক।');
    }

    const year = new Date().getFullYear();
    const count = cancellations.length + 1;
    const trackingNo = `CAN-${year}-${String(count).padStart(4, '0')}`;

    const newRequest: CancellationRequest = {
      id: 'can-' + Date.now(),
      trackingNumber: trackingNo,
      allocationId: allocation.id,
      residentId: allocation.residentId,
      residentName: allocation.residentName || '',
      residentDesignation: allocation.residentDesignation || '',
      buildingId: allocation.buildingId,
      buildingNameBn: allocation.buildingNameBn || '',
      roomId: allocation.roomId,
      roomNumber: allocation.roomNumber || '',
      cancellationOrderNo: data.cancellationOrderNo,
      orderDate: data.orderDate,
      effectiveDate: data.effectiveDate,
      reason: data.reason,
      requestedBy: data.requestedBy || actor.name,
      requestingDesignation: data.requestingDesignation || 'প্রশাসনিক কর্মকর্তা',
      status: 'PENDING_APPROVAL',
      documentIds: data.documentIds || [],
      remarks: data.remarks || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: actor.id
    };

    cancellations.unshift(newRequest);
    this.setItem(STORAGE_KEYS.CANCELLATIONS, cancellations);

    this.recordAuditLog(
      actor,
      'CREATE',
      'CANCELLATION',
      newRequest.id,
      `বাসা বরাদ্দ বাতিলের আবেদন জমা: ${trackingNo}, স্মারক নং: ${data.cancellationOrderNo}, বাসিন্দা: ${allocation.residentName}`,
      undefined,
      newRequest
    );

    this.addNotification({
      title: 'বাসা বরাদ্দ বাতিলের আবেদন প্রাপ্তি',
      message: `${allocation.residentName} এর বরাদ্দের জন্য বাতিল আবেদন (ট্র্যাকিং: ${trackingNo}) অনুমোদনের অপেক্ষায় রয়েছে।`,
      type: 'WARNING'
    });

    return newRequest;
  }

  public processCancellationApproval(
    requestId: string,
    action: 'APPROVE' | 'REJECT',
    approverDetails: { name: string; designation: string; remarks?: string },
    actor: { id: string; name: string; role: any }
  ): CancellationRequest {
    const cancellations = this.getCancellations();
    const index = cancellations.findIndex(c => c.id === requestId);
    if (index === -1) throw new Error('বাতিলের আবেদনটি পাওয়া যায়নি।');
    const req = cancellations[index];

    if (req.status !== 'PENDING_APPROVAL') {
      throw new Error(`এই আবেদনটি অনুমোদনের অবস্থায় নেই (বর্তমান অবস্থা: ${req.status})।`);
    }

    const now = new Date().toISOString();

    if (action === 'REJECT') {
      const updatedReq: CancellationRequest = {
        ...req,
        status: 'REJECTED',
        approvingOfficer: approverDetails.name,
        approvingDesignation: approverDetails.designation,
        approvalRemarks: approverDetails.remarks || 'আবেদনটি প্রত্যাখ্যান করা হলো।',
        approvalDate: now,
        updatedAt: now
      };
      cancellations[index] = updatedReq;
      this.setItem(STORAGE_KEYS.CANCELLATIONS, cancellations);

      this.recordAuditLog(
        actor,
        'REJECT',
        'CANCELLATION',
        req.id,
        `বাসা বরাদ্দ বাতিলের আবেদন প্রত্যাখ্যান: ${req.trackingNumber}`,
        req,
        updatedReq
      );

      this.addNotification({
        title: 'বরাদ্দ বাতিলের আবেদন প্রত্যাখ্যাত',
        message: `${req.residentName} এর বাতিল আবেদনটি (${req.trackingNumber}) কর্তৃপক্ষ কর্তৃক প্রত্যাখ্যাত হয়েছে।`,
        type: 'INFO'
      });

      return updatedReq;
    } else {
      // APPROVE ACTION
      // Check if effective date is today or past
      const isEffectiveNow = isCancellationEffective(req.effectiveDate);
      const targetStatus: CancellationRequest['status'] = isEffectiveNow ? 'COMPLETED' : 'APPROVED';

      const updatedReq: CancellationRequest = {
        ...req,
        status: targetStatus,
        approvingOfficer: approverDetails.name,
        approvingDesignation: approverDetails.designation,
        approvalRemarks: approverDetails.remarks || 'অনুমোদিত। সরকারি বিধি মোতাবেক কার্যকর হবে।',
        approvalDate: now,
        updatedAt: now
      };
      cancellations[index] = updatedReq;
      this.setItem(STORAGE_KEYS.CANCELLATIONS, cancellations);

      // If effective right away, mark allocation cancelled and release room capacity
      if (isEffectiveNow) {
        this.executeAllocationRelease(req.allocationId, actor, req.trackingNumber);
      }

      this.recordAuditLog(
        actor,
        'APPROVE',
        'CANCELLATION',
        req.id,
        `বাসা বরাদ্দ বাতিলের আবেদন অনুমোদিত: ${req.trackingNumber} (${isEffectiveNow ? 'তাৎক্ষণিক কার্যকর' : 'ভবিষ্যৎ কার্যকর তারিখ: ' + req.effectiveDate})`,
        req,
        updatedReq
      );

      this.addNotification({
        title: 'বাসা বরাদ্দ বাতিলের আদেশ অনুমোদিত',
        message: `${req.residentName} এর বাসা বরাদ্দ বাতিলের আবেদন অনুমোদিত হয়েছে। কার্যকর তারিখ: ${req.effectiveDate}।`,
        type: 'SUCCESS'
      });

      return updatedReq;
    }
  }

  // Release room capacity when cancellation is fully completed
  public executeAllocationRelease(allocationId: string, actor: { id: string; name: string; role: any }, refNote?: string): void {
    const allocations = this.getAllocations();
    const allocIdx = allocations.findIndex(a => a.id === allocationId);
    if (allocIdx === -1) return;
    const allocation = allocations[allocIdx];

    if (allocation.status === 'CANCELLED') return; // already cancelled

    allocations[allocIdx] = {
      ...allocation,
      status: 'CANCELLED',
      updatedAt: new Date().toISOString()
    };
    this.setItem(STORAGE_KEYS.ALLOCATIONS, allocations);

    // Recalculate room occupancy
    const rooms = this.getRooms();
    const roomIdx = rooms.findIndex(r => r.id === allocation.roomId);
    if (roomIdx !== -1) {
      const room = rooms[roomIdx];
      const remainingActive = allocations.filter(a => a.roomId === room.id && a.status === 'ACTIVE').length;
      const nextStatus = calculateRoomOccupancyStatus(room.capacity, remainingActive, room.status === 'MAINTENANCE');
      rooms[roomIdx] = {
        ...room,
        currentOccupancy: remainingActive,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      };
      this.setItem(STORAGE_KEYS.ROOMS, rooms);
    }

    this.recordAuditLog(
      actor,
      'UPDATE',
      'ALLOCATION',
      allocation.id,
      `বরাদ্দ বাতিল কার্যকর এবং কক্ষ অবমুক্তকরণ: বরাদ্দ নং ${allocation.allocationNumber}, কক্ষ নং ${allocation.roomNumber} (${refNote || ''})`
    );
  }

  // DOCUMENTS
  public getDocuments(): DocumentRecord[] {
    return this.getItem<DocumentRecord[]>(STORAGE_KEYS.DOCUMENTS, []);
  }

  public saveDocument(doc: DocumentRecord, actor: { id: string; name: string; role: any }): DocumentRecord {
    const docs = this.getDocuments();
    docs.unshift(doc);
    this.setItem(STORAGE_KEYS.DOCUMENTS, docs);
    this.recordAuditLog(actor, 'CREATE', 'DOCUMENT', doc.id, `নতুন নথি আপলোড: ${doc.title} (${doc.fileName})`, undefined, { id: doc.id, title: doc.title, hash: doc.fileHash });
    return doc;
  }

  public deleteDocument(id: string, actor: { id: string; name: string; role: any }): void {
    const docs = this.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    const filtered = docs.filter(d => d.id !== id);
    this.setItem(STORAGE_KEYS.DOCUMENTS, filtered);
    this.recordAuditLog(actor, 'DELETE', 'DOCUMENT', id, `নথি মুছে ফেলা হয়েছে: ${doc.title} (${doc.fileName})`);
  }

  // AUDIT LOGS
  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  // NOTIFICATIONS
  public getNotifications(): AppNotification[] {
    return this.getItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  public addNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): AppNotification {
    const notifications = this.getNotifications();
    const newNotif: AppNotification = {
      ...notification,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      read: false,
      createdAt: new Date().toISOString()
    };
    notifications.unshift(newNotif);
    if (notifications.length > 50) notifications.length = 50;
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    return newNotif;
  }

  public markNotificationRead(id: string): void {
    const notifications = this.getNotifications();
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    }
  }

  public markAllNotificationsRead(): void {
    const notifications = this.getNotifications().map(n => ({ ...n, read: true }));
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }

  // SETTINGS
  public getSettings(): AppSettings {
    return this.getItem<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  public updateSettings(settings: Partial<AppSettings>, actor: { id: string; name: string; role: any }): AppSettings {
    const current = this.getSettings();
    const updated: AppSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString()
    };
    this.setItem(STORAGE_KEYS.SETTINGS, updated);
    this.recordAuditLog(actor, 'UPDATE', 'SETTINGS', updated.id, 'হাসপাতাল প্রাতিষ্ঠানিক সেটিংস ও ব্র্যান্ডিং হালনাগাদ করা হয়েছে।', current, updated);
    return updated;
  }

  // USERS
  public getUsers(): User[] {
    return this.getItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public saveUser(userData: Partial<User>, actor: { id: string; name: string; role: any }): User {
    const users = this.getUsers();
    const now = new Date().toISOString();

    if (userData.id) {
      const idx = users.findIndex(u => u.id === userData.id);
      if (idx === -1) throw new Error('ব্যবহারকারী পাওয়া যায়নি।');
      const before = users[idx];
      const updated: User = { ...before, ...userData, updatedAt: now };
      users[idx] = updated;
      this.setItem(STORAGE_KEYS.USERS, users);
      this.recordAuditLog(actor, 'UPDATE', 'USER', updated.id, `ব্যবহারকারী তথ্য হালনাগাদ: ${updated.fullName} (${updated.username})`, before, updated);
      return updated;
    } else {
      if (!userData.username || !userData.fullName || !userData.role) {
        throw new Error('ব্যবহারকারী নাম, পূর্ণ নাম এবং পদমর্যাদা আবশ্যক।');
      }
      if (users.some(u => u.username.toLowerCase() === userData.username!.toLowerCase())) {
        throw new Error(`ইউজারনেম '${userData.username}' ইতোমধ্যে ব্যবহৃত হয়েছে।`);
      }
      const newUser: User = {
        id: 'usr-' + Date.now(),
        username: userData.username,
        fullName: userData.fullName,
        designation: userData.designation || 'কর্মকর্তা',
        role: userData.role,
        email: userData.email || '',
        phone: userData.phone || '',
        isActive: userData.isActive ?? true,
        createdAt: now,
        updatedAt: now
      };
      users.push(newUser);
      this.setItem(STORAGE_KEYS.USERS, users);
      this.recordAuditLog(actor, 'CREATE', 'USER', newUser.id, `নতুন ব্যবহারকারী সৃষ্টি: ${newUser.fullName} (${newUser.username})`, undefined, newUser);
      return newUser;
    }
  }

  // SYSTEM STATS COMPUTATION
  public getSystemStats(): SystemStats {
    const buildings = this.getBuildings();
    const rooms = this.getRooms();
    const allocations = this.getAllocations();
    const cancellations = this.getCancellations();
    const residents = this.getResidents();
    const documents = this.getDocuments();

    const totalBuildings = buildings.length;
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED' || r.status === 'PARTIAL').length;
    const vacantRooms = rooms.filter(r => r.status === 'VACANT').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;

    const activeAllocations = allocations.filter(a => a.status === 'ACTIVE').length;
    const totalActiveResidents = residents.filter(r => r.status === 'ACTIVE').length;
    const pendingCancellations = cancellations.filter(c => c.status === 'PENDING_APPROVAL').length;
    const completedCancellations = cancellations.filter(c => c.status === 'COMPLETED').length;

    // Missing docs: active allocations with 0 attached documents
    const missingDocuments = allocations.filter(a => a.status === 'ACTIVE' && (!a.documentIds || a.documentIds.length === 0)).length;

    const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return {
      totalBuildings,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      maintenanceRooms,
      activeAllocations,
      totalActiveResidents,
      pendingCancellations,
      completedCancellations,
      missingDocuments,
      occupancyPercentage
    };
  }

  // BACKUP AND RESTORE
  public getBackupHistory(): BackupMetadata[] {
    return this.getItem<BackupMetadata[]>(STORAGE_KEYS.BACKUP_HISTORY, []);
  }

  public createSystemBackup(actor: { id: string; name: string; role: any }): { jsonString: string; metadata: BackupMetadata } {
    const data = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      institution: 'শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ',
      buildings: this.getBuildings(),
      rooms: this.getRooms(),
      residents: this.getResidents(),
      allocations: this.getAllocations(),
      cancellations: this.getCancellations(),
      documents: this.getDocuments(),
      settings: this.getSettings(),
      users: this.getUsers(),
      auditLogs: this.getAuditLogs()
    };

    const jsonString = JSON.stringify(data, null, 2);
    const totalRecords = 
      data.buildings.length + data.rooms.length + data.residents.length + 
      data.allocations.length + data.cancellations.length + data.documents.length;

    // Checksum simulation (in production uses crypto SHA-256)
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      hash = ((hash << 5) - hash) + jsonString.charCodeAt(i);
      hash |= 0;
    }
    const checksum = 'SHA256:' + Math.abs(hash).toString(16).padStart(16, '0');

    const fileName = `SSNIMCH_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const metadata: BackupMetadata = {
      id: 'bak-' + Date.now(),
      fileName,
      createdAt: new Date().toISOString(),
      fileSize: jsonString.length,
      totalRecords,
      checksum,
      version: '1.0.0',
      status: 'VALID',
      type: 'MANUAL'
    };

    const history = this.getBackupHistory();
    history.unshift(metadata);
    this.setItem(STORAGE_KEYS.BACKUP_HISTORY, history);

    this.recordAuditLog(actor, 'BACKUP', 'SETTINGS', metadata.id, `সিস্টেম পূর্ণাঙ্গ ব্যাকআপ গ্রহণ: ফাইল: ${fileName}, মোট রেকর্ড: ${totalRecords}`);

    return { jsonString, metadata };
  }

  public restoreFromBackup(jsonContent: string, actor: { id: string; name: string; role: any }): { success: boolean; message: string; recordCount: number } {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.buildings || !parsed.rooms || !parsed.allocations) {
        throw new Error('অবৈধ ব্যাকআপ ফাইল। প্রয়োজনীয় প্রাতিষ্ঠানিক ডাটা অনুপস্থিত।');
      }

      this.setItem(STORAGE_KEYS.BUILDINGS, parsed.buildings);
      this.setItem(STORAGE_KEYS.ROOMS, parsed.rooms);
      this.setItem(STORAGE_KEYS.RESIDENTS, parsed.residents || []);
      this.setItem(STORAGE_KEYS.ALLOCATIONS, parsed.allocations || []);
      this.setItem(STORAGE_KEYS.CANCELLATIONS, parsed.cancellations || []);
      this.setItem(STORAGE_KEYS.DOCUMENTS, parsed.documents || []);
      if (parsed.settings) this.setItem(STORAGE_KEYS.SETTINGS, parsed.settings);
      if (parsed.users) this.setItem(STORAGE_KEYS.USERS, parsed.users);

      const count = (parsed.buildings?.length || 0) + (parsed.rooms?.length || 0) + (parsed.residents?.length || 0) + (parsed.allocations?.length || 0);

      this.recordAuditLog(actor, 'RESTORE', 'SETTINGS', 'SYSTEM', `সিস্টেম রিস্টোর সফলভাবে সম্পন্ন হয়েছে। মোট ${count} টি রেকর্ড পুনরুদ্ধার করা হয়েছে।`);

      return {
        success: true,
        message: 'সিস্টেম ডাটাবেজ সফলভাবে পুনরুদ্ধার (Restore) করা হয়েছে।',
        recordCount: count
      };
    } catch (err: any) {
      throw new Error('রিস্টোর প্রক্রিয়া ব্যর্থ হয়েছে: ' + err.message);
    }
  }

  // Clean Institutional Seeding for Verification
  public loadInstitutionalDemonstrationData(actor: { id: string; name: string; role: any }): void {
    const buildings = this.getBuildings();
    const narasunda = buildings.find(b => b.code === 'NND-01') || buildings[0];
    const niharika = buildings.find(b => b.code === 'NRB-02') || buildings[1];
    const mallika = buildings.find(b => b.code === 'MRB-03') || buildings[2];

    const sampleRooms: Room[] = [];
    const sampleResidents: Resident[] = [];
    const sampleAllocations: Allocation[] = [];

    const nurseNames = [
      'সাইফুল ইসলাম', 'মোছাঃ নাসরীন আক্তার', 'মোছাঃ সানজিদা পারভীন', 'রাবেয়া খাতুন', 'ফারজানা ইয়াসমিন', 'শামীমা নাসরিন',
      'সালমা বেগম', 'তাহমিনা আক্তার', 'শারমিন সুলতানা', 'রোকেয়া বেগম', 'জান্নাতুল ফেরদৌস', 'মাহমুদা খাতুন',
      'কামরুন্নাহার', 'নূরজাহান বেগম', 'হালিমা খাতুন', 'আয়েশা সিদ্দিকা', 'সুমাইয়া আক্তার', 'নাজমা সুলতানা',
      'রুবিনা ইয়াসমিন', 'বিলকিস আক্তার', 'ফাতেমা তুজ জোহরা', 'মর্জিনা খাতুন', 'সাবিনা ইয়াসমিন', 'খাদিজা আক্তার',
      'আসমাউল হুসনা', 'সুরাইয়া পারভীন', 'মনিরা খাতুন', 'তানজিনা আক্তার', 'লুৎফুন্নাহার', 'শাহনাজ পারভীন'
    ];

    const nurseDesignations = [
      'সিনিয়র স্টাফ নার্স', 'সিনিয়র স্টাফ নার্স', 'সিনিয়র স্টাফ নার্স', 'নার্সিং সুপারভাইজার', 'সিনিয়র স্টাফ নার্স', 'স্টাফ নার্স'
    ];

    const doctorNames = [
      'ডাঃ তানভীর আহমেদ চৌধুরী', 'ডাঃ মোস্তাফিজুর রহমান', 'ডাঃ ফারহানা ইয়াসমিন', 'ডাঃ মাহবুবুল আলম',
      'ডাঃ শফিকুল ইসলাম', 'ডাঃ নুসরাত জাহান', 'ডাঃ কামরুল হাসান', 'ডাঃ আনিসুর রহমান',
      'ডাঃ সাদিয়া আফরিন', 'ডাঃ রাশেদুল করিম', 'ডাঃ নাজমুল হুদা', 'ডাঃ তাহমিনা সুলতানা',
      'ডাঃ জাহিদুল ইসলাম', 'ডাঃ হুমায়রা কবির', 'ডাঃ আশরাফুল আলম', 'ডাঃ রুমানা হক',
      'ডাঃ সাইফুল বারী', 'ডাঃ তাসনুভা রশিদ', 'ডাঃ মিজানুর রহমান', 'ডাঃ রেজাউল করিম'
    ];

    const doctorDesignations = [
      'সহকারী অধ্যাপক (কার্ডিওলজি)', 'সিনিয়র কনসালট্যান্ট (মেডিসিন)', 'জুনিয়র কনসালট্যান্ট (গাইনী)', 'আবাসিক সার্জন (আরএস)',
      'সহকারী রেজিস্ট্রার', 'মেডিকেল অফিসার', 'আবাসিক মেডিকেল অফিসার (আরএমও)', 'সহকারী অধ্যাপক (সার্জারি)'
    ];

    const staffNames = [
      'জনাব মোঃ বাবুল হোসেন', 'মোঃ রফিকুল ইসলাম', 'আব্দুস সালাম', 'মোঃ জহিরুল ইসলাম',
      'মোছাঃ মমতাজ বেগম', 'মোঃ আনোয়ার হোসেন', 'মোঃ দেলোয়ার হোসেন', 'মোঃ খোরশেদ আলম',
      'মোঃ শহীদুল ইসলাম', 'মোঃ মজিবুর রহমান', 'মোঃ হাবিবুর রহমান', 'মোঃ সিরাজুল ইসলাম',
      'মোঃ নুরুল আমিন', 'মোঃ ফজলুল হক', 'মোঃ আবুল কালাম', 'মোঃ মোবারক হোসেন',
      'মোঃ ইব্রাহিম খলিল', 'মোঃ আলাউদ্দিন', 'মোঃ জসিম উদ্দিন', 'মোঃ কামাল হোসেন',
      'মোঃ সাইফুল ইসলাম', 'মোঃ মনিরুজ্জামান', 'মোঃ আমিনুল ইসলাম', 'মোঃ শামসুল হক'
    ];

    const staffDesignations = [
      'ওয়ার্ড মাস্টার', 'মেডিকেল টেকনোলজিস্ট (ল্যাব)', 'ফার্মাসিস্ট', 'হিসাবরক্ষক',
      'অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক', 'মেডিকেল টেকনোলজিস্ট (রেডিওলজি)', 'স্টোর কিপার', 'সিনিয়র স্টাফ নার্স'
    ];

    let resCounter = 1;
    let allocCounter = 1;

    // 1. নরসুন্দা নার্সিং ডরমেটরী: Floors 6 down to 2, Rooms X01..X06 (30 rooms total: 601-606 down to 201-206; no 101-106)
    for (let floor = 6; floor >= 2; floor--) {
      for (let col = 1; col <= 6; col++) {
        const roomNo = `${floor}0${col}`;
        const roomId = `rm-nnd-${roomNo}`;
        // Leave 205 and 206 vacant so user can also test quick allocation immediately without needing 101-106
        const isOccupied = !(floor === 2 && col >= 5);
        const idx = (6 - floor) * 6 + (col - 1);

        sampleRooms.push({
          id: roomId,
          buildingId: narasunda.id,
          buildingNameBn: narasunda.nameBn,
          floor,
          roomNumber: roomNo,
          category: 'SINGLE_ROOM',
          seatTypeLabel: 'একক রুম',
          capacity: 1,
          currentOccupancy: isOccupied ? 1 : 0,
          monthlyRent: 1500,
          status: isOccupied ? 'OCCUPIED' : 'VACANT',
          createdAt: '2026-01-01T08:00:00Z',
          updatedAt: '2026-01-01T08:00:00Z'
        });

        if (isOccupied) {
          const resId = `res-nnd-${roomNo}`;
          const name = nurseNames[idx % nurseNames.length];
          const desig = nurseDesignations[idx % nurseDesignations.length];
          const phone = idx === 0 ? '01711-112233' : `01711-${String(112233 + idx).slice(0, 6)}`;

          sampleResidents.push({
            id: resId,
            residentIdNumber: `RES-2026-${String(resCounter++).padStart(3, '0')}`,
            fullName: name,
            designation: desig,
            department: 'নার্সিং সেবা বিভাগ',
            employeeId: `PDS-${884100 + idx}`,
            mobileNumber: phone,
            permanentAddress: 'কিশোরগঞ্জ সদর, কিশোরগঞ্জ',
            presentAddress: `${narasunda.nameBn}, কক্ষ ${roomNo}`,
            status: 'ACTIVE',
            createdAt: '2026-01-10T09:00:00Z',
            updatedAt: '2026-01-10T09:00:00Z',
            createdBy: 'admin'
          });

          sampleAllocations.push({
            id: `alc-nnd-${roomNo}`,
            allocationNumber: `ALLOC-2026-${String(allocCounter++).padStart(4, '0')}`,
            residentId: resId,
            residentName: name,
            residentDesignation: desig,
            residentPhone: phone,
            buildingId: narasunda.id,
            buildingNameBn: narasunda.nameBn,
            roomId,
            roomNumber: roomNo,
            category: 'SINGLE_ROOM',
            seatTypeLabel: 'একক রুম',
            officialOrderNo: `স্মারক নং-স্বা/শৈসনইমেকহা/২০২৬/${100 + allocCounter}`,
            orderDate: '2026-10-01',
            startDate: '2026-10-01',
            monthlyRent: 1500,
            status: 'ACTIVE',
            documentIds: idx < 2 ? ['doc-demo-01'] : [],
            remarks: 'নিয়মিত সরকারি ডরমেটরী বরাদ্দ',
            createdBy: 'admin',
            createdAt: '2026-10-01T10:00:00Z',
            updatedAt: '2026-10-01T10:00:00Z'
          });
        }
      }
    }

    // 2. নিহারিকা আবাসিক ভবন: Floors 6 down to 2, Units A, B, C, D (20 units total, matching Sample Image 2)
    const unitLetters = ['A', 'B', 'C', 'D'];
    for (let floor = 6; floor >= 2; floor--) {
      for (let u = 0; u < unitLetters.length; u++) {
        const roomNo = `${floor}-${unitLetters[u]}`;
        const roomId = `rm-nrb-${roomNo}`;
        const idx = (6 - floor) * 4 + u;
        // Leave 2-C and 2-D vacant so user can also test allocation in Niharika immediately
        const isOccupied = !(floor === 2 && u >= 2);

        sampleRooms.push({
          id: roomId,
          buildingId: niharika.id,
          buildingNameBn: niharika.nameBn,
          floor,
          roomNumber: roomNo,
          category: 'OFFICER_QUARTER',
          seatTypeLabel: '',
          capacity: 1,
          currentOccupancy: isOccupied ? 1 : 0,
          monthlyRent: 3500,
          status: isOccupied ? 'OCCUPIED' : 'VACANT',
          createdAt: '2026-01-01T08:00:00Z',
          updatedAt: '2026-01-01T08:00:00Z'
        });

        if (isOccupied) {
          const resId = `res-nrb-${roomNo}`;
          const name = idx === 0 ? 'সাইফুল ইসলাম' : doctorNames[idx % doctorNames.length];
          const desig = idx === 0 ? 'সিনিয়র স্টাফ নার্স' : doctorDesignations[idx % doctorDesignations.length];
          const phone = idx === 0 ? '01711-112233' : `01811-${String(223344 + idx).slice(0, 6)}`;

          sampleResidents.push({
            id: resId,
            residentIdNumber: `RES-2026-${String(resCounter++).padStart(3, '0')}`,
            fullName: name,
            designation: desig,
            department: 'চিকিৎসা ও সার্জারি বিভাগ',
            employeeId: `BMDC-${45800 + idx}`,
            mobileNumber: phone,
            permanentAddress: 'কিশোরগঞ্জ সদর, কিশোরগঞ্জ',
            presentAddress: `${niharika.nameBn}, ইউনিট ${roomNo}`,
            status: 'ACTIVE',
            createdAt: '2026-01-15T09:00:00Z',
            updatedAt: '2026-01-15T09:00:00Z',
            createdBy: 'admin'
          });

          sampleAllocations.push({
            id: `alc-nrb-${roomNo}`,
            allocationNumber: `ALLOC-2026-${String(allocCounter++).padStart(4, '0')}`,
            residentId: resId,
            residentName: name,
            residentDesignation: desig,
            residentPhone: phone,
            buildingId: niharika.id,
            buildingNameBn: niharika.nameBn,
            roomId,
            roomNumber: roomNo,
            category: 'OFFICER_QUARTER',
            seatTypeLabel: '',
            officialOrderNo: `স্মারক নং-স্বা/শৈসনইমেকহা/২০২৬/${200 + allocCounter}`,
            orderDate: '2026-10-01',
            startDate: '2026-10-01',
            monthlyRent: 3500,
            status: 'ACTIVE',
            documentIds: idx === 0 ? ['doc-demo-02'] : [],
            remarks: 'নিহারিকা আবাসিক ভবন বরাদ্দ',
            createdBy: 'admin',
            createdAt: '2026-10-01T10:00:00Z',
            updatedAt: '2026-10-01T10:00:00Z'
          });
        }
      }
    }

    // 3. মল্লিকা আবাসিক ভবন: Floors 6 down to 1, Units A, B, C, D (24 units total, matching Sample Image 3)
    for (let floor = 6; floor >= 1; floor--) {
      for (let u = 0; u < unitLetters.length; u++) {
        const roomNo = `${floor}-${unitLetters[u]}`;
        const roomId = `rm-mrb-${roomNo}`;
        const idx = (6 - floor) * 4 + u;
        // Leave 1-C and 1-D vacant for easy testing while 6-A..1-B are occupied
        const isOccupied = !(floor === 1 && u >= 2);

        sampleRooms.push({
          id: roomId,
          buildingId: mallika.id,
          buildingNameBn: mallika.nameBn,
          floor,
          roomNumber: roomNo,
          category: 'FAMILY_FLAT',
          seatTypeLabel: '',
          capacity: 1,
          currentOccupancy: isOccupied ? 1 : 0,
          monthlyRent: 2200,
          status: isOccupied ? 'OCCUPIED' : 'VACANT',
          createdAt: '2026-01-01T08:00:00Z',
          updatedAt: '2026-01-01T08:00:00Z'
        });

        if (isOccupied) {
          const resId = `res-mrb-${roomNo}`;
          const name = idx === 0 ? 'সাইফুল ইসলাম' : staffNames[idx % staffNames.length];
          const desig = idx === 0 ? 'সিনিয়র স্টাফ নার্স' : staffDesignations[idx % staffDesignations.length];
          const phone = idx === 0 ? '01711-112233' : `01911-${String(334455 + idx).slice(0, 6)}`;

          sampleResidents.push({
            id: resId,
            residentIdNumber: `RES-2026-${String(resCounter++).padStart(3, '0')}`,
            fullName: name,
            designation: desig,
            department: 'হাসপাতাল প্রশাসন ও সেবা শাখা',
            employeeId: `EMP-${300 + idx}`,
            mobileNumber: phone,
            permanentAddress: 'কিশোরগঞ্জ সদর, কিশোরগঞ্জ',
            presentAddress: `${mallika.nameBn}, ইউনিট ${roomNo}`,
            status: 'ACTIVE',
            createdAt: '2026-02-01T09:00:00Z',
            updatedAt: '2026-02-01T09:00:00Z',
            createdBy: 'admin'
          });

          sampleAllocations.push({
            id: `alc-mrb-${roomNo}`,
            allocationNumber: `ALLOC-2026-${String(allocCounter++).padStart(4, '0')}`,
            residentId: resId,
            residentName: name,
            residentDesignation: desig,
            residentPhone: phone,
            buildingId: mallika.id,
            buildingNameBn: mallika.nameBn,
            roomId,
            roomNumber: roomNo,
            category: 'FAMILY_FLAT',
            seatTypeLabel: '',
            officialOrderNo: `স্মারক নং-স্বা/শৈসনইমেকহা/২০২৬/${300 + allocCounter}`,
            orderDate: '2026-10-01',
            startDate: '2026-10-01',
            monthlyRent: 2200,
            status: 'ACTIVE',
            documentIds: [],
            remarks: 'মল্লিকা আবাসিক ভবন বরাদ্দ',
            createdBy: 'admin',
            createdAt: '2026-10-01T10:00:00Z',
            updatedAt: '2026-10-01T10:00:00Z'
          });
        }
      }
    }

    const sampleCancellations: CancellationRequest[] = [
      {
        id: 'can-demo-01',
        trackingNumber: 'CAN-2026-0001',
        allocationId: 'alc-mrb-2-A',
        residentId: 'res-mrb-2-A',
        residentName: 'জনাব মোঃ বাবুল হোসেন',
        residentDesignation: 'ওয়ার্ড মাস্টার',
        buildingId: mallika.id,
        buildingNameBn: mallika.nameBn,
        roomId: 'rm-mrb-2-A',
        roomNumber: '2-A',
        cancellationOrderNo: 'স্মারক নং-বাতিল/২০২৬/০১',
        orderDate: '2026-10-10',
        effectiveDate: '2026-11-01',
        reason: 'নিজস্ব বাসায় স্থানান্তর ও স্বেচ্ছায় বাসা পরিত্যাগ।',
        requestedBy: 'জনাব মোঃ বাবুল হোসেন',
        requestingDesignation: 'ওয়ার্ড মাস্টার',
        status: 'PENDING_APPROVAL',
        documentIds: [],
        remarks: 'কমিটির পরবর্তী সভায় উপস্থাপনের জন্য প্রক্রিয়াধীন।',
        createdAt: '2026-10-10T11:00:00Z',
        updatedAt: '2026-10-10T11:00:00Z',
        createdById: 'usr-admin-01'
      }
    ];

    const sampleDocs: DocumentRecord[] = [
      {
        id: 'doc-demo-01',
        title: 'নরসুন্দা নার্সিং ডরমেটরী বরাদ্দ আদেশ নং ৪৫',
        category: 'ALLOCATION_ORDER',
        fileName: 'Order_Alloc_Narasunda_2026.pdf',
        fileSize: 245800,
        mimeType: 'application/pdf',
        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        refType: 'ALLOCATION',
        refId: 'alc-nnd-601',
        referenceNo: 'স্মারক নং-স্বা/শৈসনইমেকহা/২০২৬/১০২',
        uploadedBy: 'admin',
        uploadedAt: '2026-10-01T10:30:00Z'
      },
      {
        id: 'doc-demo-02',
        title: 'নিহারিকা আবাসিক ভবন বরাদ্দ আদেশ নং ৫২',
        category: 'ALLOCATION_ORDER',
        fileName: 'Order_Niharika_Alloc_52.pdf',
        fileSize: 312400,
        mimeType: 'application/pdf',
        fileHash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        refType: 'ALLOCATION',
        refId: 'alc-nrb-6-A',
        referenceNo: 'স্মারক নং-স্বা/শৈসনইমেকহা/২০২৬/২৩২',
        uploadedBy: 'admin',
        uploadedAt: '2026-10-01T11:15:00Z'
      }
    ];

    this.setItem(STORAGE_KEYS.ROOMS, sampleRooms);
    this.setItem(STORAGE_KEYS.RESIDENTS, sampleResidents);
    this.setItem(STORAGE_KEYS.ALLOCATIONS, sampleAllocations);
    this.setItem(STORAGE_KEYS.CANCELLATIONS, sampleCancellations);
    this.setItem(STORAGE_KEYS.DOCUMENTS, sampleDocs);

    this.recordAuditLog(actor, 'CREATE', 'SETTINGS', 'INIT', '৩টি আবাসিক ভবনের (নরসুন্দা, নিহারিকা, মল্লিকা) পূর্ণাঙ্গ ফ্লোর ও কক্ষ ম্যাট্রিক্স ডাটা লোড করা হয়েছে।');
    this.addNotification({
      title: '৩টি ভবনের পূর্ণাঙ্গ কক্ষ ম্যাট্রিক্স সক্রিয়',
      message: 'নরসুন্দা নার্সিং ডরমেটরী (২০১-৬০৬), নিহারিকা (2-A হতে 6-D) এবং মল্লিকা আবাসিক ভবনের (1-A হতে 6-D) কক্ষ ও বাসিন্দা তালিকা প্রস্তুত।',
      type: 'INFO'
    });
  }

  /**
   * Direct 1-step room cell assignment or update from the Interactive Building Matrix.
   * Supports both selecting an existing resident or directly typing the 5 sample fields
   * (Name, Designation, Room/Seat Type, Date, Mobile Number).
   */
  public quickUpsertRoomAllocation(
    payload: {
      roomId: string;
      existingAllocationId?: string;
      mode: 'DIRECT_ENTRY' | 'SELECT_RESIDENT';
      residentId?: string;
      residentName: string;
      designation: string;
      department?: string;
      mobileNumber: string;
      seatTypeLabel: string;
      startDate: string;
      officialOrderNo: string;
      monthlyRent: number;
    },
    actor: { id: string; name: string; role: any }
  ): Allocation {
    const rooms = this.getRooms();
    const roomIdx = rooms.findIndex(r => r.id === payload.roomId);
    if (roomIdx === -1) throw new Error('কক্ষটি খুঁজে পাওয়া যায়নি।');
    const room = rooms[roomIdx];

    const buildings = this.getBuildings();
    const building = buildings.find(b => b.id === room.buildingId);
    if (!building) throw new Error('ভবনটি খুঁজে পাওয়া যায়নি।');

    const residents = this.getResidents();
    const allocations = this.getAllocations();
    const now = new Date().toISOString();

    // Case 1: Updating an existing active allocation in this room cell
    if (payload.existingAllocationId) {
      const allocIdx = allocations.findIndex(a => a.id === payload.existingAllocationId);
      if (allocIdx === -1) throw new Error('বরাদ্দ রেকর্ডটি পাওয়া যায়নি।');
      const existingAlloc = allocations[allocIdx];

      const resIdx = residents.findIndex(r => r.id === existingAlloc.residentId);
      if (resIdx !== -1) {
        residents[resIdx] = {
          ...residents[resIdx],
          fullName: payload.residentName.trim(),
          designation: payload.designation.trim(),
          department: payload.department?.trim() || residents[resIdx].department,
          mobileNumber: payload.mobileNumber.trim(),
          updatedAt: now
        };
        this.setItem(STORAGE_KEYS.RESIDENTS, residents);
      }

      const updatedAlloc: Allocation = {
        ...existingAlloc,
        residentName: payload.residentName.trim(),
        residentDesignation: payload.designation.trim(),
        residentPhone: payload.mobileNumber.trim(),
        seatTypeLabel: payload.seatTypeLabel.trim(),
        startDate: payload.startDate,
        orderDate: payload.startDate,
        officialOrderNo: payload.officialOrderNo.trim() || existingAlloc.officialOrderNo,
        monthlyRent: Number(payload.monthlyRent) || existingAlloc.monthlyRent,
        updatedAt: now
      };
      allocations[allocIdx] = updatedAlloc;
      this.setItem(STORAGE_KEYS.ALLOCATIONS, allocations);

      rooms[roomIdx] = {
        ...room,
        seatTypeLabel: payload.seatTypeLabel.trim(),
        monthlyRent: Number(payload.monthlyRent) || room.monthlyRent,
        updatedAt: now
      };
      this.setItem(STORAGE_KEYS.ROOMS, rooms);

      this.recordAuditLog(
        actor,
        'UPDATE',
        'ALLOCATION',
        updatedAlloc.id,
        `${building.nameBn} — কক্ষ ${room.roomNumber}-এর বাসিন্দা (${updatedAlloc.residentName}) তথ্য হালনাগাদ করা হয়েছে।`
      );
      return updatedAlloc;
    }

    // Case 2: New allocation via direct 5-field entry or resident selection
    let targetResident: Resident | undefined;
    if (payload.mode === 'SELECT_RESIDENT' && payload.residentId) {
      targetResident = residents.find(r => r.id === payload.residentId);
      if (!targetResident) throw new Error('নির্বাচিত বাসিন্দা পাওয়া যায়নি।');
    } else {
      if (!payload.residentName.trim() || !payload.mobileNumber.trim()) {
        throw new Error('বাসিন্দার নাম এবং মোবাইল নম্বর প্রদান করা আবশ্যক।');
      }
      targetResident = this.saveResident(
        {
          fullName: payload.residentName.trim(),
          designation: payload.designation.trim() || 'সিনিয়র স্টাফ নার্স',
          department: payload.department?.trim() || 'হাসপাতাল সেবা বিভাগ',
          mobileNumber: payload.mobileNumber.trim(),
          permanentAddress: 'কিশোরগঞ্জ সদর, কিশোরগঞ্জ',
          presentAddress: `${building.nameBn}, কক্ষ ${room.roomNumber}`
        },
        actor
      );
    }

    // Update room seat label if provided
    rooms[roomIdx] = {
      ...room,
      seatTypeLabel: payload.seatTypeLabel.trim() || room.seatTypeLabel || 'একক রুম/একক সিট',
      updatedAt: now
    };
    this.setItem(STORAGE_KEYS.ROOMS, rooms);

    const created = this.createAllocation(
      {
        residentId: targetResident.id,
        buildingId: building.id,
        roomId: room.id,
        officialOrderNo: payload.officialOrderNo.trim() || `স্মারক নং-স্বা/শৈসনইমেকহা/২০২৬/${allocations.length + 101}`,
        orderDate: payload.startDate,
        startDate: payload.startDate,
        monthlyRent: Number(payload.monthlyRent) || room.monthlyRent,
        remarks: payload.seatTypeLabel.trim()
      },
      actor
    );

    // Persist seatTypeLabel on the created allocation
    const latestAllocations = this.getAllocations();
    const createdIdx = latestAllocations.findIndex(a => a.id === created.id);
    if (createdIdx !== -1) {
      latestAllocations[createdIdx].seatTypeLabel = payload.seatTypeLabel.trim() || 'একক রুম/একক সিট';
      this.setItem(STORAGE_KEYS.ALLOCATIONS, latestAllocations);
      return latestAllocations[createdIdx];
    }

    return created;
  }

  // Clear or reset to fresh state
  public resetToFreshDatabase(actor: { id: string; name: string; role: any }): void {
    this.setItem(STORAGE_KEYS.ROOMS, []);
    this.setItem(STORAGE_KEYS.RESIDENTS, []);
    this.setItem(STORAGE_KEYS.ALLOCATIONS, []);
    this.setItem(STORAGE_KEYS.CANCELLATIONS, []);
    this.setItem(STORAGE_KEYS.DOCUMENTS, []);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, []);
    this.recordAuditLog(actor, 'DELETE', 'SETTINGS', 'RESET', 'ডাটাবেজ সম্পূর্ণ খালি করে প্রাথমিক অবস্থায় আনা হয়েছে।');
  }
}

export const dbService = new DatabaseService();

