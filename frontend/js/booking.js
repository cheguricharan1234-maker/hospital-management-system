const API_BASE = 'http://localhost:5000/api';
const doctorOptions = {
  Cardiology: ['Dr. Ravi', 'Dr. Anjali'], Neurology: ['Dr. Suresh', 'Dr. Priya'],
  Orthopedics: ['Dr. Kumar', 'Dr. Meena'], 'General Medicine': ['Dr. Raj', 'Dr. Lakshmi'],
  Pediatrics: ['Dr. Arun', 'Dr. Divya']
};
const form = document.getElementById('bookingForm');
const departmentSelect = document.getElementById('department');
const doctorSelect = document.getElementById('doctor');
const dateInput = document.getElementById('date');
const errorBox = document.getElementById('formError');
const successCard = document.getElementById('successCard');
const today = new Date();
dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

departmentSelect.addEventListener('change', () => {
  doctorSelect.replaceChildren(new Option(doctorOptions[departmentSelect.value] ? 'Select doctor' : 'Choose a department first', ''));
  (doctorOptions[departmentSelect.value] || []).forEach(doctor => doctorSelect.add(new Option(doctor, doctor)));
  doctorSelect.disabled = !doctorOptions[departmentSelect.value];
});

function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  errorBox.hidden = true;
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const age = Number(data.age);
  const digitCount = data.phone.replace(/\D/g, '').length;
  if (!Number.isInteger(age) || age < 1 || age > 120) return showError('Please enter a valid age between 1 and 120.');
  if (digitCount < 7 || digitCount > 15) return showError('Please enter a phone number with 7 to 15 digits.');
  if (!doctorOptions[data.department]?.includes(data.doctor)) return showError('Please select a doctor for your department.');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.querySelector('span:first-child').textContent = 'Booking…';
  try {
    const response = await fetch(`${API_BASE}/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Your appointment could not be created.');
    const a = payload.appointment;
    document.getElementById('successToken').textContent = a.token_number;
    document.getElementById('successDetails').innerHTML = [
      ['Patient', a.patient_name], ['Doctor', a.doctor], ['Department', a.department], ['Date', a.date], ['Status', a.status]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
    form.hidden = true;
    document.querySelector('.booking-aside').hidden = true;
    successCard.hidden = false;
    successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    showError(error instanceof TypeError ? 'Could not connect to the server. Start the backend and check the database connection.' : error.message);
  } finally {
    button.disabled = false;
    button.querySelector('span:first-child').textContent = 'Confirm Booking';
  }
});

document.getElementById('bookAnother').addEventListener('click', () => {
  successCard.hidden = true;
  form.hidden = false;
  document.querySelector('.booking-aside').hidden = false;
  form.reset();
  doctorSelect.replaceChildren(new Option('Choose a department first', ''));
  doctorSelect.disabled = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
