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
    teacherName VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
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

-- Insert default settings
INSERT INTO settings (settingKey, settingValue) VALUES
('schoolName', 'วิทยาลัยสารพัดช่างน่าน')
ON DUPLICATE KEY UPDATE settingValue=settingValue;

INSERT INTO settings (settingKey, settingValue) VALUES
('adminGroupId', '')
ON DUPLICATE KEY UPDATE settingValue=settingValue;
