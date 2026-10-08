require('dotenv').config();
const express = require('express');
const cors = require('cors');
const appointmentRoutes = require('./routes/appointmentRoutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20kb' }));
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'CityCare API is running' }));
app.use('/api', appointmentRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found.' }));
app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

const port = Number(process.env.PORT) || 5000;
app.listen(port, () => console.log(`CityCare API listening on port ${port}`));
