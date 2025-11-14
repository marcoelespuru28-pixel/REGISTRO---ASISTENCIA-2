const BaseController = require('./base.controller');
const Docente = require('../models/docente.model');
const { db } = require('../config/firebase');

class DocenteController extends BaseController {
    _getTipoUsuario() {
        return 'docentes';
    }

    async registrarAsistencia(req, res) {
        try {
            const { alumnoId, materiaId, fecha, estado } = req.body;
            const { docenteId } = req.params;

            const docente = await Docente.buscarPorId(docenteId);
            if (!docente) {
                return res.status(404).json({ error: 'Docente no encontrado' });
            }

            const asistenciaId = await docente.registrarAsistencia(alumnoId, materiaId, fecha, estado);
            res.status(200).json({ 
                mensaje: 'Asistencia registrada exitosamente',
                asistenciaId 
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async consultarAsistencias(req, res) {
        try {
            const { docenteId, materiaId } = req.params;
            
            const docente = await Docente.buscarPorId(docenteId);
            if (!docente) {
                return res.status(404).json({ error: 'Docente no encontrado' });
            }

            const asistencias = await docente.consultarAsistencias(materiaId);
            res.status(200).json({ asistencias });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async agregarMateria(req, res) {
        try {
            const { docenteId } = req.params;
            const { materia } = req.body;

            const docente = await Docente.buscarPorId(docenteId);
            if (!docente) {
                return res.status(404).json({ error: 'Docente no encontrado' });
            }

            await docente.agregarMateria(materia);
            res.status(200).json({ 
                mensaje: 'Materia agregada exitosamente',
                materias: docente.materias 
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async cerrarSesion(req, res) {
        try {
            // Implementar lógica de cierre de sesión si es necesario
            res.status(200).json({ mensaje: 'Sesión cerrada exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new DocenteController();