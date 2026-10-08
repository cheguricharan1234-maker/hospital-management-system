const express = require('express');
const controller = require('../controllers/appointmentController');
const router = express.Router();

router.post('/appointments', controller.createAppointment);
router.get('/appointments', controller.getAppointments);
router.get('/appointments/:id', controller.getAppointment);
router.put('/appointments/:id/status', controller.updateStatus);
router.delete('/appointments/:id', controller.deleteAppointment);
router.get('/dashboard/stats', controller.getDashboardStats);

module.exports = router;
