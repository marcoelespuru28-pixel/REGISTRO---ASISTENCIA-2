const Usuario = require('./usuario.model');
const { db } = require('../config/firebase');

class Docente extends Usuario {
    constructor(id, nombre, email, password, materias) {
        super(id, nombre, email, password);
        this.materias = materias || [];
        this.tipo = 'docente';
    }

    static async buscarPorId(id) {
        try {
            const snapshot = await db.ref(`docentes/${id}`).once('value');
            const data = snapshot.val();
            return data ? new Docente(
                id,
                data.nombre,
                data.email,
                data.password,
                data.materias
            ) : null;
        } catch (error) {
            throw new Error(`Error al buscar docente: ${error.message}`);
        }
    }

    async guardar() {
        try {
            if (!this.id) {
                const newRef = db.ref('docentes').push();
                this.id = newRef.key;
                await newRef.set({
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    materias: this.materias,
                    tipo: this.tipo
                });
            } else {
                await db.ref(`docentes/${this.id}`).update({
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    materias: this.materias,
                    tipo: this.tipo
                });
            }
            return this;
        } catch (error) {
            throw new Error(`Error al guardar docente: ${error.message}`);
        }
    }

    async registrarAsistencia(alumnoId, materiaId, fecha, estado) {
        try {
            const asistenciaRef = db.ref('asistencias').push();
            await asistenciaRef.set({
                alumnoId,
                materiaId,
                docenteId: this.id,
                fecha,
                estado,
                timestamp: Date.now()
            });
            return asistenciaRef.key;
        } catch (error) {
            throw new Error(`Error al registrar asistencia: ${error.message}`);
        }
    }

    async consultarAsistencias(materiaId) {
        try {
            const snapshot = await db.ref('asistencias')
                .orderByChild('materiaId')
                .equalTo(materiaId)
                .once('value');
            return snapshot.val() || {};
        } catch (error) {
            throw new Error(`Error al consultar asistencias: ${error.message}`);
        }
    }

    async agregarMateria(materia) {
        try {
            if (!this.materias) this.materias = [];
            this.materias.push(materia);
            await this.guardar();
            return true;
        } catch (error) {
            throw new Error(`Error al agregar materia: ${error.message}`);
        }
    }
}

module.exports = Docente;