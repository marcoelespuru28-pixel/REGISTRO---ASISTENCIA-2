const Usuario = require('./usuario.model');
const { db } = require('../config/firebase');

class Alumno extends Usuario {
    constructor(id, nombre, email, password, matricula, carrera) {
        super(id, nombre, email, password);
        this.matricula = matricula;
        this.carrera = carrera;
        this.tipo = 'alumno';
    }

    static async buscarPorId(id) {
        try {
            const snapshot = await db.ref(`alumnos/${id}`).once('value');
            const data = snapshot.val();
            return data ? new Alumno(
                id,
                data.nombre,
                data.email,
                data.password,
                data.matricula,
                data.carrera
            ) : null;
        } catch (error) {
            throw new Error(`Error al buscar alumno: ${error.message}`);
        }
    }

    static async buscarPorMatricula(matricula) {
        try {
            const snapshot = await db.ref('alumnos')
                .orderByChild('matricula')
                .equalTo(matricula)
                .once('value');
            
            const data = snapshot.val();
            if (!data) return null;

            const alumnoId = Object.keys(data)[0];
            const alumnoData = data[alumnoId];
            return new Alumno(
                alumnoId,
                alumnoData.nombre,
                alumnoData.email,
                alumnoData.password,
                alumnoData.matricula,
                alumnoData.carrera
            );
        } catch (error) {
            throw new Error(`Error al buscar alumno por matrícula: ${error.message}`);
        }
    }

    async guardar() {
        try {
            if (!this.id) {
                const newRef = db.ref('alumnos').push();
                this.id = newRef.key;
                await newRef.set({
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    matricula: this.matricula,
                    carrera: this.carrera,
                    tipo: this.tipo
                });
            } else {
                await db.ref(`alumnos/${this.id}`).update({
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    matricula: this.matricula,
                    carrera: this.carrera,
                    tipo: this.tipo
                });
            }
            return this;
        } catch (error) {
            throw new Error(`Error al guardar alumno: ${error.message}`);
        }
    }

    async consultarAsistencia(materiaId) {
        try {
            const snapshot = await db.ref('asistencias')
                .orderByChild('alumnoId')
                .equalTo(this.id)
                .once('value');
            
            const asistencias = snapshot.val() || {};
            if (materiaId) {
                return Object.values(asistencias).filter(a => a.materiaId === materiaId);
            }
            return asistencias;
        } catch (error) {
            throw new Error(`Error al consultar asistencia: ${error.message}`);
        }
    }

    async verHorario() {
        try {
            // Implementar lógica para obtener horario desde Firebase
            const snapshot = await db.ref(`horarios/${this.carrera}`).once('value');
            return snapshot.val() || {};
        } catch (error) {
            throw new Error(`Error al consultar horario: ${error.message}`);
        }
    }
}

module.exports = Alumno;