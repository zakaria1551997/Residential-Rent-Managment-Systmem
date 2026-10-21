/**
 * Hospital Residential Allocation & Management System
 * শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
 * Central Authoritative Backend Server (Express + Vite + Central Persistence)
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  validateRoomAllocation,
  calculateRoomOccupancyStatus,
  isCancellationEffective,
  toBanglaNumber,
  isExcludedNarasundaRoom,
  shouldShowRoomTypeField,
  normalizeNarasundaRoomType
} from './src/logic/rules.ts';
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
  UserRole
} from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'database');
const CENTRAL_DB_PATH = path.join(DATA_DIR, 'central-data.json');
const PROTECTED_DOCS_DIR = path.join(__dirname, 'storage', 'documents');

// Ensure protected directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PROTECTED_DOCS_DIR)) fs.mkdirSync(PROTECTED_DOCS_DIR, { recursive: true });

interface CentralDatabaseState {
  buildings: Building[];
  rooms: Room[];
  residents: Resident[];
  allocations: Allocation[];
  cancellations: CancellationRequest[];
  documents: DocumentRecord[];
  users: User[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  settings: AppSettings;
  backupHistory: BackupMetadata[];
  updatedAt: string;
}

const DEFAULT_BUILDINGS: Building[] = [
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
    description: 'মেডিকেল অফিসার, কনসালট্যান্ট ও চিকিৎসকদের জন্য ৬ তলা কর্মকর্তা আবাসিক ভবন।',
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
    totalFloors: 5,
    description: 'হাসপাতালের ৩য় ও ৪র্থ শ্রেণীর কর্মচারী ও পরিবারবর্গের জন্য ৫ তলা আবাসিক ভবন।',
    address: 'হাসপাতাল ক্যাম্পাস দক্ষিণ পার্শ্ব, কিশোরগঞ্জ সদর',
    isActive: true,
    maintenanceStatus: 'NORMAL',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  }
];

const DEFAULT_SETTINGS: AppSettings = {
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

const DEFAULT_USERS: User[] = [
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

function sanitizeCentralState(state: CentralDatabaseState): CentralDatabaseState {
  state.buildings = (state.buildings || DEFAULT_BUILDINGS).map((b) =>
    b.id === 'bld-narasunda-01'
      ? {
          ...b,
          totalFloors: 5,
          description:
            'সিনিয়র স্টাফ নার্স ও নার্সিং কর্মকর্তাদের জন্য নির্ধারিত ডরমেটরী ভবন (তলা ২–৬, প্রতি তলায় ৬টি কক্ষ: ২০১–৬০৬)।'
        }
      : b
  );
  state.rooms = (state.rooms || [])
    .filter((r) => !isExcludedNarasundaRoom(r.buildingId, r.roomNumber, r.floor))
    .map((r) => ({
      ...r,
      seatTypeLabel: shouldShowRoomTypeField(r.buildingId)
        ? normalizeNarasundaRoomType(r.seatTypeLabel)
        : ''
    }));
  state.allocations = (state.allocations || [])
    .filter((a) => !isExcludedNarasundaRoom(a.buildingId, a.roomNumber))
    .map((a) => ({
      ...a,
      seatTypeLabel: shouldShowRoomTypeField(a.buildingId)
        ? normalizeNarasundaRoomType(a.seatTypeLabel)
        : ''
    }));
  return state;
}

function loadCentralDB(): CentralDatabaseState {
  try {
    if (fs.existsSync(CENTRAL_DB_PATH)) {
      const raw = fs.readFileSync(CENTRAL_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as CentralDatabaseState;
      return sanitizeCentralState(parsed);
    }
  } catch (err) {
    console.error('[SERVER] Error reading central DB, initializing default state:', err);
  }
  const initialState: CentralDatabaseState = {
    buildings: DEFAULT_BUILDINGS,
    rooms: [],
    residents: [],
    allocations: [],
    cancellations: [],
    documents: [],
    users: DEFAULT_USERS,
    auditLogs: [],
    notifications: [],
    settings: DEFAULT_SETTINGS,
    backupHistory: [],
    updatedAt: new Date().toISOString()
  };
  saveCentralDB(initialState);
  return initialState;
}

function saveCentralDB(state: CentralDatabaseState): void {
  sanitizeCentralState(state);
  state.updatedAt = new Date().toISOString();
  const tempPath = `${CENTRAL_DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempPath, CENTRAL_DB_PATH);
}

// Mutex transaction queue for concurrent multi-client safety
let transactionChain: Promise<any> = Promise.resolve();
function withTransactionLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const next = transactionChain.then(() => fn());
  transactionChain = next.catch(() => {});
  return next;
}

function getLanAddresses(): string[] {
  const nets = os.networkInterfaces();
  const results: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results.length > 0 ? results : ['127.0.0.1'];
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  // CORS for LAN desktop clients
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Actor-Id, X-Actor-Role');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 1. Health & LAN Diagnostics Endpoint
  app.get('/api/v1/health', (req, res) => {
    const db = loadCentralDB();
    res.json({
      status: 'OK',
      service: 'SSNIMCH Residential Allocation Central Server',
      institution: 'শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      lanAddresses: getLanAddresses(),
      port: PORT,
      counts: {
        buildings: db.buildings.length,
        rooms: db.rooms.length,
        residents: db.residents.length,
        activeAllocations: db.allocations.filter(a => a.status === 'ACTIVE').length,
        pendingCancellations: db.cancellations.filter(c => c.status === 'PENDING_APPROVAL').length
      }
    });
  });

  // 2. OpenAPI / Swagger 3.0 Specification
  app.get('/api/v1/openapi.json', (req, res) => {
    res.json({
      openapi: '3.0.3',
      info: {
        title: 'Hospital Residential Allocation & Management System API',
        version: '1.0.0',
        description: 'শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ - সেন্ট্রাল ব্যাকএন্ড REST API'
      },
      paths: {
        '/api/v1/health': { get: { summary: 'সার্ভার হেলথ ও ল্যান স্ট্যাটাস পরীক্ষা' } },
        '/api/v1/state': { get: { summary: 'কেন্দ্রীয় ডাটাবেজের পূর্ণাঙ্গ স্টেট গ্রহণ' } },
        '/api/v1/sync': { post: { summary: 'ক্লায়েন্ট-সার্ভার ট্রানজাকশনাল সিঙ্ক' } },
        '/api/v1/allocations': { post: { summary: 'কনকারেন্সি লকসহ নতুন বাসা বরাদ্দ তৈরি' } },
        '/api/v1/cancellations/{id}/decision': { post: { summary: 'বাসা বরাদ্দ বাতিলের অনুমোদন বা প্রত্যাখ্যান' } },
        '/api/v1/documents': { post: { summary: 'নিরাপদ সার্ভার ডিরেক্টরিতে নথি সংরক্ষণ ও হ্যাশ যাচাই' } }
      }
    });
  });

  // 3. Get Authoritative Central State
  app.get('/api/v1/state', (req, res) => {
    const db = loadCentralDB();
    res.json(db);
  });

  // 4. Synchronize / Persist State Atomically
  app.post('/api/v1/sync', async (req, res) => {
    try {
      const updated = await withTransactionLock(() => {
        const current = loadCentralDB();
        const incoming = req.body as Partial<CentralDatabaseState>;
        const merged: CentralDatabaseState = {
          buildings: incoming.buildings ?? current.buildings,
          rooms: incoming.rooms ?? current.rooms,
          residents: incoming.residents ?? current.residents,
          allocations: incoming.allocations ?? current.allocations,
          cancellations: incoming.cancellations ?? current.cancellations,
          documents: incoming.documents ?? current.documents,
          users: incoming.users ?? current.users,
          auditLogs: incoming.auditLogs ?? current.auditLogs,
          notifications: incoming.notifications ?? current.notifications,
          settings: incoming.settings ?? current.settings,
          backupHistory: incoming.backupHistory ?? current.backupHistory,
          updatedAt: new Date().toISOString()
        };
        saveCentralDB(merged);
        return merged;
      });
      res.json({ success: true, updatedAt: updated.updatedAt });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Server-side Protected Document Upload
  app.post('/api/v1/documents', async (req, res) => {
    try {
      const doc = req.body as DocumentRecord;
      if (!doc || !doc.title || !doc.fileName) {
        res.status(400).json({ error: 'নথির শিরোনাম এবং ফাইলের নাম আবশ্যক।' });
        return;
      }

      // Generate server-controlled safe filename (never use unrestricted user path)
      const safeExt = path.extname(doc.fileName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10) || '.bin';
      const storageKey = `${crypto.randomUUID()}${safeExt}`;
      const targetPath = path.join(PROTECTED_DOCS_DIR, storageKey);

      if (doc.dataUrl && doc.dataUrl.includes('base64,')) {
        const base64Data = doc.dataUrl.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
        doc.fileHash = actualHash;
        fs.writeFileSync(targetPath, buffer);
      }

      res.json({ success: true, storageKey, fileHash: doc.fileHash });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'নথি সংরক্ষণে ত্রুটি।' });
    }
  });

  // Mount Vite in development or serve static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SSNIMCH SERVER] Central Backend & Web Client listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
