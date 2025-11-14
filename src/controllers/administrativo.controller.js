const BaseController = require('./base.controller');
const Administrativo = require('../models/administrativo.model');
const { admin, db } = require('../config/firebase');

class AdministrativoController extends BaseController {
    _getTipoUsuario() {
        return 'administrativos';
    }

    async gestionarUsuarios(req, res) {
        try {
            // Compatibilidad: devolver lista completa de usuarios
            const snapshot = await db.ref('usuarios').once('value');
            const data = snapshot.val() || {};
            const usuarios = Object.keys(data).map(id => ({ id, ...data[id] }));
            res.status(200).json({ usuarios });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async generarReportes(req, res) {
        try {
            const { tipo, fechaInicio, fechaFin } = req.query;
            const tiposPermitidos = ['alumno', 'docente', 'todos'];
            if (!tipo || !tiposPermitidos.includes(tipo)) {
                return res.status(400).json({ error: 'Parámetro tipo inválido' });
            }
            if (!fechaInicio || !fechaFin) {
                return res.status(400).json({ error: 'Rango de fechas requerido' });
            }
            const start = Date.parse(fechaInicio);
            const end = Date.parse(fechaFin);
            if (isNaN(start) || isNaN(end) || start > end) {
                return res.status(400).json({ error: 'Fechas inválidas' });
            }

            const reportesRef = db.ref('asistencias');
            const snapshot = await reportesRef
                .orderByChild('fecha')
                .startAt(fechaInicio)
                .endAt(fechaFin)
                .once('value');

            const asistencias = snapshot.val() || {};

            // Filtrar por tipo cuando corresponda
            const datos = Object.keys(asistencias).reduce((acc, id) => {
                const item = asistencias[id];
                if (tipo === 'todos' || (item && item.tipo === tipo)) {
                    acc[id] = item;
                }
                return acc;
            }, {});

            res.status(200).json({
                reporte: {
                    tipo,
                    fechaInicio,
                    fechaFin,
                    total: Object.keys(datos).length,
                    datos
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

    // REST: Listar todos los usuarios
    async listarUsuarios(req, res) {
        try {
            const snapshot = await db.ref('usuarios').once('value');
            const data = snapshot.val() || {};
            const usuarios = Object.keys(data).map(id => ({ id, ...data[id] }));
            return res.status(200).json({ usuarios });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // REST: Obtener un usuario por ID
    async obtenerUsuario(req, res) {
        try {
            const { id } = req.params;
            const snapshot = await db.ref(`usuarios/${id}`).once('value');
            const data = snapshot.val();
            if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });
            return res.status(200).json({ usuario: { id, ...data } });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // REST: Crear usuario
    async crearUsuario(req, res) {
        try {
            const {
                nombres,
                apellidos,
                email,
                password,
                rol,
                codigoUsuario,
                username,
                estadoCuenta,
                carrera,
                especialidad,
                gradoAcademico,
                ciclo,
                fechaIngreso,
                telefono,
                direccion,
                permisos
            } = req.body || {};

            if (!nombres || !apellidos || !email || !password || !rol) {
                return res.status(400).json({ error: 'Campos requeridos faltantes' });
            }

            // Reglas específicas por rol
            if (rol === 'alumno') {
                if (!carrera || !ciclo) {
                    return res.status(400).json({ error: 'Carrera y ciclo son obligatorios para alumnos' });
                }
            }
            if (rol === 'docente') {
                if (!carrera) {
                    return res.status(400).json({ error: 'Carrera es obligatoria para docentes' });
                }
            }

            // Crear usuario en Firebase Auth usando Admin SDK
            let authUser;
            try {
                authUser = await admin.auth().createUser({
                    email,
                    password,
                    displayName: `${nombres} ${apellidos}`.trim(),
                    disabled: false
                });
            } catch (authError) {
                if (authError.code === 'auth/email-already-exists') {
                    return res.status(400).json({ error: 'El correo ya está registrado en Auth.' });
                }
                return res.status(500).json({ error: 'Error al crear usuario en Auth: ' + authError.message });
            }

            // Crear objeto usuario y agregar UID de Auth
            const nuevoUsuario = {
                nombre: `${nombres} ${apellidos}`.trim(),
                nombres,
                apellidos,
                email,
                password,
                tipo: rol,
                codigoUsuario: codigoUsuario || null,
                username: username || null,
                estadoCuenta: estadoCuenta || 'activo',
                carrera: carrera || null,
                especialidad: especialidad || null,
                gradoAcademico: gradoAcademico || null,
                ciclo: ciclo || null,
                fechaIngreso: fechaIngreso || null,
                telefono: telefono || null,
                direccion: direccion || null,
                permisos: Array.isArray(permisos) ? permisos : [],
                fechaRegistro: new Date().toISOString(),
                authUid: authUser.uid
            };

            const ref = db.ref('usuarios').push();
            await ref.set(nuevoUsuario);
            return res.status(201).json({ usuario: { id: ref.key, ...nuevoUsuario } });
        } catch (error) {
            console.error('Error en crearUsuario:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // REST: Actualizar usuario
    async actualizarUsuario(req, res) {
        try {
            const { id } = req.params;
            const snapshot = await db.ref(`usuarios/${id}`).once('value');
            if (!snapshot.val()) return res.status(404).json({ error: 'Usuario no encontrado' });

            const updates = { ...req.body };
            // No permitir actualizar el id
            delete updates.id;
            // Si se está editando el rol, guardar como 'tipo' para coherencia
            if (updates.rol) {
                updates.tipo = updates.rol;
                delete updates.rol;
            }
            await db.ref(`usuarios/${id}`).update(updates);
            const actualizado = (await db.ref(`usuarios/${id}`).once('value')).val();
            return res.status(200).json({ usuario: { id, ...actualizado } });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // REST: Eliminar usuario
    async eliminarUsuario(req, res) {
        try {
            const { id } = req.params;
            const snapshot = await db.ref(`usuarios/${id}`).once('value');
            if (!snapshot.val()) return res.status(404).json({ error: 'Usuario no encontrado' });
            await db.ref(`usuarios/${id}`).remove();
            return res.status(200).json({ eliminado: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AdministrativoController();