const { db } = require('../config/firebase');

class BaseController {
    constructor() {
        if (this.constructor === BaseController) {
            throw new Error('No se puede instanciar una clase abstracta');
        }
    }

    async iniciarSesion(req, res) {
        try {
            const { email, password } = req.body;
            const tipoUsuario = this._getTipoUsuario();

            const snapshot = await db.ref(tipoUsuario)
                .orderByChild('email')
                .equalTo(email)
                .once('value');
            
            const data = snapshot.val();
            if (!data) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const userId = Object.keys(data)[0];
            const usuario = data[userId];

            if (usuario.password !== password) {
                return res.status(401).json({ error: 'Contraseña incorrecta' });
            }

            const { password: _, ...usuarioSinPassword } = usuario;
            res.status(200).json({
                mensaje: 'Inicio de sesión exitoso',
                usuario: {
                    id: userId,
                    ...usuarioSinPassword
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async cerrarSesion(req, res) {
        try {
            // En este punto podrías invalidar tokens si usas JWT
            // o realizar otras tareas de limpieza necesarias
            res.status(200).json({ mensaje: 'Sesión cerrada exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Método abstracto que debe ser implementado por las clases hijas
    _getTipoUsuario() {
        throw new Error('El método _getTipoUsuario debe ser implementado por la clase hija');
    }

    // Métodos de utilidad
    _handleError(res, error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }

    _successResponse(res, data, mensaje = 'Operación exitosa') {
        res.status(200).json({ mensaje, ...data });
    }

    _notFoundResponse(res, entidad = 'recurso') {
        res.status(404).json({ error: `${entidad} no encontrado` });
    }

    _unauthorizedResponse(res, mensaje = 'No autorizado') {
        res.status(401).json({ error: mensaje });
    }
}

module.exports = BaseController;