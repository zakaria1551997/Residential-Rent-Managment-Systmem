/**
 * Pure Business Logic and Validation Rules
 * For Hospital Residential Allocation & Management System
 * শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
 */

import type { Room, Resident, Allocation, CancellationRequest, RoomOccupancyStatus, CancellationStatus } from '../types/index.ts';

/**
 * Converts English digits to Bengali digits.
 */
export function toBanglaNumber(input: number | string | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  const banglaDigits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return str.replace(/[0-9]/g, (digit) => banglaDigits[digit] || digit);
}

/**
 * Validates a Bangladeshi mobile phone number (e.g. 017xxxxxxxx, 018xxxxxxxx, +8801xxxxxxxxx).
 */
export function isValidBangladeshiMobile(phone: string): boolean {
  if (!phone) return false;
  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  // Matches 013-019 followed by 8 digits, with optional +88 or 88 prefix
  const regex = /^(?:\+?88)?01[3-9]\d{8}$/;
  return regex.test(cleanPhone);
}

/**
 * Checks whether a room can accommodate a new resident allocation.
 * Returns { valid: boolean, error?: string }
 */
export function validateRoomAllocation(
  room: Room,
  activeAllocationsForRoom: Allocation[],
  resident: Resident,
  activeAllocationsForResident: Allocation[]
): { valid: boolean; error?: string } {
  // 1. Room existence and status check
  if (!room) {
    return { valid: false, error: 'কক্ষটি পাওয়া যায়নি।' };
  }

  if (room.status === 'MAINTENANCE') {
    return { valid: false, error: 'কক্ষটি বর্তমানে মেরামতের অধীনে রয়েছে (Under Maintenance)।' };
  }

  // 2. Capacity check
  const currentOccupancy = activeAllocationsForRoom.filter(a => a.status === 'ACTIVE').length;
  if (currentOccupancy >= room.capacity) {
    return { 
      valid: false, 
      error: `কক্ষ নং ${room.roomNumber}-এর সর্বোচ্চ ধারণক্ষমতা (${toBanglaNumber(room.capacity)} জন) পূর্ণ হয়ে গেছে।` 
    };
  }

  // 3. Resident active allocation check (Prevent duplicate active quarters for same person)
  const existingActive = activeAllocationsForResident.filter(a => a.status === 'ACTIVE');
  if (existingActive.length > 0) {
    return { 
      valid: false, 
      error: `বাসিন্দা ${resident.fullName} (${resident.designation}) এর নামে ইতোমধ্যে একটি সক্রিয় বাসা বরাদ্দ রয়েছে (আইডি: ${existingActive[0].allocationNumber})।` 
    };
  }

  return { valid: true };
}

/**
 * Determines room occupancy status based on current active allocations and capacity.
 */
export function calculateRoomOccupancyStatus(capacity: number, activeCount: number, isMaintenance: boolean): RoomOccupancyStatus {
  if (isMaintenance) return 'MAINTENANCE';
  if (activeCount <= 0) return 'VACANT';
  if (activeCount >= capacity) return 'OCCUPIED';
  return 'PARTIAL';
}

/**
 * Validates state transition for cancellation request.
 */
export function validateCancellationTransition(
  currentStatus: CancellationStatus,
  targetStatus: CancellationStatus
): { allowed: boolean; error?: string } {
  const allowedTransitions: Record<CancellationStatus, CancellationStatus[]> = {
    'DRAFT': ['PENDING_APPROVAL', 'REJECTED'],
    'PENDING_APPROVAL': ['APPROVED', 'REJECTED'],
    'APPROVED': ['COMPLETED'],
    'REJECTED': [], // Terminal
    'COMPLETED': [] // Terminal
  };

  const nextValidStates = allowedTransitions[currentStatus] || [];
  if (!nextValidStates.includes(targetStatus)) {
    return {
      allowed: false,
      error: `অবস্থা '${currentStatus}' থেকে '${targetStatus}' এ রূপান্তর অনুমোদিত নয়।`
    };
  }
  return { allowed: true };
}

/**
 * Checks whether an approved cancellation effective date has arrived or passed.
 * Date format: YYYY-MM-DD
 */
