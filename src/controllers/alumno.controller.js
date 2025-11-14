const BaseController = require('./base.controller');
const Alumno = require('../models/alumno.model');
const { db } = require('../config/firebase');

class AlumnoController extends BaseController {
    _getTipoUsuario() {
        return 'alumnos';
    }

    async consultarAsistencia(req, res) {
        try {
            const { alumnoId } = req.params;
            const { materiaId } = req.query;

            const alumno = await Alumno.buscarPorId(alumnoId);
            if (!alumno) {
                return res.status(404).json({ error: 'Alumno no encontrado' });
            }

            const asistencias = await alumno.consultarAsistencia(materiaId);
            res.status(200).json({ asistencias });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async verHorario(req, res) {
        try {
            const { alumnoId } = req.params;
            
            const alumno = await Alumno.buscarPorId(alumnoId);
            if (!alumno) {
                return res.status(404).json({ error: 'Alumno no encontrado' });
            }

            const horario = await alumno.verHorario();
            res.status(200).json({ horario });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async actualizarPerfil(req, res) {
        try {
            const { alumnoId } = req.params;
            const { nombre, email, carrera } = req.body;

            const alumno = await Alumno.buscarPorId(alumnoId);
            if (!alumno) {
                return res.status(404).json({ error: 'Alumno no encontrado' });
            }

            alumno.nombre = nombre || alumno.nombre;
            alumno.email = email || alumno.email;
            alumno.carrera = carrera || alumno.carrera;

            await alumno.guardar();
            res.status(200).json({ 
                mensaje: 'Perfil actualizado exitosamente',
                alumno: {
                    id: alumno.id,
                    nombre: alumno.nombre,
                    email: alumno.email,
                    matricula: alumno.matricula,
                    carrera: alumno.carrera
                }
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

module.exports = new AlumnoController();