import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toBanglaNumber,
  toEnglishNumber,
  isValidBangladeshiMobile,
  validateRoomAllocation,
  calculateRoomOccupancyStatus,
  validateCancellationTransition,
  isCancellationEffective,
  formatBanglaDate,
  formatBanglaSlashDate,
  formatBanglaPhone,
  isExcludedNarasundaRoom,
  shouldShowRoomTypeField,
  NARASUNDA_ROOM_TYPE_OPTIONS,
  normalizeNarasundaRoomType,
  getRoomSeatTypeLabel,
  groupRoomsByFloorDescending,
  buildSafePrintFilename,
  calculatePdfPageLayout
} from './rules.ts';
import type { Room, Resident, Allocation } from '../types/index.ts';

test('toBanglaNumber converts English numerals to Bengali numerals correctly', () => {
  assert.equal(toBanglaNumber('101'), '১০১');
  assert.equal(toBanglaNumber(2026), '২০২৬');
  assert.equal(toBanglaNumber(0), '০');
  assert.equal(toBanglaNumber('Room 405 Floor 4'), 'Room ৪০৫ Floor ৪');
});

test('isValidBangladeshiMobile validates legitimate Bangladeshi operator numbers', () => {
  assert.equal(isValidBangladeshiMobile('01712345678'), true);
  assert.equal(isValidBangladeshiMobile('+8801812345678'), true);
  assert.equal(isValidBangladeshiMobile('8801912345678'), true);
  assert.equal(isValidBangladeshiMobile('01512345678'), true);
  
  // Invalid formats
  assert.equal(isValidBangladeshiMobile('01212345678'), false); // 012 is invalid operator
  assert.equal(isValidBangladeshiMobile('123456'), false);
  assert.equal(isValidBangladeshiMobile(''), false);
});

test('validateRoomAllocation blocks allocation if room is under maintenance', () => {
  const room: Room = {
    id: 'room-1',
    buildingId: 'b-1',
    floor: 2,
    roomNumber: '২০১',
    category: 'SINGLE_ROOM',
    capacity: 1,
    currentOccupancy: 0,
    monthlyRent: 2000,
    status: 'MAINTENANCE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const resident: Resident = {
    id: 'res-1',
    residentIdNumber: 'RES-001',
    fullName: 'ডাঃ মোস্তাফিজুর রহমান',
    designation: 'সহকারী অধ্যাপক',
    department: 'মেডিসিন',
    mobileNumber: '01711000000',
    permanentAddress: 'কিশোরগঞ্জ',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin'
  };

  const result = validateRoomAllocation(room, [], resident, []);
  assert.equal(result.valid, false);
  assert.match(result.error!, /মেরামত/);
});

