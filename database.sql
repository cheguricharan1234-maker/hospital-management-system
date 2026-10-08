CREATE DATABASE IF NOT EXISTS hospital_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hospital_db;

CREATE TABLE IF NOT EXISTS appointments (
  id INT NOT NULL AUTO_INCREMENT,
  patient_name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  department VARCHAR(100) NOT NULL,
  doctor VARCHAR(100) NOT NULL,
  `date` DATE NOT NULL,
  token_number VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Waiting',
  PRIMARY KEY (id),
  UNIQUE KEY uq_department_date_token (department, `date`, token_number),
  INDEX idx_appointments_date_status (`date`, status)
) ENGINE=InnoDB;

-- Sample appointments use stable future-relative dates via CURDATE() for easy dashboard testing.
INSERT INTO appointments (patient_name, age, phone, department, doctor, `date`, token_number, status)
SELECT 'Aarav Sharma', 34, '9876543210', 'Cardiology', 'Dr. Ravi', CURDATE(), 'A-001', 'Waiting'
WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE department = 'Cardiology' AND `date` = CURDATE() AND token_number = 'A-001');
INSERT INTO appointments (patient_name, age, phone, department, doctor, `date`, token_number, status)
SELECT 'Maya Patel', 28, '9876501234', 'Neurology', 'Dr. Priya', CURDATE(), 'N-001', 'Waiting'
WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE department = 'Neurology' AND `date` = CURDATE() AND token_number = 'N-001');
INSERT INTO appointments (patient_name, age, phone, department, doctor, `date`, token_number, status)
SELECT 'Rohan Kumar', 52, '9988776655', 'Orthopedics', 'Dr. Meena', CURDATE(), 'O-001', 'Completed'
WHERE NOT EXISTS (SELECT 1 FROM appointments WHERE department = 'Orthopedics' AND `date` = CURDATE() AND token_number = 'O-001');
