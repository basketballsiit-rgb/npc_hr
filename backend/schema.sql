-- Create database if not exists (Uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS eleve_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE eleve_db;

-- 1. Table for User Accounts
CREATE TABLE IF NOT EXISTS users (
    userId VARCHAR(50) PRIMARY KEY,
    fullName VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- 'admin', 'user'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved'
    lineUserId VARCHAR(100) DEFAULT NULL,
    staffType VARCHAR(50) DEFAULT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table for Leave Requests
CREATE TABLE IF NOT EXISTS leave_data (
    leaveId VARCHAR(50) PRIMARY KEY,
    userId VARCHAR(50) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    schoolName VARCHAR(150) NOT NULL,
    requestDate DATE NOT NULL,
    leaveType VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    totalDays DECIMAL(5, 2) NOT NULL,
    lastLeaveType VARCHAR(100) DEFAULT NULL,
    lastLeaveStartDate DATE DEFAULT NULL,
    lastLeaveEndDate DATE DEFAULT NULL,
    lastLeaveTotalDays DECIMAL(5, 2) DEFAULT 0.00,
    contactAddress TEXT NOT NULL,
    contactPhone VARCHAR(20) NOT NULL,
    signatureUrl VARCHAR(255) NOT NULL, -- Store file path (e.g. /uploads/signatures/sig_xxx.png)
    status VARCHAR(50) DEFAULT 'รอการอนุมัติ', -- 'รอการอนุมัติ', 'อนุมัติ', 'ไม่อนุมัติ', 'ยกเลิกโดยผู้ใช้'
    approverComment TEXT DEFAULT NULL,
    approverSignatureUrl VARCHAR(255) DEFAULT NULL,
    approverName VARCHAR(100) DEFAULT NULL,
    approverPosition VARCHAR(100) DEFAULT NULL,
    approvalDate VARCHAR(50) DEFAULT NULL,
    pdfUrl VARCHAR(255) DEFAULT NULL,
    teacherName TEXT,
    subject TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table for General Settings (Key-Value)
CREATE TABLE IF NOT EXISTS settings (
    settingKey VARCHAR(50) PRIMARY KEY,
    settingValue TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table for Holidays
CREATE TABLE IF NOT EXISTS holidays (
    holidayDate DATE PRIMARY KEY,
    description VARCHAR(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table for Attendance Check-in
CREATE TABLE IF NOT EXISTS attendance (
    attendanceId INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(50) NOT NULL,
    attendanceDate DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    updatedBy VARCHAR(50) NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_date (userId, attendanceDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table for Travel Requests (ขออนุญาตเดินทางไปราชการ)
CREATE TABLE IF NOT EXISTS travel_data (
    travelId VARCHAR(50) PRIMARY KEY,
    userId VARCHAR(50) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    totalDays DECIMAL(5, 2) NOT NULL,
    budget DECIMAL(10, 2) DEFAULT 0.00,
    vehicleType VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'รอการอนุมัติ',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table for Travel Reports (รายงานการเดินทางไปราชการ)
CREATE TABLE IF NOT EXISTS travel_reports (
    reportId VARCHAR(50) PRIMARY KEY,
    travelId VARCHAR(50) NOT NULL,
    userId VARCHAR(50) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    reportDetail TEXT NOT NULL,
    benefits TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table for Training Records (บันทึกการอบรม)
CREATE TABLE IF NOT EXISTS training_data (
    trainingId VARCHAR(50) PRIMARY KEY,
    userId VARCHAR(50) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    courseName VARCHAR(255) NOT NULL,
    organizer VARCHAR(255) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    hours DECIMAL(5, 2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table for College Activities (กิจกรรมวิทยาลัย)
CREATE TABLE IF NOT EXISTS activities (
    activityId VARCHAR(50) PRIMARY KEY,
    activityName VARCHAR(255) NOT NULL,
    activityDate DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table for Activity Participants (การเข้าร่วมกิจกรรม)
CREATE TABLE IF NOT EXISTS activity_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activityId VARCHAR(50) NOT NULL,
    userId VARCHAR(50) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    registeredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_activity (activityId, userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO settings (settingKey, settingValue) VALUES
('schoolName', 'วิทยาลัยสารพัดช่างน่าน')
ON DUPLICATE KEY UPDATE settingValue=settingValue;

INSERT INTO settings (settingKey, settingValue) VALUES
('adminGroupId', '')
ON DUPLICATE KEY UPDATE settingValue=settingValue;
