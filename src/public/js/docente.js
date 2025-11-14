// Variables globales
let docenteActual = null;
let docenteKey = null; // clave estable para indexar/escuchar asistencias
let docenteEmail = null; // correo del docente para vincular nombre
let selectedUnidad = '';
let selectedCarrera = '';
let selectedCiclo = '';
let selectedTurno = '';
let currentStep = 1;
let qrGenerated = false;
let qrTimer = null;
let attendanceRecords = [];
let currentSessionRef = null; // referencia activa para poder desuscribir
document.addEventListener('DOMContentLoaded', function() {
    // Cargar carreras y ciclos desde Firebase para el docente
    cargarCarrerasDocente();
    // Selección de unidad didáctica
    document.getElementById('unidadSelect').addEventListener('change', function(e) {
        selectedUnidad = e.target.value;
        updateButtonStates();
    });
    // Selección de carrera
    document.getElementById('carreraDocente').addEventListener('change', function(e) {
        selectedCarrera = e.target.value;
        cargarCiclosDocente(selectedCarrera);
        // Persistir preferencia
        persistPreferenciasDocente({ carrera: selectedCarrera });
    });
    // Selección de ciclo
    document.getElementById('cicloDocente').addEventListener('change', function(e) {
        selectedCiclo = e.target.value;
        cargarUnidadesDocente(selectedCarrera, selectedCiclo);
        // Persistir preferencia
        persistPreferenciasDocente({ ciclo: selectedCiclo });
    });
    // Selección de turno
    document.getElementById('turnoSelect').addEventListener('change', function(e) {
        selectedTurno = e.target.value;
        updateButtonStates();
    });
    // Botón cerrar sesión
    document.getElementById('btnCerrarSesion').addEventListener('click', cerrarSesion);
    updateButtonStates();
    // Inicializar docenteKey desde estado disponible
    docenteKey = getDocenteKey();
    if (docenteKey) {
        try { localStorage.setItem('docenteKey', docenteKey); } catch (e) {}
    } else {
        try { docenteKey = localStorage.getItem('docenteKey') || null; } catch (e) {}
    }

    // Precargar nombre del docente desde localStorage o Firebase
    try {
        const nombreLocal = localStorage.getItem('nombreDocente') || '';
        const input = document.getElementById('nombreDocenteInput');
        if (input && nombreLocal) input.value = nombreLocal;
    } catch (e) {}
    // Detectar correo del docente y persistir
    docenteEmail = getDocenteEmail();
    if (docenteEmail) {
        try { localStorage.setItem('docenteEmail', docenteEmail); } catch (e) {}
    } else {
        try { docenteEmail = localStorage.getItem('docenteEmail') || null; } catch (e) {}
    }
    if (docenteKey) {
        firebase.database().ref('docentes/' + docenteKey).once('value').then(snap => {
            const data = snap.val();
            const input = document.getElementById('nombreDocenteInput');
            if (input && data?.nombre) input.value = data.nombre;
            if (data?.nombre) {
                if (!docenteActual) docenteActual = {};
                docenteActual.nombre = data.nombre;
                try { localStorage.setItem('nombreDocente', data.nombre); } catch (e) {}
                const label = document.getElementById('nombreDocente');
                if (label) label.textContent = data.nombre;
                // Si ya hay nombre, deshabilitar input/botón
                if (input) input.disabled = true;
                const btn = document.querySelector('button[onclick="guardarNombreDocente()"]');
                if (btn) btn.disabled = true;
                actualizarPreviewDocente(data.nombre);
            }
            // Cargar preferencias guardadas (carrera/ciclo)
            if (data?.preferencias) {
                if (data.preferencias.carrera) {
                    selectedCarrera = data.preferencias.carrera;
                    const selCarrera = document.getElementById('carreraDocente');
                    if (selCarrera) selCarrera.value = selectedCarrera;
                    cargarCiclosDocente(selectedCarrera, data.preferencias.ciclo);
                }
            }
        });
    }
    // Intentar también por correo
    if (docenteEmail) {
        firebase.database().ref('docentes_por_email/' + sanitizeEmailKey(docenteEmail)).once('value').then(snap => {
            const data = snap.val();
            const input = document.getElementById('nombreDocenteInput');
            if (data?.nombre) {
                if (input) input.value = data.nombre;
                if (!docenteActual) docenteActual = {};
                docenteActual.nombre = data.nombre;
                try { localStorage.setItem('nombreDocente', data.nombre); } catch (e) {}
                const label = document.getElementById('nombreDocente');
                if (label) label.textContent = data.nombre;
                if (input) input.disabled = true;
                const btn = document.querySelector('button[onclick="guardarNombreDocente()"]');
                if (btn) btn.disabled = true;
                actualizarPreviewDocente(data.nombre);
            }
        });
    }
});