export function isCancellationEffective(effectiveDate: string, currentDate: Date = new Date()): boolean {
  if (!effectiveDate) return false;
  const eff = new Date(effectiveDate);
  eff.setHours(23, 59, 59, 999);
  return currentDate.getTime() >= eff.getTime();
}

/**
 * Format date in Bengali readable form.
 * e.g., "১৫ অক্টোবর, ২০২৬"
 */
export function formatBanglaDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    
    const day = toBanglaNumber(d.getDate());
    const year = toBanglaNumber(d.getFullYear());
    const banglaMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const month = banglaMonths[d.getMonth()];
    return `${day} ${month}, ${year}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Converts Bengali digits back to English ASCII digits (0-9).
 */
export function toEnglishNumber(input: number | string | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  const englishDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (digit) => englishDigits[digit] || digit);
}

/**
 * Formats a YYYY-MM-DD or DD/MM/YYYY date into DD/MM/YYYY format
 * matching the institutional sample sheet (e.g., "০১/১০/২০২৬" or "01/10/2026").
 */
export function formatBanglaSlashDate(
  dateStr: string | undefined | null,
  digitMode: 'bn' | 'en' = 'bn'
): string {
  if (!dateStr) return '—';
  const trimmed = String(dateStr).trim();
  let formatted = trimmed;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [yyyy, mm, dd] = trimmed.split('T')[0].split('-');
    formatted = `${dd}/${mm}/${yyyy}`;
  }
  return digitMode === 'en' ? toEnglishNumber(formatted) : toBanglaNumber(formatted);
}

/**
 * Formats a mobile number into hyphenated digits matching the institutional chart
 * (e.g., "01711112233" -> "০১৭১১-১১২২৩৩" or "01711-112233").
 */
export function formatBanglaPhone(
  phone: string | undefined | null,
  digitMode: 'bn' | 'en' = 'bn'
): string {
  if (!phone) return '—';
  const clean = String(phone).trim().replace(/\s+/g, '');
  const asciiDigits = toEnglishNumber(clean).replace(/[^0-9]/g, '');
  let formatted = clean;
  if (asciiDigits.length === 11) {
    formatted = `${asciiDigits.slice(0, 5)}-${asciiDigits.slice(5)}`;
  }
  return digitMode === 'en' ? toEnglishNumber(formatted) : toBanglaNumber(formatted);
}

/**
 * Checks if a room belongs to Floor 1 (101..106) of Narasunda Nursing Dormitory,
 * which is excluded per institutional specification (only rooms 201..606 are used).
 */
export function isExcludedNarasundaRoom(
  buildingCodeOrId: string | undefined | null,
  roomNumber: string | undefined | null,
  floor?: number
): boolean {
  if (!buildingCodeOrId) return false;
  const isNarasunda =
    buildingCodeOrId === 'NND-01' ||
    buildingCodeOrId === 'bld-narasunda-01' ||
    buildingCodeOrId.includes('narasunda');
  if (!isNarasunda) return false;
  const rm = String(roomNumber || '').trim();
  if (['101', '102', '103', '104', '105', '106'].includes(rm)) {
    return true;
  }
  if (floor === 1 && /^10\d$/.test(rm)) {
    return true;
  }
  return false;
}

/**
 * Determines whether the "কক্ষের ধরন" (Room Type) field should be shown.
 * Per institutional rules:
 * - নরসুন্দা নার্সিং ডরমেটরী (NND-01 / bld-narasunda-01): true (dropdown with 'একক রুম', 'একক সিট')
 * - নিহারিকা আবাসিক ভবন (NRB-02 / bld-niharika-02) & মল্লিকা আবাসিক ভবন (MRB-03 / bld-mallika-03): false
 */
export function shouldShowRoomTypeField(buildingCodeOrId: string | undefined | null): boolean {
  if (!buildingCodeOrId) return false;
  return (
    buildingCodeOrId === 'NND-01' ||
    buildingCodeOrId === 'bld-narasunda-01' ||
    buildingCodeOrId.includes('narasunda')
  );
}

export const NARASUNDA_ROOM_TYPE_OPTIONS = ['একক রুম', 'একক সিট'] as const;

/**
 * Normalizes a room/seat type value for Narasunda Nursing Dormitory into one of the two
 * official dropdown options: 'একক রুম' or 'একক সিট'.
 */
export function normalizeNarasundaRoomType(value?: string | null): 'একক রুম' | 'একক সিট' {
  if (value && value.trim() === 'একক সিট') {
    return 'একক সিট';
  }
  return 'একক রুম';
}

/**
 * Returns the Bengali room/seat label for the building matrix cell.
 */
export function getRoomSeatTypeLabel(
  category?: string,
  capacity: number = 1,
  customLabel?: string
): string {
  if (customLabel && customLabel.trim().length > 0) {
    return customLabel.trim();
  }
  if (capacity > 1 || category === 'SHARED_ROOM') {
    return `যৌথ রুম/${toBanglaNumber(capacity)} সিট`;
  }
  return 'একক রুম';
}

/**
 * Groups rooms by floor in descending order (top floor first, e.g., 6 -> 5 -> 4 -> 3 -> 2 -> 1)
 * and sorts rooms naturally within each floor (e.g., 601..606 or 6-A..6-D).
 */
export function groupRoomsByFloorDescending(rooms: Room[]): Array<{ floor: number; rooms: Room[] }> {
  const floorMap = new Map<number, Room[]>();
  for (const room of rooms) {
    const fl = Number(room.floor) || 1;
    if (!floorMap.has(fl)) {
      floorMap.set(fl, []);
    }
    floorMap.get(fl)!.push(room);
  }

  const sortedFloors = Array.from(floorMap.keys()).sort((a, b) => b - a);
  return sortedFloors.map((floor) => {
    const floorRooms = floorMap.get(floor)!.slice().sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })
    );
    return { floor, rooms: floorRooms };
  });
}

/**
 * Generates a clean, filesystem-safe filename for PDF/PNG downloads while preserving Bengali characters.
 */
export function buildSafePrintFilename(
  titleBn: string,
  suffix: string = 'ভবন_চার্ট',
  extension: 'pdf' | 'png' | 'html' = 'pdf'
): string {
  const base = (titleBn || 'আবাসিক_ব্যবস্থাপনা')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_');
  const cleanSuffix = suffix.trim().replace(/\s+/g, '_');
  return cleanSuffix ? `${base}_${cleanSuffix}.${extension}` : `${base}.${extension}`;
}

/**
 * Calculates A4 page dimensions and scaling for client-side PDF generation.
 */
export function calculatePdfPageLayout(
  imgWidthPx: number,
  imgHeightPx: number,
  orientation: 'portrait' | 'landscape' = 'portrait',
  fitSinglePage: boolean = true
): {
  pageWidthMm: number;
  pageHeightMm: number;
  marginMm: number;
  renderWidthMm: number;
  renderHeightMm: number;
  offsetXMm: number;
  offsetYMm: number;
  totalPages: number;
} {
  const pageWidthMm = orientation === 'landscape' ? 297 : 210;
  const pageHeightMm = orientation === 'landscape' ? 210 : 297;
  const marginMm = 10;
  const contentWidthMm = pageWidthMm - marginMm * 2;
  const contentHeightMm = pageHeightMm - marginMm * 2;

  const safeW = Math.max(1, imgWidthPx);
  const safeH = Math.max(1, imgHeightPx);

  let renderWidthMm = contentWidthMm;
  let renderHeightMm = (safeH * contentWidthMm) / safeW;

  // If fitSinglePage is requested OR height is within 1.3x of a single page, scale to fit 1 page cleanly
  if (fitSinglePage && renderHeightMm > contentHeightMm) {
    const scaleFactor = contentHeightMm / renderHeightMm;
    renderWidthMm = renderWidthMm * scaleFactor;
    renderHeightMm = contentHeightMm;
  }

  const offsetXMm = marginMm + Math.max(0, (contentWidthMm - renderWidthMm) / 2);
  const offsetYMm = marginMm;
  const totalPages = fitSinglePage
    ? 1
    : Math.max(1, Math.ceil(renderHeightMm / contentHeightMm));

  return {
    pageWidthMm,
    pageHeightMm,
    marginMm,
    renderWidthMm: Number(renderWidthMm.toFixed(2)),
    renderHeightMm: Number(renderHeightMm.toFixed(2)),
    offsetXMm: Number(offsetXMm.toFixed(2)),
    offsetYMm,
    totalPages
  };
}


