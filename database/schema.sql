-- =============================================================================
-- Hospital Residential Allocation & Management System
-- শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
-- Authoritative PostgreSQL Normalized Database Schema
-- Version: 1.0.0 (Production Migration)
-- =============================================================================

-- Enable pgcrypto for UUID generation and cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean drop for idempotency if running in a fresh development database
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- ...

-- 1. ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name_bn VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description_bn VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    role VARCHAR(50) NOT NULL REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INSTITUTIONAL BUILDINGS
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL, -- e.g. 'NND-01', 'NRB-02', 'MRB-03'
    name_bn VARCHAR(200) NOT NULL,    -- নরসুন্ধা নার্সিং ডরমেটরী, নিহারিকা আবাসিক ভবন, মল্লিকা আবাসিক ভবন
    name_en VARCHAR(200) NOT NULL,
    total_floors INT NOT NULL DEFAULT 4 CHECK (total_floors >= 1),
    address TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    maintenance_status VARCHAR(50) DEFAULT 'NORMAL' CHECK (maintenance_status IN ('NORMAL', 'UNDER_MAINTENANCE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ROOMS
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
    floor INT NOT NULL CHECK (floor >= 0),
    room_number VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('SINGLE_ROOM', 'SHARED_ROOM', 'OFFICER_QUARTER', 'DOCTOR_SUITE', 'FAMILY_FLAT')),
    capacity INT NOT NULL DEFAULT 1 CHECK (capacity >= 1),
    current_occupancy INT NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0 AND current_occupancy <= capacity),
    monthly_rent NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_rent >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'VACANT' CHECK (status IN ('VACANT', 'PARTIAL', 'OCCUPIED', 'MAINTENANCE')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_building_room UNIQUE (building_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_building_status ON rooms(building_id, status);
CREATE INDEX IF NOT EXISTS idx_rooms_category ON rooms(category);

-- 5. RESIDENTS
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'RES-2026-0001'
    full_name VARCHAR(200) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    employee_id VARCHAR(100), -- সরকারি পরিচিতি নম্বর
    mobile_number VARCHAR(30) NOT NULL,
    alt_phone VARCHAR(30),
    email VARCHAR(150),
    nid_number VARCHAR(50),
    present_address TEXT,
    permanent_address TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FORMER', 'INACTIVE')),
    remarks TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residents_name_phone ON residents(full_name, mobile_number);
CREATE INDEX IF NOT EXISTS idx_residents_dept ON residents(department);

-- 6. ALLOCATIONS
CREATE TABLE IF NOT EXISTS allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_number VARCHAR(60) UNIQUE NOT NULL, -- e.g. 'ALLOC-2026-0001'
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    category VARCHAR(50) NOT NULL,
    official_order_no VARCHAR(150) NOT NULL, -- স্মারক নং / বরাদ্দ আদেশ নং
    order_date DATE NOT NULL,
    start_date DATE NOT NULL,
    expected_end_date DATE,
    monthly_rent NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED')),
    remarks TEXT,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_allocations_room_status ON allocations(room_id, status);
CREATE INDEX IF NOT EXISTS idx_allocations_resident_status ON allocations(resident_id, status);

-- 7. DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('ALLOCATION_ORDER', 'CANCELLATION_ORDER', 'OFFICIAL_LETTER', 'RESIDENT_NID', 'OTHER')),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash CHAR(64) NOT NULL, -- SHA-256 for tampering detection
    storage_path TEXT NOT NULL,  -- Server-side protected location or encrypted payload
    ref_type VARCHAR(50) NOT NULL,
    ref_id UUID,
    reference_no VARCHAR(150),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_ref ON documents(ref_type, ref_id);

-- 8. CANCELLATION REQUESTS ("বাসা বরাদ্দ বাতিল ব্যবস্থাপনা")
CREATE TABLE IF NOT EXISTS cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number VARCHAR(60) UNIQUE NOT NULL, -- e.g. 'CAN-2026-0001'
    allocation_id UUID NOT NULL REFERENCES allocations(id) ON DELETE RESTRICT,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    cancellation_order_no VARCHAR(150) NOT NULL, -- বাতিল স্মারক নং
    order_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    reason TEXT NOT NULL,
    requested_by VARCHAR(200) NOT NULL,
    requesting_designation VARCHAR(150) NOT NULL,
    approving_officer VARCHAR(200),
    approving_designation VARCHAR(150),
    approval_remarks TEXT,
    approval_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED')),
    remarks TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cancellations_status ON cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancellations_alloc ON cancellation_requests(allocation_id);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(200) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 10. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'INFO' CHECK (type IN ('INFO', 'WARNING', 'SUCCESS', 'URGENT')),
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. APPLICATION SETTINGS
CREATE TABLE IF NOT EXISTS application_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'INSTITUTION_DEFAULT',
    hospital_name_bn VARCHAR(255) NOT NULL DEFAULT 'শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ',
    hospital_name_en VARCHAR(255) NOT NULL DEFAULT 'Shahid Syed Nazrul Islam Medical College Hospital, Kishoreganj',
    ministry_name_bn VARCHAR(255) NOT NULL DEFAULT 'স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়, স্বাস্থ্য সেবা বিভাগ',
    sub_title_bn VARCHAR(255) NOT NULL DEFAULT 'সরকারি আবাসিক কোয়ার্টার ও ডরমেটরী প্রশাসন শাখা',
    address_bn TEXT NOT NULL DEFAULT 'যশোদল, কিশোরগঞ্জ-২৩০০',
    contact_email VARCHAR(150) DEFAULT 'info@ssnimch.gov.bd',
    contact_phone VARCHAR(50) DEFAULT '০২৯৯৭৭৬১৩৪০',
    logo_url TEXT,
    government_emblem_url TEXT,
    director_name_bn VARCHAR(200) DEFAULT 'প্রফেসর ডাঃ এ. কে. এম. মোর্শেদ',
    director_designation_bn VARCHAR(150) DEFAULT 'পরিচালক (উপসচিব পদমর্যাদা)',
    approval_required_for_allocation BOOLEAN DEFAULT TRUE,
    approval_required_for_cancellation BOOLEAN DEFAULT TRUE,
    server_lan_host VARCHAR(100) DEFAULT '0.0.0.0',
    server_lan_port INT DEFAULT 3000,
    theme_color VARCHAR(50) DEFAULT '#0f2b48',
    default_date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. BACKUP HISTORY
CREATE TABLE IF NOT EXISTS backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    total_records INT NOT NULL,
    checksum VARCHAR(100) NOT NULL,
    version VARCHAR(30) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'VALID',
    type VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