// Funciones de autenticación
async function iniciarSesion(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/docente/iniciar-sesion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            docenteActual = data.docente;
            localStorage.setItem('docenteActual', JSON.stringify(docenteActual));
            mostrarPanelDocente();
            document.getElementById('nombreDocente').textContent = docenteActual?.nombre || docenteActual?.email || '';
            // Actualizar y persistir docenteKey
            docenteKey = getDocenteKey();
            if (docenteKey) {
                try { localStorage.setItem('docenteKey', docenteKey); } catch (e) {}
            }
        } else {
            mostrarError(data.error);
        }
    } catch (error) {
        mostrarError('Error al iniciar sesión: ' + error.message);
    }
}

async function cerrarSesion() {
    try {
        await fetch('/api/docente/cerrar-sesion', { method: 'POST' });
        localStorage.removeItem('docenteActual');
        docenteActual = null;
        window.location.href = '/';
    } catch (error) {
        mostrarError('Error al cerrar sesión: ' + error.message);
    }
}

// Navegación entre steps
function showStep(stepNumber) {
    // Ocultar todos los steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Mostrar step actual
    document.getElementById(`step${stepNumber}`).classList.add('active');
    currentStep = stepNumber;
    
    updateStepDisplay();
}

function updateStepDisplay() {
    // Actualizar información mostrada según el step
    switch(currentStep) {
        case 2:
            document.getElementById('selectedUnitText').textContent = selectedUnidad;
            break;
        case 3:
            document.getElementById('sessionInfo').textContent = `${selectedUnidad} - Turno ${selectedTurno}`;
            document.getElementById('detailUnidad').textContent = selectedUnidad;
            document.getElementById('detailTurno').textContent = `Turno ${selectedTurno}`;
            document.getElementById('detailFecha').textContent = new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            break;
    }
}

// Actualizar estados de botones
function updateButtonStates() {
    const btnStep1 = document.getElementById('btnStep1');
    const btnStep2 = document.getElementById('btnStep2');
    
    // Step 1: Habilitar si hay unidad seleccionada
    btnStep1.disabled = !selectedUnidad;
    
    // Step 2: Habilitar si hay turno seleccionado
    btnStep2.disabled = !selectedTurno;
}

// Navegación
function avanzarStep2() {
    if (!selectedUnidad) {
        showError('Por favor seleccione una unidad didáctica');
        return;
    }
    showStep(2);
}

function avanzarStep3() {
    if (!selectedTurno) {
        showError('Por favor seleccione un turno');
        return;
    }
    showStep(3);
    // Asegurar escucha cuando se entra al step 3
    attachSessionListener();
}

function volverStep1() {
    showStep(1);
}

function volverStep2() {
    showStep(2);
}

// Generar código QR
function generateQRCode() {
    if (!selectedUnidad || !selectedTurno) {
        showError('Por favor complete la selección de unidad y turno');
        return;
    }
    
    // Datos para el QR
    docenteKey = getDocenteKey();
    if (docenteKey) { try { localStorage.setItem('docenteKey', docenteKey); } catch (e) {} }
    const qrData = {
        unidad: selectedUnidad,
        turno: selectedTurno,
        fecha: new Date().toISOString(),
        docente: docenteKey || 'desconocido',
        nombreDocente: (document.getElementById('nombreDocenteInput')?.value || docenteActual?.nombre || ''),
        carrera: selectedCarrera || '',
        ciclo: selectedCiclo || '',
        tipo: 'asistencia'
    };
    const qrString = JSON.stringify(qrData);
    
    // Generar QR
    const qrcodeElement = document.getElementById('qrcode');
    qrcodeElement.innerHTML = '';
    
    // Usar correctLevel: 2 si QRCode.CorrectLevel no está definido
    const correctLevel = (window.QRCode && QRCode.CorrectLevel && QRCode.CorrectLevel.H) ? QRCode.CorrectLevel.H : 2;
        const canvas = document.createElement('canvas');
        qrcodeElement.appendChild(canvas);
        QRCode.toCanvas(canvas, qrString, {
        width: 200,
        height: 200,
        colorDark: "#ffffffff",
        colorLight: "#000000ff",
        correctLevel: correctLevel
    }, function(error) {
        if (error) {
            showError('Error al generar el código QR');
            console.error(error);
            return;
        }
        
        qrGenerated = true;
        showSuccess('Código QR generado correctamente');
        
        // Mostrar contenedor QR
        document.getElementById('qrContainer').style.display = 'block';
        
        // Deshabilitar botón de generar
        document.getElementById('btnGenerarQR').disabled = true;
        document.getElementById('btnGenerarQR').innerHTML = '<i class="fas fa-check"></i> QR Activo';
        
        // Iniciar timer de 10 minutos
        startQRTimer(600);
        // Escuchar asistencias reales de esta sesión
        attachSessionListener();

        // Registrar metadatos de la sesión (día/fecha) para coherencia de hora
        (function registrarMetaSesion() {
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const fechaKey = `${y}${m}${day}`;
            const fechaTexto = d.toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const pathMeta = `asistencias_sesiones/${docenteKey}/${selectedUnidad}/${selectedTurno}/${fechaKey}/_meta`;
            firebase.database().ref(pathMeta).set({
                fechaKey,
                fechaTexto,
                creadoISO: d.toISOString(),
                unidad: selectedUnidad,
                turno: selectedTurno,
                docente: docenteKey,
                nombreDocente: (document.getElementById('nombreDocenteInput')?.value || docenteActual?.nombre || '')
            });
        })();
    });
}

