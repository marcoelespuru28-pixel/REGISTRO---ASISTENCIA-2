const express = require('express');
const router = express.Router();
const docenteController = require('../controllers/docente.controller');

// Rutas de autenticación
router.post('/iniciar-sesion', docenteController.iniciarSesion);
router.post('/cerrar-sesion', docenteController.cerrarSesion);

// Rutas específicas del docente
router.post('/:docenteId/asistencia', docenteController.registrarAsistencia);
router.get('/:docenteId/asistencia/:materiaId', docenteController.consultarAsistencias);
router.post('/:docenteId/materias', docenteController.agregarMateria);

module.exports = router;