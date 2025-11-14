const https = require('https');
const http = require('http');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
// no usamos path.join según solicitud

const app = express();

// Endpoint para actualizar perfil de alumno
app.post('/api/alumno/actualizar', async (req, res) => {
    const { nombre, email, telefono, carrera, direccion } = req.body;
    try {
        // Buscar alumno por email
        const Usuario = require('./models/usuario.model');
        let alumno = await Usuario.buscarPorEmail(email);
        if (!alumno) {
            return res.status(404).json({ exito: false, error: 'Alumno no encontrado' });
        }
        // Actualizar datos
        alumno.nombre = nombre || alumno.nombre;
        alumno.email = email || alumno.email;
        alumno.telefono = telefono || alumno.telefono;
        alumno.carrera = carrera || alumno.carrera;
        alumno.direccion = direccion || alumno.direccion;
        await alumno.guardar();
        return res.json({ exito: true });
    } catch (error) {
        return res.status(500).json({ exito: false, error: error.message });
    }
});
const { admin, db } = require('./config/firebase');

async function verificarTokenFirebase(req, res, next) {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No se proporcionó token' });
    }
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.firebaseUser = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Rutas
const rutasAdmin = require('./routes/admin.routes');
const rutasDocente = require('./routes/docente.routes');
const rutasAlumno = require('./routes/alumno.routes');

// Usar rutas
app.use('/api/admin', rutasAdmin);
app.use('/api/docente', rutasDocente);
app.use('/api/alumno', rutasAlumno);

// Servir la página principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

// Ruta de login general
const Usuario = require('./models/usuario.model');
app.post('/api/login', verificarTokenFirebase, async (req, res) => {
    // El usuario ya está autenticado por Firebase
    const { email, name, uid } = req.firebaseUser;
    // Buscar usuario en la base de datos local (opcional)
    let usuario = await Usuario.buscarPorEmail(email);
    if (!usuario) {
      // Si no existe, crear usuario local
      const nombreFinal = name || email;
      usuario = new Usuario(null, nombreFinal, email, '', 'alumno');
      await usuario.guardar();
      console.log('Usuario creado en colección:', email);
    }
    // Redireccionar según tipo
    let redireccion = '/alumno';
    if (usuario.tipo === 'docente') redireccion = '/docente';
    else if (usuario.tipo === 'administrativo') redireccion = '/admin';
    return res.json({ exito: true, tipo: usuario.tipo, redireccion, usuario });
});
    // Ruta de registro de usuario
app.post('/api/register', verificarTokenFirebase, async (req, res) => {
    try {
        // El usuario ya está autenticado por Firebase
        const { email, name, uid } = req.firebaseUser;
        // Verificar si el usuario ya existe en la base local
        let usuario = await Usuario.buscarPorEmail(email);
        if (!usuario) {
            const nombreFinal = name || email;
            usuario = new Usuario(null, nombreFinal, email, '', 'alumno');
            await usuario.guardar();
            console.log('Usuario creado en colección:', email);
        }
        return res.json({ exito: true });
    } catch (error) {
        console.error('Error en /api/register:', error);
        return res.status(500).json({ exito: false, error: error.message || error });
    }
});
// Servir la página principal


// Servir panel docente
app.get('/docente', (req, res) => {
    res.sendFile(__dirname + '/views/docente.html');
});

// Servir panel alumno
app.get('/alumno', (req, res) => {
    res.sendFile(__dirname + '/views/alumno.html');
});

// Servir panel administrativo
// Ruta para cambiar el tipo de usuario (solo admin)
app.post('/api/admin/cambiar-tipo', async (req, res) => {
    const { email, nuevoTipo } = req.body;
    if (!email || !nuevoTipo) {
        return res.json({ exito: false, error: 'Datos incompletos' });
    }
    try {
        // Buscar y eliminar el usuario en todas las colecciones
        const roles = ['docentes', 'alumnos', 'administrativos'];
        let usuario = null, idUsuario = null, coleccionActual = null;
        for (const rol of roles) {
            const ref = db.ref(rol);
            const snapshot = await ref.orderByChild('email').equalTo(email).once('value');
            const data = snapshot.val();
            if (data) {
                idUsuario = Object.keys(data)[0];
                usuario = data[idUsuario];
                coleccionActual = rol;
                break;
            }
        }
        if (!usuario) {
            return res.json({ exito: false, error: 'Usuario no encontrado' });
        }
        // Eliminar de la colección actual
        await db.ref(`${coleccionActual}/${idUsuario}`).remove();
        // Agregar a la nueva colección
        const refNuevo = db.ref(nuevoTipo === 'docente' ? 'docentes' : nuevoTipo === 'alumno' ? 'alumnos' : 'administrativos');
        const nuevoRef = refNuevo.push();
        await nuevoRef.set({ email: usuario.email, password: usuario.password });
        return res.json({ exito: true });
    } catch (error) {
        return res.json({ exito: false, error: 'Error al cambiar tipo de usuario' });
    }
});
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/views/administrativo.html');
});

    const HTTPS_PORT = process.env.HTTPS_PORT || 14500;
    const HTTP_PORT = process.env.HTTP_PORT || 14000;

    const options = {
        key: fs.readFileSync('localhost+1-key.pem'),
        cert: fs.readFileSync('localhost+1.pem')
    };

    // Servidor HTTPS (existente)
    https.createServer(options, app).listen(HTTPS_PORT, () => {
        console.log(`HTTPS en https://localhost:${HTTPS_PORT}`);
    });

    // Servidor HTTP adicional para pruebas por LAN (accesible vía http://<IP>:HTTP_PORT)
    // Se liga a 0.0.0.0 para aceptar conexiones desde la red local (teléfono)
    http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`HTTP en http://0.0.0.0:${HTTP_PORT} — accesible por IP local para pruebas`);
    });