// Guardar nombre del docente
function guardarNombreDocente() {
    const input = document.getElementById('nombreDocenteInput');
    const nombre = (input?.value || '').trim();
    if (!nombre) {
        showError('Ingrese un nombre válido');
        return;
    }
    const key = getDocenteKey();
    try { localStorage.setItem('nombreDocente', nombre); } catch (e) {}
    if (key) {
        firebase.database().ref('docentes/' + key).update({ nombre });
    }
    // Guardar también vinculado al correo
    const email = getDocenteEmail();
    if (email) {
        firebase.database().ref('docentes_por_email/' + sanitizeEmailKey(email)).update({ nombre, email });
        try { localStorage.setItem('docenteEmail', email); } catch (e) {}
    }
    if (!docenteActual) docenteActual = {};
    docenteActual.nombre = nombre;
    const label = document.getElementById('nombreDocente');
    if (label) label.textContent = nombre;
    showSuccess('Nombre del docente guardado');
    // Deshabilitar input y botón luego de guardar
    if (input) input.disabled = true;
    const btn = document.querySelector('button[onclick="guardarNombreDocente()"]');
    if (btn) btn.disabled = true;
    actualizarPreviewDocente(nombre);
}

function getDocenteEmail() {
    if (docenteActual?.email) return docenteActual.email;
    if (window.firebase && firebase.auth && firebase.auth().currentUser) {
        return firebase.auth().currentUser.email || null;
    }
    try { return localStorage.getItem('docenteEmail') || null; } catch (e) { return null; }
}

