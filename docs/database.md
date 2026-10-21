# PostgreSQL ডাটাবেজ মডেল ও ইআরডি ডিজাইন (Database Design & Schema)
**প্রতিষ্ঠান:** শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
**ডাটাবেজ সংস্করণ:** PostgreSQL 15+ (Production Architecture)

---

### ১. সত্তা-সম্পর্ক নকশা (Entity Relationship Architecture)

```
[ users ] 1 ───< [ user_roles ] >─── 1 [ roles ] 1 ───< [ role_permissions ] >─── 1 [ permissions ]
    │
    ├─────< [ allocations ] (created_by / approved_by)
    ├─────< [ cancellation_requests ] (created_by)
    ├─────< [ audit_logs ] (actor_id)
    └─────< [ documents ] (uploaded_by)

[ buildings ] 1 ───< [ rooms ] 1 ───< [ allocations ] 1 ───< [ cancellation_requests ]
                             │                 │
                             │                 └─────< [ documents ]
                             │
                      [ residents ] 1 ─────────┘
```

---

### ২. মূল টেবিলসমূহ ও কনস্ট্রেইন্ট (Core Tables & Constraints)

#### ১. `buildings` (আবাসিক ভবন)
- `id` (UUID, Primary Key)
- `code` (VARCHAR(30), Unique, Not Null) - যেমন: `NND-01`, `NRB-02`, `MRB-03`
- `name_bn` (VARCHAR(200), Not Null) - বাংলা নাম
- `name_en` (VARCHAR(200), Not Null) - ইংরেজি নাম
- `total_floors` (INT, CHECK >= 1)
- `maintenance_status` (VARCHAR, 'NORMAL' | 'UNDER_MAINTENANCE')

#### ২. `rooms` (কক্ষ ইনভেন্টরি)
- `id` (UUID, Primary Key)
- `building_id` (UUID, Foreign Key -> buildings.id, ON DELETE RESTRICT)
- `floor` (INT, CHECK >= 0)
- `room_number` (VARCHAR(50), Not Null)
- `category` ('SINGLE_ROOM' | 'SHARED_ROOM' | 'OFFICER_QUARTER' | 'DOCTOR_SUITE' | 'FAMILY_FLAT')
- `capacity` (INT, CHECK >= 1)
- `current_occupancy` (INT, CHECK >= 0 AND <= capacity)
- `monthly_rent` (NUMERIC(10,2))
- `status` ('VACANT' | 'PARTIAL' | 'OCCUPIED' | 'MAINTENANCE')
- **UNIQUE CONSTRAINT:** `(building_id, room_number)` — একই ভবনে ডুপ্লিকেট কক্ষ নম্বর তৈরি প্রতিরোধ।

#### ৩. `residents` (হাসপাতাল বাসিন্দা)
- `id` (UUID, Primary Key)
- `resident_id_number` (VARCHAR(50), Unique) — যেমন: `RES-2026-0001`
- `full_name` (VARCHAR(200), Not Null)
- `designation` (VARCHAR(150), Not Null)
- `department` (VARCHAR(150), Not Null)
- `mobile_number` (VARCHAR(30), Not Null)
- `permanent_address` (TEXT, Not Null)
- `status` ('ACTIVE' | 'FORMER' | 'INACTIVE')

#### ৪. `allocations` (বাসা বরাদ্দ)
- `id` (UUID, Primary Key)
- `allocation_number` (VARCHAR(60), Unique) — যেমন: `ALLOC-2026-0001`
- `resident_id` (UUID, FK -> residents.id)
- `building_id` (UUID, FK -> buildings.id)
- `room_id` (UUID, FK -> rooms.id)
- `official_order_no` (VARCHAR(150), Not Null)
- `order_date` (DATE, Not Null)
- `start_date` (DATE, Not Null)
- `monthly_rent` (NUMERIC(10,2))
- `status` ('PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED')

#### ৫. `cancellation_requests` (বাসা বরাদ্দ বাতিল ব্যবস্থাপনা)
- `id` (UUID, Primary Key)
- `tracking_number` (VARCHAR(60), Unique) — যেমন: `CAN-2026-0001`
- `allocation_id` (UUID, FK -> allocations.id)
- `cancellation_order_no` (VARCHAR(150), Not Null)
- `effective_date` (DATE, Not Null) — যে তারিখ হতে বাতিল কার্যকর হবে
- `reason` (TEXT, Not Null)
- `status` ('DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED')
- `approval_remarks` (TEXT)
- `approving_officer` (VARCHAR(200))

#### ৬. `audit_logs` (নিরাপত্তা ও অডিট ট্রেইল)
- `id` (UUID, Primary Key)
- `actor_id` (UUID, FK -> users.id)
- `actor_name` (VARCHAR(200))
- `action` ('CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT' | 'BACKUP' | 'RESTORE')
- `entity_type` ('BUILDING' | 'ROOM' | 'RESIDENT' | 'ALLOCATION' | 'CANCELLATION' | 'USER' | 'SETTINGS' | 'DOCUMENT')
- `entity_id` (VARCHAR(100))
- `details` (TEXT)
- `before_data` (JSONB)
- `after_data` (JSONB)
- `timestamp` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)

---

### ৩. কনকারেন্সি নিয়ন্ত্রণ ও ট্রানজাকশন আইসোলেশন
- একই কক্ষে অনুমোদিত ধারণক্ষমতার অতিরিক্ত বাসিন্দা বরাদ্দ করা ডাটাবেজ ট্রানজাকশন লেভেলে কঠোরভাবে প্রতিহত করা হয়।
- বাসিন্দা নিবন্ধনে পূর্বের সক্রিয় বরাদ্দ বাতিল না হওয়া পর্যন্ত নতুন বরাদ্দ গ্রহণ করা যায় না।
- বাতিল আদেশ অনুমোদনের ক্ষেত্রে কার্যকর তারিখ ভবিষ্যৎ হলে কক্ষটি সঙ্গে সঙ্গে খালি না করে কার্যকর তারিখ অনুযায়ী অবমুক্ত করা হয়।
