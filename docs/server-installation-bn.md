# কেন্দ্রীয় সার্ভার ইনস্টলেশন নির্দেশিকা (Server Installation Guide)
**প্রতিষ্ঠান:** শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ

---

### ১. সার্ভার প্রয়োজনীয় উপাদান
- **অপারেটিং সিস্টেম:** Windows Server 2019/2022 অথবা Windows 10/11 Pro (Dedicated Office PC) অথবা Ubuntu 22.04 LTS
- **ডাটাবেজ:** PostgreSQL 15 বা তদূর্ধ্ব
- **রানটাইম:** Node.js (v20+ অথবা v22 LTS)
- **র‌্যাম:** ন্যূনতম 8 GB
- **স্টোরেজ:** ন্যূনতম 100 GB SSD (নথিপত্র ও ব্যাকআপের জন্য)

---

### ২. ধাপ ১: PostgreSQL ডাটাবেজ সেটআপ
১. PostgreSQL ইনস্টল করার পর `psql` শেল খুলুন:
```sql
CREATE DATABASE ssnimch_db;
CREATE USER ssnimch_user WITH ENCRYPTED PASSWORD 'StrongAdminPass2026!';
GRANT ALL PRIVILEGES ON DATABASE ssnimch_db TO ssnimch_user;
```
২. স্কিমা ও প্রাথমিক সিড ডাটা এক্সিকিউট করুন:
```bash
psql -U ssnimch_user -d ssnimch_db -f database/schema.sql
psql -U ssnimch_user -d ssnimch_db -f database/seeds.sql
```

---

### ৩. ধাপ ২: সার্ভার অ্যাপ্লিকেশন ডিপ্লয়মেন্ট
১. সার্ভারের নির্ধারিত ফোল্ডারে (যেমন `C:\SSNIMCH_Server`) সোর্স কোড রাখুন।
২. ডিপেন্ডেন্সি ইনস্টল ও বিল্ড তৈরি করুন:
```bash
npm install
npm run build
```
৩. উইন্ডোজ সার্ভিস হিসেবে চালুর জন্য **NSSM** (Non-Sucking Service Manager) ব্যবহার করুন:
```powershell
nssm install SSNIMCH_Service "C:\Program Files\nodejs\node.exe" "C:\SSNIMCH_Server\server.js"
nssm set SSNIMCH_Service AppDirectory "C:\SSNIMCH_Server"
nssm set SSNIMCH_Service Start SERVICE_AUTO_START
nssm start SSNIMCH_Service
```

---

### ৪. ধাপ ৩: উইন্ডোজ ফায়ারওয়াল (Windows Firewall) পোর্ট ওপেন করা
সার্ভারের কমান্ড প্রম্পটে অ্যাডমিনিস্ট্রেটর হিসেবে রান করুন:
```powershell
netsh advfirewall firewall add rule name="SSNIMCH Hospital App" dir=in action=allow protocol=TCP localport=3000
```

---

### ৫. ধাপ ৪: সার্ভারের লোকাল আইপি অ্যাড্রেস সংগ্রহ
সার্ভারে কমান্ড প্রম্পট খুলে চালান:
```cmd
ipconfig
```
IPv4 Address টি নোট করে রাখুন (যেমন: `192.168.1.100`)। এই আইপিটি ক্লায়েন্ট পিসির অ্যাপে যুক্ত করতে হবে।
