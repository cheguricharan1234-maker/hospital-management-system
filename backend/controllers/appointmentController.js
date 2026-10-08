const pool = require('../db');

const departments = {
  Cardiology: { prefix: 'A', doctors: ['Dr. Ravi', 'Dr. Anjali'] },
  Neurology: { prefix: 'N', doctors: ['Dr. Suresh', 'Dr. Priya'] },
  Orthopedics: { prefix: 'O', doctors: ['Dr. Kumar', 'Dr. Meena'] },
  'General Medicine': { prefix: 'G', doctors: ['Dr. Raj', 'Dr. Lakshmi'] },
  Pediatrics: { prefix: 'P', doctors: ['Dr. Arun', 'Dr. Divya'] }
};
const fields = 'id, patient_name, age, phone, department, doctor, DATE_FORMAT(`date`, "%Y-%m-%d") AS `date`, token_number, status';
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validId = value => /^\d+$/.test(value) && Number(value) > 0;

exports.createAppointment = async (req, res) => {
  const { patientName, age, phone, department, doctor, date } = req.body || {};
  if (![patientName, age, phone, department, doctor, date].every(v => v !== undefined && String(v).trim() !== '')) return fail(res, 400, 'Please complete all required fields.');
  const config = departments[department];
  if (!config || !config.doctors.includes(doctor)) return fail(res, 400, 'Choose a valid department and doctor.');
  const parsedAge = Number(age);
  if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) return fail(res, 400, 'Age must be a whole number between 1 and 120.');
  const cleanPhone = String(phone).trim();
  if (!/^\+?[\d\s().-]{7,20}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, '').length < 7 || cleanPhone.replace(/\D/g, '').length > 15) return fail(res, 400, 'Enter a valid phone number with 7 to 15 digits.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return fail(res, 400, 'Enter a valid appointment date.');

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    // The unique key in database.sql is the final guard; the lock serializes token allocation per department/date.
    const [lockRows] = await conn.query('SELECT GET_LOCK(?, 10) AS acquired', [`hospital-token:${department}:${date}`]);
    if (lockRows[0].acquired !== 1) throw new Error('Token allocation lock timed out.');
    const [rows] = await conn.execute('SELECT COALESCE(MAX(CAST(SUBSTRING(token_number, 3) AS UNSIGNED)), 0) AS lastToken FROM appointments WHERE department = ? AND `date` = ?', [department, date]);
    const tokenNumber = `${config.prefix}-${String(Number(rows[0].lastToken) + 1).padStart(3, '0')}`;
    const [result] = await conn.execute('INSERT INTO appointments (patient_name, age, phone, department, doctor, `date`, token_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [String(patientName).trim().slice(0, 100), parsedAge, cleanPhone, department, doctor, date, tokenNumber, 'Waiting']);
    const [created] = await conn.execute(`SELECT ${fields} FROM appointments WHERE id = ?`, [result.insertId]);
    await conn.commit();
    res.status(201).json({ success: true, appointment: created[0] });
  } catch (error) {
    if (conn) await conn.rollback().catch(() => {});
    console.error('Create appointment failed:', error.code || error.message);
    if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'A token conflict occurred. Please submit again.');
    fail(res, 503, 'Could not create the appointment. Check that the database is available and try again.');
  } finally {
    if (conn) {
      await conn.query('SELECT RELEASE_LOCK(?)', [`hospital-token:${department}:${date}`]).catch(() => {});
      conn.release();
    }
  }
};

exports.getAppointments = async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT ' + fields + ' FROM appointments ORDER BY `date` DESC, id DESC');
    res.json({ success: true, appointments: rows });
  } catch (error) { console.error(error.code || error.message); fail(res, 503, 'Appointments are temporarily unavailable. Check the database connection.'); }
};

exports.getAppointment = async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, 'Invalid appointment ID.');
  try {
    const [rows] = await pool.execute(`SELECT ${fields} FROM appointments WHERE id = ?`, [req.params.id]);
    if (!rows.length) return fail(res, 404, 'Appointment not found.');
    res.json({ success: true, appointment: rows[0] });
  } catch (error) { console.error(error.code || error.message); fail(res, 503, 'Could not retrieve the appointment.'); }
};

exports.updateStatus = async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, 'Invalid appointment ID.');
  if (!['Waiting', 'Completed'].includes(req.body?.status)) return fail(res, 400, 'Status must be Waiting or Completed.');
  try {
    const [result] = await pool.execute('UPDATE appointments SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    if (!result.affectedRows) return fail(res, 404, 'Appointment not found.');
    const [rows] = await pool.execute(`SELECT ${fields} FROM appointments WHERE id = ?`, [req.params.id]);
    res.json({ success: true, appointment: rows[0] });
  } catch (error) { console.error(error.code || error.message); fail(res, 503, 'Could not update the appointment.'); }
};

exports.deleteAppointment = async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, 'Invalid appointment ID.');
  try {
    const [result] = await pool.execute('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return fail(res, 404, 'Appointment not found.');
    res.json({ success: true, message: 'Appointment deleted.' });
  } catch (error) { console.error(error.code || error.message); fail(res, 503, 'Could not delete the appointment.'); }
};

exports.getDashboardStats = async (_req, res) => {
  try {
    const [[counts]] = await pool.query("SELECT COUNT(*) AS totalPatients, COALESCE(SUM(`date` = CURDATE()), 0) AS todaysAppointments, COALESCE(SUM(status = 'Waiting'), 0) AS waitingPatients FROM appointments");
    const [current] = await pool.execute("SELECT token_number FROM appointments WHERE `date` = CURDATE() AND status = 'Waiting' ORDER BY id DESC LIMIT 1");
    res.json({ success: true, stats: { ...counts, currentToken: current[0]?.token_number || 'No appointments' } });
  } catch (error) { console.error(error.code || error.message); fail(res, 503, 'Dashboard statistics are temporarily unavailable.'); }
};
