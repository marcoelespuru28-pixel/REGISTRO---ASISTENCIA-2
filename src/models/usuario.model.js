const { db } = require('../config/firebase');

class Usuario {
    constructor(id, nombre, email, password, tipo) {
        this.id = id;
        this.nombre = nombre;
        this.email = email;
        this.password = password;
        this.tipo = tipo || 'alumno'; // Por defecto alumno
    }

    static async buscarPorId(id) {
        try {
            const snapshot = await db.ref(`usuarios/${id}`).once('value');
            const data = snapshot.val();
            return data ? new Usuario(id, data.nombre, data.email, data.password, data.tipo) : null;
        } catch (error) {
            throw new Error(`Error al buscar usuario: ${error.message}`);
        }
    }

    static async buscarPorEmail(email) {
        try {
            const snapshot = await db.ref('usuarios')
                .orderByChild('email')
                .equalTo(email)
                .once('value');
            const data = snapshot.val();
            if (!data) return null;
            
            const userId = Object.keys(data)[0];
            const userData = data[userId];
            return new Usuario(userId, userData.nombre, userData.email, userData.password, userData.tipo);
        } catch (error) {
            throw new Error(`Error al buscar usuario por email: ${error.message}`);
        }
    }

    async guardar() {
        try {
            if (!this.id) {
                const newRef = db.ref('usuarios').push();
                this.id = newRef.key;
                await newRef.set({
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    tipo: this.tipo
                });
            } else {
                await db.ref(`usuarios/${this.id}`).update({
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    tipo: this.tipo
                });
            }
            return this;
        } catch (error) {
            throw new Error(`Error al guardar usuario: ${error.message}`);
        }
    }
}

module.exports = Usuario;