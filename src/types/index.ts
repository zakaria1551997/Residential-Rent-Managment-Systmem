/**
 * Hospital Residential Allocation & Management System
 * শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
 * Core TypeScript Definitions & Entities
 */

export type UserRole = 
  | 'SUPER_ADMIN'      // সুপার অ্যাডমিনিস্ট্রেটর
  | 'ADMIN_OFFICER'    // প্রশাসনিক কর্মকর্তা
  | 'APPROVING_OFFICER'// অনুমোদনকারী কর্মকর্তা (পরিচালক / উপ-পরিচালক)
  | 'READ_ONLY';       // শুধুমাত্র পরিদর্শনকারী

export interface User {
  id: string;
  username: string;
  fullName: string;
  designation: string;
  role: UserRole;
  email?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type BuildingCode = 'NND-01' | 'NRB-02' | 'MRB-03' | string;

export interface Building {
  id: string;
  nameBn: string;       // নরসুন্ধা নার্সিং ডরমেটরী, নিহারিকা আবাসিক ভবন, মল্লিকা আবাসিক ভবন
  nameEn: string;
  code: BuildingCode;
  totalFloors: number;
  description?: string;
  address?: string;
  isActive: boolean;
  maintenanceStatus: 'NORMAL' | 'UNDER_MAINTENANCE';
  createdAt: string;
  updatedAt: string;
}

export type RoomCategory = 
  | 'SINGLE_ROOM'       // একক কক্ষ
  | 'SHARED_ROOM'       // যৌথ কক্ষ (নার্স/স্টাফ)
  | 'OFFICER_QUARTER'   // কর্মকর্তা কোয়ার্টার
  | 'DOCTOR_SUITE'      // চিকিৎসক স্যুট
  | 'FAMILY_FLAT';      // পারিবারিক ফ্ল্যাট

export type RoomOccupancyStatus = 'VACANT' | 'PARTIAL' | 'OCCUPIED' | 'MAINTENANCE';

export interface Room {
  id: string;
  buildingId: string;
  buildingNameBn?: string;
  floor: number;
  roomNumber: string;   // e.g. "601", "6-A"
  category: RoomCategory;
  seatTypeLabel?: string; // e.g. "একক রুম/একক সিট", "যৌথ রুম/ডাবল সিট"
  capacity: number;     // e.g. 1 for single, 2-4 for shared
  currentOccupancy: number;
  monthlyRent: number;  // সরকারি বাড়ি ভাড়া কর্তন হার
  status: RoomOccupancyStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resident {
  id: string;
  residentIdNumber: string; // e.g. "RES-2026-001"
  fullName: string;
  designation: string;      // e.g. সিনিয়র স্টাফ নার্স, সহকারী সার্জন
  department: string;       // e.g. নার্সিং শাখা, কার্ডিওলজি, প্রশাসনিক শাখা
  employeeId?: string;      // সরকারি পরিচিতি নম্বর / PDS ID
  mobileNumber: string;
  altPhone?: string;
  email?: string;
  nidNumber?: string;
  presentAddress?: string;
  permanentAddress: string;
  status: 'ACTIVE' | 'FORMER' | 'INACTIVE';
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AllocationStatus = 
  | 'PENDING'    // অপেক্ষমাণ
  | 'ACTIVE'     // সক্রিয় বরাদ্দ
  | 'CANCELLED'  // বাতিলকৃত
  | 'EXPIRED';   // মেয়াদোত্তীর্ণ

export interface Allocation {
  id: string;
  allocationNumber: string; // e.g. "ALLOC-2026-0042"
  residentId: string;
  residentName?: string;
  residentDesignation?: string;
  residentPhone?: string;
  buildingId: string;
  buildingNameBn?: string;
  roomId: string;
  roomNumber?: string;
  category: RoomCategory;
  seatTypeLabel?: string;    // e.g. "একক রুম/একক সিট"
  officialOrderNo: string;   // সারক নং / অফিস আদেশ নম্বর
  orderDate: string;         // আদেশ জারি তারিখ
  startDate: string;         // বরাদ্দ শুরুর তারিখ
  expectedEndDate?: string;  // প্রত্যাশিত সমাপ্তির তারিখ
  monthlyRent: number;
  status: AllocationStatus;
  documentIds: string[];
  remarks?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type CancellationStatus = 
  | 'DRAFT'            // খসড়া
  | 'PENDING_APPROVAL' // অনুমোদনের অপেক্ষায়
  | 'APPROVED'         // অনুমোদিত
  | 'REJECTED'         // বাতিল/প্রত্যাখ্যাত
  | 'COMPLETED';       // কার্যকর সম্পন্ন

export interface CancellationRequest {
  id: string;
  trackingNumber: string;     // e.g. "CAN-2026-0015"
  allocationId: string;
  residentId: string;
  residentName: string;
  residentDesignation: string;
  buildingId: string;
  buildingNameBn: string;
  roomId: string;
  roomNumber: string;
  cancellationOrderNo: string; // বাতিল স্মারক নম্বর
  orderDate: string;           // আদেশ তারিখ
  effectiveDate: string;       // যে তারিখ হতে বাতিল কার্যকর হবে
  reason: string;              // বাতিলের কারণ (বিকাশ/বদলি/অবসর/স্বেচ্ছায় ত্যাগ)
  requestedBy: string;         // আবেদনকারী কর্মকর্তা
  requestingDesignation: string;
  approvingOfficer?: string;   // অনুমোদনকারী কর্মকর্তা
  approvingDesignation?: string;
  approvalRemarks?: string;
  approvalDate?: string;
  status: CancellationStatus;
  documentIds: string[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  category: 'ALLOCATION_ORDER' | 'CANCELLATION_ORDER' | 'OFFICIAL_LETTER' | 'RESIDENT_NID' | 'OTHER';
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string; // SHA-256 for integrity
  dataUrl?: string; // Stored payload (or server storage link)
  refType: 'ALLOCATION' | 'CANCELLATION' | 'RESIDENT' | 'BUILDING' | 'GENERAL';
  refId?: string;
  referenceNo?: string; // সারক নম্বর
  uploadedBy: string;
  uploadedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT' | 'BACKUP' | 'RESTORE';
  entityType: 'BUILDING' | 'ROOM' | 'RESIDENT' | 'ALLOCATION' | 'CANCELLATION' | 'USER' | 'SETTINGS' | 'DOCUMENT';
  entityId: string;
  details: string;
  beforeData?: string;
  afterData?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  hospitalNameBn: string;
  hospitalNameEn: string;
  ministryNameBn: string;
  subTitleBn: string;
  addressBn: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string;
  governmentEmblemUrl: string;
  directorNameBn: string;
  directorDesignationBn: string;
  approvalRequiredForAllocation: boolean;
  approvalRequiredForCancellation: boolean;
  serverLanHost: string;
  serverLanPort: number;
  themeColor: string;
  defaultDateFormat: string;
  updatedAt: string;
}

export interface BackupMetadata {
  id: string;
  fileName: string;
  createdAt: string;
  fileSize: number;
  totalRecords: number;
  checksum: string;
  version: string;
  status: 'VALID' | 'RESTORED' | 'CORRUPTED';
  type: 'MANUAL' | 'SCHEDULED';
}

export interface SystemStats {
  totalBuildings: number;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  maintenanceRooms: number;
  activeAllocations: number;
  totalActiveResidents: number;
  pendingCancellations: number;
  completedCancellations: number;
  missingDocuments: number;
  occupancyPercentage: number;
}
