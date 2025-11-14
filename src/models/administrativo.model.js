const Usuario = require('./usuario.model');
const { db } = require('../config/firebase');

class Administrativo extends Usuario {
    constructor(id, nombre, email, password, departamento) {
        super(id, nombre, email, password);
        this.departamento = departamento;
        this.tipo = 'administrativo';
    }

    static async buscarPorId(id) {
        try {
            const snapshot = await db.ref(`administrativos/${id}`).once('value');
            const data = snapshot.val();
            return data ? new Administrativo(
                id, 
                data.nombre, 
                data.email, 
                data.password, 
                data.departamento
            ) : null;
        } catch (error) {
            throw new Error(`Error al buscar administrativo: ${error.message}`);
        }
    }

    async guardar() {
        try {
            if (!this.id) {
                const newRef = db.ref('administrativos').push();
                this.id = newRef.key;
                await newRef.set({
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    departamento: this.departamento,
                    tipo: this.tipo
                });
            } else {
                await db.ref(`administrativos/${this.id}`).update({
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    departamento: this.departamento,
                    tipo: this.tipo
                });
            }
            return this;
        } catch (error) {
            throw new Error(`Error al guardar administrativo: ${error.message}`);
        }
    }

    async gestionarUsuarios() {
        try {
            const snapshot = await db.ref('usuarios').once('value');
            return snapshot.val();
        } catch (error) {
            throw new Error(`Error al gestionar usuarios: ${error.message}`);
        }
    }

    async generarReportes() {
        // Implementar lógica de generación de reportes
        throw new Error('Función no implementada');
    }
}

module.exports = Administrativo;