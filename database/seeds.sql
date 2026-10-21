-- =============================================================================
-- Hospital Residential Allocation & Management System
-- শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
-- Seed Data for Production Initialization
-- =============================================================================

-- 1. ROLES
INSERT INTO roles (id, name_bn, name_en, description) VALUES
('SUPER_ADMIN', 'সুপার অ্যাডমিনিস্ট্রেটর', 'Super Administrator', 'সম্পূর্ণ সিস্টেম নিয়ন্ত্রণ, ইউজার ব্যবস্থাপনা ও সেটিংস'),
('ADMIN_OFFICER', 'প্রশাসনিক কর্মকর্তা', 'Administrative Officer', 'বাসিন্দা ও কক্ষ ব্যবস্থাপনা, বরাদ্দ এন্ট্রি ও নথি আপলোড'),
('APPROVING_OFFICER', 'অনুমোদনকারী কর্মকর্তা', 'Approving Officer', 'বরাদ্দ ও বাতিলের আবেদন যাচাই ও চূড়ান্ত অনুমোদন/প্রত্যাখ্যান'),
('READ_ONLY', 'পরিদর্শনকারী ইউজার', 'Read-Only User', 'শুধুমাত্র তথ্য ও রিপোর্ট দর্শন এবং প্রিন্ট')
ON CONFLICT (id) DO NOTHING;

-- 2. MANDATORY INSTITUTIONAL BUILDINGS
-- 1. নরসুন্ধা নার্সিং ডরমেটরী
-- 2. নিহারিকা আবাসিক ভবন
-- 3. মল্লিকা আবাসিক ভবন
INSERT INTO buildings (id, code, name_bn, name_en, total_floors, address, description, is_active, maintenance_status) VALUES
('b1111111-1111-1111-1111-111111111111', 'NND-01', 'নরসুন্ধা নার্সিং ডরমেটরী', 'Narasunda Nursing Dormitory', 4, 'হাসপাতাল ক্যাম্পাস পূর্ব অংশ, কিশোরগঞ্জ', 'নার্স ও সিনিয়র স্টাফ নার্সদের জন্য নির্ধারিত ৪ তলা আবাসিক ডরমেটরী', TRUE, 'NORMAL'),
('b2222222-2222-2222-2222-222222222222', 'NRB-02', 'নিহারিকা আবাসিক ভবন', 'Niharika Residential Building', 6, 'হাসপাতাল ক্যাম্পাস উত্তর পার্শ্ব, কিশোরগঞ্জ', 'মেডিকেল অফিসার, কনসালট্যান্ট ও প্রশাসনিক কর্মকর্তাদের জন্য ৬ তলা আবাসিক ভবন', TRUE, 'NORMAL'),
('b3333333-3333-3333-3333-333333333333', 'MRB-03', 'মল্লিকা আবাসিক ভবন', 'Mallika Residential Building', 5, 'হাসপাতাল ক্যাম্পাস দক্ষিণ পার্শ্ব, কিশোরগঞ্জ', 'কর্মচারী ও সহায়ক স্বাস্থ্যকর্মীদের জন্য ৫ তলা পরিবারভিত্তিক আবাসিক ভবন', TRUE, 'NORMAL')
ON CONFLICT (code) DO NOTHING;

-- 3. DEFAULT APPLICATION SETTINGS
INSERT INTO application_settings (
  id, hospital_name_bn, hospital_name_en, ministry_name_bn, sub_title_bn, address_bn,
  contact_email, contact_phone, director_name_bn, director_designation_bn,
  approval_required_for_allocation, approval_required_for_cancellation, server_lan_host, server_lan_port
) VALUES (
  'INSTITUTION_DEFAULT',
  'শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ',
  'Shahid Syed Nazrul Islam Medical College Hospital, Kishoreganj',
  'স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়, স্বাস্থ্য সেবা বিভাগ',
  'সরকারি আবাসিক কোয়ার্টার ও ডরমেটরী প্রশাসন শাখা',
  'যশোদল, কিশোরগঞ্জ-২৩০০',
  'info@ssnimch.gov.bd',
  '০২৯৯৭৭৬১৩৪০',
  'প্রফেসর ডাঃ এ. কে. এম. মোর্শেদ',
  'পরিচালক (উপসচিব পদমর্যাদা)',
  TRUE,
  TRUE,
  '0.0.0.0',
  3000
) ON CONFLICT (id) DO NOTHING;
