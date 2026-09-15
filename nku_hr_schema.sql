-- =====================================================================
-- NKU HR SERVICES PORTAL - DATABASE SCHEMA (MySQL 8.x / Aiven Compatible)
-- =====================================================================
-- PT. NINDYA KRIDA UTAMA (NKU)
-- Database yang dipakai: NKU_HRService-Portal1 (BUKAN defaultdb).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- 1. KONFIGURASI SISTEM & PERUSAHAAN
CREATE TABLE IF NOT EXISTS company_profile (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(150) NOT NULL,
    logo_url MEDIUMTEXT,
    address TEXT,
    phone VARCHAR(30),
    email VARCHAR(100),
    tax_id VARCHAR(50) COMMENT 'NPWP',
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    theme_mode ENUM('light','dark') DEFAULT 'light',
    color_palette VARCHAR(20) DEFAULT '#1E88E5',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS company_holidays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    holiday_date DATE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type ENUM('nasional','cuti_bersama') NOT NULL DEFAULT 'nasional',
    is_recurring_yearly BOOLEAN DEFAULT FALSE,
    synced_from_global_calendar BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_holiday (holiday_date, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS db_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_name VARCHAR(100) NOT NULL DEFAULT 'Primary Connection',
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL DEFAULT 3306,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_encrypted TEXT NOT NULL COMMENT 'Simpan terenkripsi (AES/KMS), jangan plaintext',
    ssl_mode ENUM('DISABLED','PREFERRED','REQUIRED','VERIFY_CA','VERIFY_IDENTITY') DEFAULT 'REQUIRED',
    ssl_ca_cert_path VARCHAR(255) COMMENT 'Path file ca.pem yang diupload lewat app',
    ssl_client_cert_path VARCHAR(255) COMMENT 'Path file client cert .pem (opsional)',
    ssl_client_key_path VARCHAR(255) COMMENT 'Path file client key .pem (opsional)',
    provider ENUM('aiven','self_hosted','other') DEFAULT 'aiven',
    is_active BOOLEAN DEFAULT TRUE,
    last_connection_status ENUM('unknown','connected','failed') DEFAULT 'unknown',
    last_tested_at DATETIME,
    tested_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS db_sync_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    action_type ENUM('seed','push','pull','table_create','table_edit','table_delete','test_connection') NOT NULL,
    table_name VARCHAR(100),
    status ENUM('success','failed','in_progress') NOT NULL,
    message TEXT,
    row_count INT DEFAULT 0,
    executed_by INT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(50),
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. AUTH & ROLE
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_key VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    can_manage_db_config BOOLEAN DEFAULT FALSE,
    can_manage_payroll_rules BOOLEAN DEFAULT FALSE,
    can_manage_master_data BOOLEAN DEFAULT FALSE,
    can_approve_requests BOOLEAN DEFAULT FALSE,
    is_system_role BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    permission_key VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS divisions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    division_code VARCHAR(20) NOT NULL UNIQUE,
    division_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job_grades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grade_code VARCHAR(20) NOT NULL UNIQUE,
    grade_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_exempt_from_lateness BOOLEAN DEFAULT FALSE COMMENT 'Bebas denda dan status terlambat saat presensi masuk',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nip VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    division_id INT,
    job_grade_id INT,
    photo_url MEDIUMTEXT,
    email VARCHAR(100),
    phone VARCHAR(30),
    address TEXT,
    join_date DATE,
    base_salary DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Upah per jam (base rate)',
    qr_code VARCHAR(100) UNIQUE COMMENT 'Kode QR identitas presensi karyawan',
    status ENUM('active','inactive','resigned') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL,
    FOREIGN KEY (job_grade_id) REFERENCES job_grades(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    employee_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. JADWAL KERJA
CREATE TABLE IF NOT EXISTS work_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    schedule_name VARCHAR(100) NOT NULL,
    time_in TIME NOT NULL,
    time_out TIME NOT NULL,
    break_start TIME,
    break_end TIME,
    tolerance_minutes INT DEFAULT 0,
    is_lateness_disabled BOOLEAN DEFAULT FALSE COMMENT 'Bebas keterlambatan untuk seluruh karyawan yang memakai jadwal ini',
    exempt_job_grades JSON NULL COMMENT 'Array ID Golongan (job_grades) yang dibebaskan dari toleransi/status telat',
    working_days JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS schedule_plots (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    schedule_id INT NOT NULL,
    scope_type ENUM('general','division','job_grade','employee') NOT NULL DEFAULT 'division',
    scope_id INT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    notes VARCHAR(255),
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES work_schedules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    requester_employee_id INT NOT NULL,
    target_employee_id INT NOT NULL,
    original_plot_id INT,
    requested_plot_id INT,
    swap_date DATE NOT NULL,
    reason VARCHAR(255),
    status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
    approved_by INT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_employee_id) REFERENCES employees(id),
    FOREIGN KEY (target_employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3.4 MASTER LOKASI KERJA & GEOFENCING (PORTAL KARYAWAN & MOBILE CLOCK-IN)
CREATE TABLE IF NOT EXISTS company_locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    location_code VARCHAR(50) NOT NULL UNIQUE,
    location_name VARCHAR(150) NOT NULL,
    location_type ENUM('head_office','batching_plant','branch_office','warehouse','project_site') DEFAULT 'head_office',
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INT NOT NULL DEFAULT 100 COMMENT 'Radius toleransi absensi geofence dalam meter',
    is_active BOOLEAN DEFAULT TRUE,
    notes VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. ABSENSI
CREATE TABLE IF NOT EXISTS attendance_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    location_id INT NULL COMMENT 'Relasi ke company_locations untuk kemudahan reporting lokasi',
    location_name VARCHAR(150) NULL COMMENT 'Nama lokasi fisik kerja (misal: Batching Plant, Head Office)',
    log_date DATE NOT NULL,
    scan_time DATETIME NOT NULL,
    log_type ENUM('in','out') NOT NULL,
    method ENUM('rfid','qr','nip_manual','mobile_gps') NOT NULL,
    device_id VARCHAR(50),
    latitude DECIMAL(10, 8) NULL COMMENT 'Koordinat Latitude GPS dari ponsel/aplikasi mobile',
    longitude DECIMAL(11, 8) NULL COMMENT 'Koordinat Longitude GPS dari ponsel/aplikasi mobile',
    location_address TEXT NULL COMMENT 'Alamat atau keterangan geolokasi saat clock in/out',
    is_mock_location BOOLEAN DEFAULT FALSE COMMENT 'Deteksi fake GPS / mock location',
    status ENUM('on_time','late','early_leave','normal') DEFAULT 'normal',
    notes VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES company_locations(id) ON DELETE SET NULL,
    INDEX idx_att_emp_date (employee_id, log_date),
    INDEX idx_att_loc (location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. REQUESTS
CREATE TABLE IF NOT EXISTS leave_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(100) NOT NULL,
    default_quota_days INT DEFAULT 0,
    is_paid BOOLEAN DEFAULT TRUE,
    requires_attachment BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_balances (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    year INT NOT NULL,
    quota_days DECIMAL(5,1) DEFAULT 0,
    used_days DECIMAL(5,1) DEFAULT 0,
    carry_forward_days DECIMAL(5,1) DEFAULT 0 COMMENT 'Sisa cuti tahun lalu berlaku s/d akhir Februari',
    carry_forward_expires_at DATE COMMENT 'Batas kedaluwarsa cuti tahun lalu (28/29 Februari)',
    carry_forward_expired BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
    UNIQUE KEY uq_balance (employee_id, leave_type_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    total_days DECIMAL(5,1) NOT NULL,
    reason TEXT,
    attachment_url MEDIUMTEXT,
    status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
    approved_by INT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS overtime_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    overtime_date DATE NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    total_hours DECIMAL(5,2) NOT NULL,
    reason TEXT,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    approved_by INT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. PENGGAJIAN
CREATE TABLE IF NOT EXISTS overtime_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(150) NOT NULL,
    scope_type ENUM('general','division','job_grade') NOT NULL DEFAULT 'general',
    scope_id INT NULL,
    calc_type ENUM('fixed','percentage','multiplier','custom_formula','timeslot') NOT NULL,
    rate_unit ENUM('per_hour','per_3_hours','per_day','per_spkl') DEFAULT 'per_hour',
    fixed_amount DECIMAL(15,2) DEFAULT NULL,
    percentage_value DECIMAL(6,2) DEFAULT NULL,
    multiplier_value DECIMAL(6,2) DEFAULT NULL,
    custom_formula TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deduction_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(150) NOT NULL,
    scope_type ENUM('general','division','job_grade') NOT NULL DEFAULT 'general',
    scope_id INT NULL,
    calc_type ENUM('fixed','percentage','multiplier','custom_formula') NOT NULL,
    fixed_amount DECIMAL(15,2) DEFAULT NULL,
    percentage_value DECIMAL(6,2) DEFAULT NULL,
    multiplier_value DECIMAL(6,2) DEFAULT NULL,
    custom_formula TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS allowance_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(150) NOT NULL,
    scope_type ENUM('general','division','job_grade') NOT NULL DEFAULT 'general',
    scope_id INT NULL,
    calc_type ENUM('fixed','percentage','multiplier','custom_formula') NOT NULL,
    rate_unit ENUM('per_day','per_month','per_hour') DEFAULT 'per_month',
    fixed_amount DECIMAL(15,2) DEFAULT NULL,
    percentage_value DECIMAL(6,2) DEFAULT NULL,
    multiplier_value DECIMAL(6,2) DEFAULT NULL,
    custom_formula TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_periods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    period_name VARCHAR(100) NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    status ENUM('draft','processed','paid') DEFAULT 'draft',
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_slips (
    id INT PRIMARY KEY AUTO_INCREMENT,
    period_id INT NOT NULL,
    employee_id INT NOT NULL,
    base_salary DECIMAL(15,2) NOT NULL,
    total_points DECIMAL(8,2) NOT NULL,
    gross_base_pay DECIMAL(15,2) NOT NULL,
    total_overtime DECIMAL(15,2) DEFAULT 0,
    total_allowance DECIMAL(15,2) DEFAULT 0,
    total_deduction DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL,
    status ENUM('draft','final','paid') DEFAULT 'draft',
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE KEY uq_slip (period_id, employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_slip_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    slip_id INT NOT NULL,
    item_type ENUM('overtime','deduction','allowance') NOT NULL,
    rule_id INT NULL,
    item_name VARCHAR(150) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (slip_id) REFERENCES payroll_slips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS official_letters (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    letter_type ENUM('warning','recommendation','layoff') NOT NULL,
    letter_number VARCHAR(100) NOT NULL UNIQUE,
    employee_id INT NOT NULL,
    employee_name VARCHAR(150) NOT NULL,
    employee_nip VARCHAR(30),
    division_name VARCHAR(100),
    job_title VARCHAR(100),
    issue_date DATE NOT NULL,
    effective_date DATE,
    warning_level ENUM('SP-1','SP-2','SP-3'),
    violation_reason TEXT,
    validity_months INT DEFAULT 6,
    join_date DATE,
    end_date DATE,
    accomplishments TEXT,
    layoff_reason TEXT,
    severance_notes TEXT,
    company_signatory_name VARCHAR(150),
    company_signatory_title VARCHAR(150),
    employee_acknowledged BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Sample Official Letters (SP, Paklaring, PHK)
INSERT INTO official_letters (id, letter_type, letter_number, employee_id, employee_name, employee_nip, division_name, job_title, issue_date, effective_date, warning_level, violation_reason, validity_months, join_date, end_date, accomplishments, layoff_reason, severance_notes, company_signatory_name, company_signatory_title, employee_acknowledged, notes, created_at)
VALUES 
(1, 'warning', '018/HRD-NKU/SP-I/IX/2026', 1, 'Budi Santoso', 'NKU-0001', 'Operasional & Produksi Ready-Mix', 'Staff Batching Plant', '2026-09-05', '2026-09-05', 'SP-1', 'Keterlambatan presensi kerja sebanyak 4 (empat) kali berturut-turut tanpa pemberitahuan resmi kepada atasan langsung pada periode awal September 2026, melanggar Peraturan Perusahaan Bab IV Pasal 12.', 6, NULL, NULL, NULL, NULL, NULL, 'Siti Rahmawati, S.Psi', 'HRD & GA Manager', 1, 'Surat Peringatan Pertama (SP-1) berlaku selama 6 bulan sejak tanggal diterbitkan.', '2026-09-05 10:00:00'),
(2, 'recommendation', '042/HRD-NKU/SKK/VIII/2026', 4, 'Dewi Lestari', 'NKU-0004', 'Laboratorium & QC Beton', 'QC & Quality Assurance Specialist', '2026-08-30', NULL, NULL, NULL, 6, '2022-03-01', '2026-08-31', 'Menunjukkan dedikasi, integritas, dan profesionalisme tinggi dalam pengujian slump test serta pengendalian mutu beton ready-mix proyek infrastruktur.', NULL, NULL, 'Ir. Hendra Gunawan', 'Direktur Operasional', 1, 'Surat rekomendasi kerja diterbitkan atas permohonan yang bersangkutan.', '2026-08-30 14:00:00'),
(3, 'layoff', '007/DIR-NKU/PHK/IX/2026', 5, 'Rudi Hartono', 'NKU-0005', 'Logistik & Armada Mixer', 'Operator Driver Truck Mixer', '2026-09-01', '2026-09-30', NULL, NULL, 6, NULL, NULL, NULL, 'Restrukturisasi armada pengiriman ready-mix dan rasionalisasi rute site plant wilayah Timur sesuai kesepakatan bersama.', 'Kompensasi pesangon, uang penghargaan masa kerja, dan penggantian hak diproses penuh sesuai UU Cipta Kerja No. 6/2023 Pasal 156.', 'Ir. Hendra Gunawan', 'Direktur Utama', 1, 'Penyerahan perlengkapan kerja & serah terima kendaraan paling lambat 30 September 2026.', '2026-09-01 09:00:00')
ON DUPLICATE KEY UPDATE letter_number = VALUES(letter_number), employee_name = VALUES(employee_name);

-- Seed Master Titik Lokasi Kerja & Geofencing
INSERT INTO company_locations (id, location_code, location_name, location_type, address, latitude, longitude, radius_meters, is_active, notes)
VALUES
(1, 'LOC-HO', 'Head Office Surabaya (Kantor Pusat)', 'head_office', 'Jl. Industri Raya No. 88, Rungkut Industri, Surabaya, Jawa Timur', -7.32450000, 112.76320000, 100, 1, 'Kantor pusat manajemen, direksi, HRD, dan keuangan'),
(2, 'LOC-BP-KLD', 'Batching Plant Kalideres', 'batching_plant', 'Kawasan Industri Daan Mogot Km. 18, Kalideres, Jakarta Barat', -6.15230000, 106.70320000, 150, 1, 'Unit produksi ready-mix dan lab QC beton Jakarta Barat'),
(3, 'LOC-BP-GRS', 'Batching Plant Gresik', 'batching_plant', 'Kawasan Industri Maspion Unit V, Manyar, Gresik, Jawa Timur', -7.16010000, 112.65080000, 150, 1, 'Unit produksi ready-mix Jawa Timur & dermaga semen'),
(4, 'LOC-PUR-JKT', 'Kantor Purchasing & Pengadaan', 'branch_office', 'Gedung Graha Niaga Lt. 3, Jl. Gatot Subroto Kav. 55, Jakarta Selatan', -6.23840000, 106.82470000, 100, 1, 'Kantor divisi purchasing, pengadaan raw material, dan vendor management'),
(5, 'LOC-ARM-CKD', 'Pool Armada Mixer & Gudang Material Cikande', 'warehouse', 'Jl. Raya Serang Km. 68, Kawasan Industri Modern Cikande, Serang, Banten', -6.19520000, 106.36850000, 200, 1, 'Pool bengkel truk mixer dan gudang agregat cadangan')
ON DUPLICATE KEY UPDATE location_name=VALUES(location_name), address=VALUES(address), latitude=VALUES(latitude), longitude=VALUES(longitude), radius_meters=VALUES(radius_meters);

-- Seed Sample Attendance Logs with Mobile GPS and Location Matching
INSERT INTO attendance_logs (id, employee_id, location_id, location_name, log_date, scan_time, log_type, method, device_id, latitude, longitude, location_address, is_mock_location, status, notes)
VALUES
(1, 1, 2, 'Batching Plant Kalideres', '2026-09-04', '2026-09-04 07:54:12', 'in', 'mobile_gps', 'Samsung Galaxy A54 (Mobile Portal)', -6.15231000, 106.70319000, 'Kawasan Industri Daan Mogot Km. 18, Kalideres, Jakarta Barat', 0, 'on_time', 'Clock-in Portal Mobile Karyawan di Batching Plant (Akurasi GPS: 8m)'),
(2, 2, 1, 'Head Office Surabaya (Kantor Pusat)', '2026-09-04', '2026-09-04 08:18:05', 'in', 'qr', 'KIOSK-MAIN-01', -7.32452000, 112.76318000, 'Jl. Industri Raya No. 88, Surabaya', 0, 'late', 'Terlambat 18 menit scan di kiosk kantor pusat'),
(3, 3, 4, 'Kantor Purchasing & Pengadaan', '2026-09-04', '2026-09-04 07:45:30', 'in', 'mobile_gps', 'iPhone 14 Pro (Mobile Portal)', -6.23841000, 106.82468000, 'Gedung Graha Niaga Lt. 3, Jakarta Selatan', 0, 'on_time', 'Clock-in Portal Mobile di Kantor Purchasing (Akurasi GPS: 5m)'),
(4, 4, 1, 'Head Office Surabaya (Kantor Pusat)', '2026-09-04', '2026-09-04 07:58:20', 'in', 'nip_manual', 'KIOSK-MAIN-01', -7.32450000, 112.76320000, 'Jl. Industri Raya No. 88, Surabaya', 0, 'on_time', 'Input manual NIP di Kiosk Head Office'),
(5, 5, 3, 'Batching Plant Gresik', '2026-09-04', '2026-09-04 08:02:11', 'in', 'mobile_gps', 'Xiaomi Redmi Note 12 (Mobile Portal)', -7.16012000, 112.65079000, 'Kawasan Industri Maspion Unit V, Manyar, Gresik', 0, 'on_time', 'Clock-in Mobile GPS di Batching Plant Gresik (Akurasi GPS: 12m)'),
(6, 6, 2, 'Batching Plant Kalideres', '2026-09-04', '2026-09-04 08:25:40', 'in', 'qr', 'KIOSK-BP-01', -6.15235000, 106.70325000, 'Kawasan Industri Daan Mogot Km. 18, Jakarta Barat', 0, 'late', 'Terlambat 25 menit di Kiosk Batching Plant Kalideres')
ON DUPLICATE KEY UPDATE status=VALUES(status), notes=VALUES(notes), location_id=VALUES(location_id), location_name=VALUES(location_name);

SET FOREIGN_KEY_CHECKS = 1;
