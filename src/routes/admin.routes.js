const express = require('express');
const router = express.Router();
const administrativoController = require('../controllers/administrativo.controller');

// Rutas de autenticación
router.post('/iniciar-sesion', administrativoController.iniciarSesion);
router.post('/cerrar-sesion', administrativoController.cerrarSesion);

// Rutas específicas del administrador (compatibilidad)
router.get('/usuarios', administrativoController.gestionarUsuarios);
router.get('/reportes', administrativoController.generarReportes);

// REST CRUD de usuarios
router.get('/usuarios/listar', administrativoController.listarUsuarios);
router.get('/usuarios/:id', administrativoController.obtenerUsuario);
router.post('/usuarios', administrativoController.crearUsuario);
router.put('/usuarios/:id', administrativoController.actualizarUsuario);
router.delete('/usuarios/:id', administrativoController.eliminarUsuario);

// Rutas adicionales
router.get('/:id/usuarios', administrativoController.gestionarUsuarios);
router.get('/:id/reportes', administrativoController.generarReportes);

module.exports = router;