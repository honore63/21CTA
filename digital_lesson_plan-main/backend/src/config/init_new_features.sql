-- Update Users table for fingerprinting and security
ALTER TABLE users ADD COLUMN fingerprint VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN last_ip VARCHAR(45) DEFAULT NULL;
ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN reset_expires DATETIME DEFAULT NULL;

-- Create Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL, -- NULL means global notification
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Visitor Tracking table
CREATE TABLE IF NOT EXISTS visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    browser VARCHAR(255),
    device VARCHAR(50),
    os VARCHAR(50),
    page_path VARCHAR(255),
    referrer TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table to track device/user linkage for fraud detection
CREATE TABLE IF NOT EXISTS user_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    fingerprint VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY user_device_idx (user_id, fingerprint),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
