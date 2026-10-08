const API_BASE = 'http://localhost:5000/api';
const appointmentsBody = document.getElementById('appointmentsBody');
const errorBox = document.getElementById('dashboardError');
const tableMessage = document.getElementById('tableMessage');
let appointments = [];
let activeStatus = 'All';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
async function request(url, options) {
  const response = await fetch(`${API_BASE}${url}`, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'The request could not be completed.');
  return payload;
}
async function loadDashboard() {
  errorBox.hidden = true;
  try {
    const [statsResult, appointmentsResult] = await Promise.all([request('/dashboard/stats'), request('/appointments')]);
    const stats = statsResult.stats;
    document.getElementById('totalPatients').textContent = stats.totalPatients;
    document.getElementById('todaysAppointments').textContent = stats.todaysAppointments;
    document.getElementById('waitingPatients').textContent = stats.waitingPatients;
    document.getElementById('currentToken').textContent = stats.currentToken;
    appointments = appointmentsResult.appointments;
    renderTable();
  } catch (error) {
    showError(error instanceof TypeError ? 'Could not connect to the API. Start the backend and confirm MySQL is configured.' : error.message);
    appointmentsBody.replaceChildren();
    tableMessage.textContent = 'Appointments could not be loaded.';
    tableMessage.hidden = false;
  }
}
function renderTable() {
  const department = document.getElementById('departmentFilter').value;
  const visible = appointments.filter(a => (activeStatus === 'All' || a.status === activeStatus) && (department === 'All' || a.department === department));
  appointmentsBody.innerHTML = visible.map(a => `<tr>
    <td>${a.id}</td><td class="patient-cell">${escapeHtml(a.patient_name)}</td><td>${a.age}</td><td>${escapeHtml(a.phone)}</td><td>${escapeHtml(a.department)}</td><td>${escapeHtml(a.doctor)}</td><td>${escapeHtml(a.date)}</td><td><span class="token-chip">${escapeHtml(a.token_number)}</span></td>
    <td><span class="status-badge ${a.status === 'Completed' ? 'status-completed' : 'status-waiting'}">${escapeHtml(a.status)}</span></td>
    <td class="action-cell">${a.status === 'Waiting' ? `<button class="action-button complete-action" data-action="complete" data-id="${a.id}">Mark Completed</button>` : '<span class="done-label">Done</span>'}<button class="action-button delete-action" data-action="delete" data-id="${a.id}">Delete</button></td></tr>`).join('');
  tableMessage.textContent = appointments.length === 0 ? 'No appointments' : 'No appointments match these filters.';
  tableMessage.hidden = visible.length !== 0;
}

document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => {
  document.querySelector('.filter-button.active')?.classList.remove('active');
  button.classList.add('active');
  activeStatus = button.dataset.status;
  renderTable();
}));
document.getElementById('departmentFilter').addEventListener('change', renderTable);
document.getElementById('refreshButton').addEventListener('click', loadDashboard);
appointmentsBody.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  button.disabled = true;
  try {
    if (button.dataset.action === 'complete') {
      const result = await request(`/appointments/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Completed' }) });
      appointments = appointments.map(a => a.id === Number(id) ? result.appointment : a);
    } else {
      const patient = appointments.find(a => a.id === Number(id));
      if (!window.confirm(`Delete the appointment for ${patient?.patient_name || 'this patient'}?`)) return;
      await request(`/appointments/${id}`, { method: 'DELETE' });
      appointments = appointments.filter(a => a.id !== Number(id));
    }
    renderTable();
    const statsResult = await request('/dashboard/stats');
    const stats = statsResult.stats;
    document.getElementById('totalPatients').textContent = stats.totalPatients;
    document.getElementById('todaysAppointments').textContent = stats.todaysAppointments;
    document.getElementById('waitingPatients').textContent = stats.waitingPatients;
    document.getElementById('currentToken').textContent = stats.currentToken;
  } catch (error) { showError(error.message); button.disabled = false; }
});

loadDashboard();
