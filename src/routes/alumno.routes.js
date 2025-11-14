const express = require('express');
const router = express.Router();
const alumnoController = require('../controllers/alumno.controller');

// Rutas de autenticación
router.post('/iniciar-sesion', alumnoController.iniciarSesion);
router.post('/cerrar-sesion', alumnoController.cerrarSesion);

// Rutas específicas del alumno
router.get('/:alumnoId/asistencia', alumnoController.consultarAsistencia);
router.get('/:alumnoId/horario', alumnoController.verHorario);
router.put('/:alumnoId/perfil', alumnoController.actualizarPerfil);

module.exports = router;