test('validateRoomAllocation prevents exceeding room capacity', () => {
  const room: Room = {
    id: 'room-1',
    buildingId: 'b-1',
    floor: 1,
    roomNumber: '১০১',
    category: 'SINGLE_ROOM',
    capacity: 1,
    currentOccupancy: 1,
    monthlyRent: 1500,
    status: 'OCCUPIED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existingAlloc: Allocation = {
    id: 'alloc-1',
    allocationNumber: 'ALLOC-2026-001',
    residentId: 'res-old',
    buildingId: 'b-1',
    roomId: 'room-1',
    category: 'SINGLE_ROOM',
    officialOrderNo: 'স্মারক-১২',
    orderDate: '2026-01-01',
    startDate: '2026-01-01',
    monthlyRent: 1500,
    status: 'ACTIVE',
    documentIds: [],
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const newResident: Resident = {
    id: 'res-2',
    residentIdNumber: 'RES-002',
    fullName: 'মোছাঃ ফাতেমা খাতুন',
    designation: 'সিনিয়র স্টাফ নার্স',
    department: 'নার্সিং শাখা',
    mobileNumber: '01811000000',
    permanentAddress: 'কিশোরগঞ্জ সদর',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin'
  };

  const result = validateRoomAllocation(room, [existingAlloc], newResident, []);
  assert.equal(result.valid, false);
  assert.match(result.error!, /সর্বোচ্চ ধারণক্ষমতা/);
});

test('validateRoomAllocation prevents duplicate active allocation for the same resident', () => {
  const room: Room = {
    id: 'room-2',
    buildingId: 'b-1',
    floor: 2,
    roomNumber: '২০২',
    category: 'SINGLE_ROOM',
    capacity: 1,
    currentOccupancy: 0,
    monthlyRent: 1800,
    status: 'VACANT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const resident: Resident = {
    id: 'res-3',
    residentIdNumber: 'RES-003',
    fullName: 'মোঃ রফিকুল ইসলাম',
    designation: 'মেডিকেল টেকনোলজিস্ট',
    department: 'ল্যাবরেটরি',
    mobileNumber: '01911000000',
    permanentAddress: 'করিমগঞ্জ, কিশোরগঞ্জ',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin'
  };

  const activeExistingAlloc: Allocation = {
    id: 'alloc-2',
    allocationNumber: 'ALLOC-2026-002',
    residentId: 'res-3',
    buildingId: 'b-1',
    roomId: 'room-prev',
    category: 'SINGLE_ROOM',
    officialOrderNo: 'স্মারক-৩৪',
    orderDate: '2026-02-01',
    startDate: '2026-02-01',
    monthlyRent: 1800,
    status: 'ACTIVE',
    documentIds: [],
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const result = validateRoomAllocation(room, [], resident, [activeExistingAlloc]);
  assert.equal(result.valid, false);
  assert.match(result.error!, /ইতোমধ্যে একটি সক্রিয় বাসা বরাদ্দ রয়েছে/);
});

test('calculateRoomOccupancyStatus computes status correctly', () => {
  assert.equal(calculateRoomOccupancyStatus(2, 0, false), 'VACANT');
  assert.equal(calculateRoomOccupancyStatus(2, 1, false), 'PARTIAL');
  assert.equal(calculateRoomOccupancyStatus(2, 2, false), 'OCCUPIED');
  assert.equal(calculateRoomOccupancyStatus(2, 0, true), 'MAINTENANCE');
});

test('validateCancellationTransition enforces official workflow transitions', () => {
  assert.equal(validateCancellationTransition('DRAFT', 'PENDING_APPROVAL').allowed, true);
  assert.equal(validateCancellationTransition('PENDING_APPROVAL', 'APPROVED').allowed, true);
  assert.equal(validateCancellationTransition('PENDING_APPROVAL', 'REJECTED').allowed, true);
  assert.equal(validateCancellationTransition('APPROVED', 'COMPLETED').allowed, true);
  
  // Illegal jumps
  assert.equal(validateCancellationTransition('DRAFT', 'APPROVED').allowed, false);
  assert.equal(validateCancellationTransition('REJECTED', 'APPROVED').allowed, false);
});

test('isCancellationEffective checks effective date correctly', () => {
  const pastDate = '2026-01-01';
  const futureDate = '2026-12-31';
  const today = new Date('2026-10-15T12:00:00Z');

  assert.equal(isCancellationEffective(pastDate, today), true);
  assert.equal(isCancellationEffective(futureDate, today), false);
});

test('formatBanglaDate formats Gregorian dates into Bengali text', () => {
  const formatted = formatBanglaDate('2026-10-15');
  assert.match(formatted, /১৫/);
  assert.match(formatted, /অক্টোবর/);
  assert.match(formatted, /২০২৬/);
});

test('formatBanglaSlashDate and formatBanglaPhone match sample chart conventions', () => {
  assert.equal(formatBanglaSlashDate('2026-10-01'), '০১/১০/২০২৬');
  assert.equal(formatBanglaPhone('01711112233'), '০১৭১১-১১২২৩৩');
  assert.equal(formatBanglaPhone('01711-112233'), '০১৭১১-১১২২৩৩');
  assert.equal(getRoomSeatTypeLabel('SINGLE_ROOM', 1), 'একক রুম');
  assert.equal(getRoomSeatTypeLabel('SHARED_ROOM', 2), 'যৌথ রুম/২ সিট');
});

test('groupRoomsByFloorDescending orders floors top-to-bottom (6 down to 1) and rooms left-to-right', () => {
  const rooms: Room[] = [
    { id: '1', buildingId: 'b1', floor: 1, roomNumber: '102', category: 'SINGLE_ROOM', capacity: 1, currentOccupancy: 0, monthlyRent: 1500, status: 'VACANT', createdAt: '', updatedAt: '' },
    { id: '2', buildingId: 'b1', floor: 6, roomNumber: '602', category: 'SINGLE_ROOM', capacity: 1, currentOccupancy: 0, monthlyRent: 1500, status: 'VACANT', createdAt: '', updatedAt: '' },
    { id: '3', buildingId: 'b1', floor: 6, roomNumber: '601', category: 'SINGLE_ROOM', capacity: 1, currentOccupancy: 0, monthlyRent: 1500, status: 'VACANT', createdAt: '', updatedAt: '' },
    { id: '4', buildingId: 'b1', floor: 1, roomNumber: '101', category: 'SINGLE_ROOM', capacity: 1, currentOccupancy: 0, monthlyRent: 1500, status: 'VACANT', createdAt: '', updatedAt: '' }
  ];
  const grouped = groupRoomsByFloorDescending(rooms);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].floor, 6);
  assert.deepEqual(grouped[0].rooms.map(r => r.roomNumber), ['601', '602']);
  assert.equal(grouped[1].floor, 1);
  assert.deepEqual(grouped[1].rooms.map(r => r.roomNumber), ['101', '102']);
});