function sanitizeEmailKey(email) {
    // Firebase prohibe ., #, $, [, ] en keys; reemplazar por _
    return String(email).replace(/[.#$\[\]]/g, '_');
}

// Habilitar edición del nombre si fue bloqueado
function editarNombreDocente() {
    const input = document.getElementById('nombreDocenteInput');
    if (input) {
        input.disabled = false;
        setTimeout(() => input.focus(), 0);
    }
    const btnGuardar = document.querySelector('button[onclick="guardarNombreDocente()"]');
    if (btnGuardar) btnGuardar.disabled = false;
}

// UI: mostrar/ocultar previsualización / formulario
function togglePreviewDocente() {
    const preview = document.getElementById('docentePreview');
    if (!preview) return;
    const isHidden = preview.style.display === 'none' || !preview.style.display;
    preview.style.display = isHidden ? 'inline-flex' : 'none';
}

function mostrarFormularioDocente() {
    const form = document.getElementById('docenteFormSection');
    if (form) form.style.display = 'block';
}

function ocultarFormularioDocente() {
    const form = document.getElementById('docenteFormSection');
    if (form) form.style.display = 'none';
}

function actualizarPreviewDocente(nombre) {
    const span = document.getElementById('docenteNombrePreview');
    if (span) span.textContent = nombre || '—';
}

// Timer para QR
function startQRTimer(duration) {
    let timer = duration;
    const timerElement = document.getElementById('timer');
    
    // Limpiar timer anterior si existe
    if (qrTimer) {
        clearInterval(qrTimer);
    }
    
    qrTimer = setInterval(function() {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        
        timerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        if (--timer < 0) {
            clearInterval(qrTimer);
            qrGenerated = false;
            showError('El código QR ha expirado');
            document.getElementById('qrContainer').style.display = 'none';
            document.getElementById('btnGenerarQR').disabled = false;
            document.getElementById('btnGenerarQR').innerHTML = '<i class="fas fa-qrcode"></i> Generar Código QR de Asistencia';
        }
    }, 1000);
}

// Simular registro de asistencias

// Escuchar los registros de asistencia en tiempo real y mostrar datos reales del alumno
function getDocenteKey() {
    // prioridad: docenteActual, Firebase Auth, localStorage
    const fromActual = (docenteActual?.id || docenteActual?.codigo || docenteActual?.email);
    if (fromActual) return fromActual;
    if (window.firebase && firebase.auth && firebase.auth().currentUser) {
        const u = firebase.auth().currentUser;
        return u.uid || u.email || null;
    }
    try { return localStorage.getItem('docenteKey') || null; } catch (e) { return null; }
}

function attachSessionListener() {
    // Desuscribir anterior si existe
    if (currentSessionRef) {
        currentSessionRef.off();
        currentSessionRef = null;
    }
    // Leer directamente del índice por sesión para esta unidad/turno/fecha
    const key = getDocenteKey();
    if (!key || !selectedUnidad || !selectedTurno) return;
    const fechaKey = (function() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${day}`;
    })();

    const path = `asistencias_sesiones/${key}/${selectedUnidad}/${selectedTurno}/${fechaKey}`;
    const ref = firebase.database().ref(path);
    currentSessionRef = ref;
    ref.on('value', async function(snapshot) {
        const records = [];
        const data = snapshot.val() || {};
        const alumnoIds = Object.keys(data).filter(id => id && id.charAt(0) !== '_');
        for (const uid of alumnoIds) {
            const rec = data[uid];
            if (!rec || typeof rec !== 'object' || !rec.alumno) continue; // ignorar nodos no válidos
            const alumnoSnap = await firebase.database().ref('alumnos/' + uid).once('value');
            const alumnoData = alumnoSnap.val();
            records.push({
                id: uid,
                nombre: alumnoData?.nombre || 'Desconocido',
                email: alumnoData?.email || rec.emailAlumno || '',
                time: rec.hora || '',
                date: rec.fecha || '',
                timestamp: (rec.fecha ? (rec.fecha + ' ') : '') + (rec.hora || '')
            });
        }
        attendanceRecords = records;
        updateAttendanceDisplay();
    });
}

// Registrar asistencia
function registerAttendance(estudiante) {
    const attendanceTime = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', minute: '2-digit' 
    });
    
    const record = {
        ...estudiante,
        time: attendanceTime,
        timestamp: new Date().toISOString()
    };
    
    attendanceRecords.push(record);
    updateAttendanceDisplay();
}

// Actualizar display de asistencias
function updateAttendanceDisplay() {
    const container = document.getElementById('attendanceRecords');
    const countElement = document.getElementById('attendanceCount');
    
    // Actualizar contador
    countElement.textContent = attendanceRecords.length;
    
    // Actualizar lista
    container.innerHTML = '';
    
    if (attendanceRecords.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>Esperando escaneos de estudiantes...</p>
            </div>
        `;
        return;
    }
    
    attendanceRecords.forEach(record => {
        const recordElement = document.createElement('div');
        recordElement.className = 'attendance-record';
        recordElement.innerHTML = `
            <div class="record-info">
                <div class="record-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                    <div class="record-name">${record.nombre}</div>
                    <div class="record-id">${record.email || ''}</div>
                </div>
            </div>
            <div class="record-time">${(record.date ? record.date + ' ' : '') + (record.time || '')}</div>
        `;
        container.appendChild(recordElement);
    });
}

// Finalizar sesión
function finalizarSesion() {
    if (attendanceRecords.length === 0) {
        if (!confirm('No se registraron asistencias. ¿Desea finalizar la sesión?')) {
            return;
        }
    }
    
    showSuccess(`Sesión finalizada. Total de asistentes: ${attendanceRecords.length}`);
    
    // Resetear todo
    setTimeout(() => {
        resetSession();
        showStep(1);
    }, 2000);
}

function resetSession() {
    // Resetear selecciones
    document.getElementById('unidadSelect').value = '';
    document.getElementById('turnoSelect').value = '';
    selectedUnidad = '';
    selectedTurno = '';
    
    // Resetear QR y asistencias
    attendanceRecords = [];
    qrGenerated = false;
    
    if (qrTimer) {
        clearInterval(qrTimer);
        qrTimer = null;
    }
    
    document.getElementById('qrContainer').style.display = 'none';
    document.getElementById('attendanceCount').textContent = '0';
    document.getElementById('btnGenerarQR').disabled = false;
    document.getElementById('btnGenerarQR').innerHTML = '<i class="fas fa-qrcode"></i> Generar Código QR de Asistencia';
    updateAttendanceDisplay();
    updateButtonStates();
}

// Mensajes de estado
function updateStatusMessage(message, type = 'info') {
    const statusMessage = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText');
    if (!statusMessage || !statusText) return;
    const icon = statusMessage.querySelector('i');
    if (!icon) return;
    statusText.textContent = message;
    statusMessage.className = 'status-message';
    icon.className = 'fas';
    switch(type) {
        case 'error':
            statusMessage.classList.add('error');
            icon.classList.add('fa-exclamation-triangle');
            break;
        case 'success':
            statusMessage.classList.add('success');
            icon.classList.add('fa-check-circle');
            break;
        default:
            icon.classList.add('fa-info-circle');
    }
}

// ---------- Preferencias Docente: Carreras, Ciclos y Unidades ----------
function cargarCarrerasDocente() {
    const sel = document.getElementById('carreraDocente');
    if (!sel || !window.firebase) return;
    firebase.database().ref('carreras').once('value').then(function(snapshot) {
        sel.innerHTML = '<option value="">-- Seleccione una carrera --</option>';
        snapshot.forEach(function(child) {
            const key = child.key;
            const label = String(key).replace(/_/g, ' ');
            sel.innerHTML += `<option value="${key}">${label}</option>`;
        });

        // Si hay preferencia guardada en localStorage, restaurar
        try {
            const pref = JSON.parse(localStorage.getItem('preferenciasDocente') || '{}');
            if (pref.carrera) {
                selectedCarrera = pref.carrera;
                sel.value = selectedCarrera;
                cargarCiclosDocente(selectedCarrera, pref.ciclo);
            }
        } catch (e) {}
    });
}

function cargarCiclosDocente(carrera, cicloPre) {
    const sel = document.getElementById('cicloDocente');
    const unidadSel = document.getElementById('unidadSelect');
    if (sel) sel.innerHTML = '<option value="">-- Seleccione un ciclo --</option>';
    if (unidadSel) unidadSel.innerHTML = '<option value="">-- Seleccione una unidad --</option>';
    if (!carrera) return;
    firebase.database().ref(`carreras/${carrera}/ciclos`).once('value').then(function(snapshot) {
        const ciclos = snapshot.val() || {};
        const keys = Object.keys(ciclos);
        if (sel) {
            sel.innerHTML = '<option value="">-- Seleccione un ciclo --</option>' +
                keys.map(k => `<option value="${k}">${k.replace(/_/g,' ')}</option>`).join('');
            if (cicloPre && keys.includes(cicloPre)) {
                sel.value = cicloPre;
                selectedCiclo = cicloPre;
                cargarUnidadesDocente(carrera, cicloPre);
            }
        }
    });
}

function cargarUnidadesDocente(carrera, ciclo) {
    const unidadSel = document.getElementById('unidadSelect');
    if (!unidadSel) return;
    unidadSel.innerHTML = '<option value="">-- Seleccione una unidad --</option>';
    if (!carrera || !ciclo) return;
    firebase.database().ref(`carreras/${carrera}/ciclos/${ciclo}/cursos`).once('value').then(function(snapshot) {
        const data = snapshot.val() || {};
        let lista = [];
        if (Array.isArray(data)) lista = data.filter(Boolean).map(x => (typeof x === 'string' ? { nombre: x } : x));
        else if (typeof data === 'object') lista = Object.values(data).map(x => (typeof x === 'string' ? { nombre: x } : x));
        unidadSel.innerHTML = '<option value="">-- Seleccione una unidad --</option>' +
            lista.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    });
}

function persistPreferenciasDocente(parcial) {
    const key = getDocenteKey();
    const prefs = Object.assign({}, (function(){ try { return JSON.parse(localStorage.getItem('preferenciasDocente')||'{}'); } catch(e){ return {}; } })(), parcial);
    try { localStorage.setItem('preferenciasDocente', JSON.stringify(prefs)); } catch (e) {}
    if (key) {
        firebase.database().ref('docentes/' + key + '/preferencias').update(prefs);
    }
}

function showError(message) {
    updateStatusMessage(message, 'error');
}

function showSuccess(message) {
    updateStatusMessage(message, 'success');
}

// Cerrar sesión
function logout() {
    if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        window.location.href = 'index.html';
    }
}


// Si no se puede usar import, agregar en docente.html:
// <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>