test('buildSafePrintFilename preserves Bengali title and strips unsafe path characters', () => {
  assert.equal(
    buildSafePrintFilename('নরসুন্দা নার্সিং ডরমেটরী', 'ভবন_চার্ট', 'pdf'),
    'নরসুন্দা_নার্সিং_ডরমেটরী_ভবন_চার্ট.pdf'
  );
  assert.equal(
    buildSafePrintFilename('স্মারক নং: ৪৫/২০২৬', 'আদেশ_পত্র', 'png'),
    'স্মারক_নং_৪৫২০২৬_আদেশ_পত্র.png'
  );
});

test('calculatePdfPageLayout scales single-page and multi-page A4 dimensions accurately', () => {
  const singlePage = calculatePdfPageLayout(1000, 1600, 'portrait', true);
  assert.equal(singlePage.totalPages, 1);
  assert.ok(singlePage.renderWidthMm <= 190);
  assert.ok(singlePage.renderHeightMm <= 277);

  const multiPage = calculatePdfPageLayout(1000, 3200, 'portrait', false);
  assert.ok(multiPage.totalPages >= 2);
  assert.equal(multiPage.renderWidthMm, 190);
});

test('isExcludedNarasundaRoom excludes 101-106 in Narasunda Nursing Dormitory while preserving 201-606 and other buildings', () => {
  assert.equal(isExcludedNarasundaRoom('bld-narasunda-01', '101', 1), true);
  assert.equal(isExcludedNarasundaRoom('NND-01', '106', 1), true);
  assert.equal(isExcludedNarasundaRoom('bld-narasunda-01', '201', 2), false);
  assert.equal(isExcludedNarasundaRoom('NND-01', '606', 6), false);
  assert.equal(isExcludedNarasundaRoom('bld-mallika-03', '1-A', 1), false);
});

test('formatBanglaSlashDate and formatBanglaPhone support both Bengali and English digitMode for clear legibility', () => {
  assert.equal(formatBanglaSlashDate('2026-10-01', 'bn'), '০১/১০/২০২৬');
  assert.equal(formatBanglaSlashDate('2026-10-01', 'en'), '01/10/2026');
  assert.equal(formatBanglaPhone('01711112233', 'bn'), '০১৭১১-১১২২৩৩');
  assert.equal(formatBanglaPhone('01711112233', 'en'), '01711-112233');
  assert.equal(toEnglishNumber('০১৭১১-১১২২৩৩'), '01711-112233');
});

test('shouldShowRoomTypeField and normalizeNarasundaRoomType enforce Narasunda dropdown options and hide field in Niharika/Mallika', () => {
  assert.equal(shouldShowRoomTypeField('bld-narasunda-01'), true);
  assert.equal(shouldShowRoomTypeField('NND-01'), true);
  assert.equal(shouldShowRoomTypeField('bld-niharika-02'), false);
  assert.equal(shouldShowRoomTypeField('NRB-02'), false);
  assert.equal(shouldShowRoomTypeField('bld-mallika-03'), false);
  assert.equal(shouldShowRoomTypeField('MRB-03'), false);

  assert.deepEqual(NARASUNDA_ROOM_TYPE_OPTIONS, ['একক রুম', 'একক সিট']);
  assert.equal(normalizeNarasundaRoomType('একক সিট'), 'একক সিট');
  assert.equal(normalizeNarasundaRoomType('একক রুম'), 'একক রুম');
  assert.equal(normalizeNarasundaRoomType('একক রুম/একক সিট'), 'একক রুম');
  assert.equal(normalizeNarasundaRoomType(undefined), 'একক রুম');
});

