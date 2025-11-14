// Usar la versión global expuesta por /js/html5-qrcode.min.js
const Html5Qrcode = window.Html5Qrcode;

// Variables globales
let isScanning = false;
let flashOn = false;
let scanHistory = [];
let currentUser = null;

// Script para actualizar perfil del estudiante

document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que Firebase esté listo y el usuario autenticado
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            cargarOpcionesCarrera().then(() => {
                cargarPerfilRealtime(user.uid);
            });
            loadScanHistoryRealtime(user.uid);
        } else {
            // Redirigir si no está autenticado
            window.location.href = '/';
        }
    });
    // Inicializar select de unidades para asistencia
    inicializarSelectUnidades();
// Cargar opciones de carrera desde Firebase y llenar el select
function cargarOpcionesCarrera() {
    return firebase.database().ref('carreras').once('value').then(function(snapshot) {
        const select = document.getElementById('carrera');
        if (!select) return;
        select.innerHTML = '<option value="">Selecciona tu carrera</option>';
        snapshot.forEach(function(child) {
            // Admitir dos estructuras: { carreras: { Nombre_Carrera: {...} }} o lista simple
            const childVal = child.val();
            const keyName = child.key || (typeof childVal === 'string' ? childVal : childVal?.nombre);
            if (keyName) {
                const value = child.key || keyName; // mantener clave real como value
                const label = (keyName || '').toString().replace(/_/g, ' ');
                select.innerHTML += `<option value="${value}">${label}</option>`;
            }
        });
        // Al cambiar carrera, cargar ciclos en el formulario de perfil
        select.addEventListener('change', function() {
            cargarCiclosParaPerfil(this.value);
        });
    });
}

// (moved below to global scope)
});


// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeAlumnoPanel();
});

// Cargar ciclos de una carrera en el formulario de perfil y poblar cursos en el escáner
function cargarCiclosParaPerfil(nombreCarrera, cicloPreseleccionado) {
    const unidadSelect = ensureUnidadSelect();
    const cicloPerfil = document.getElementById('cicloPerfil');
    if (cicloPerfil) cicloPerfil.innerHTML = '<option value="">Selecciona tu ciclo</option>';
    if (!nombreCarrera) {
        if (unidadSelect) unidadSelect.innerHTML = '<option value=\"\">Seleccione un curso</option>';
        return;
    }
    const ref = firebase.database().ref(`carreras/${nombreCarrera}/ciclos`);
    ref.once('value').then(function(snapshot) {
        const ciclos = snapshot.val() || {};
        const cicloKeys = Object.keys(ciclos);
        if (cicloPerfil) {
            cicloPerfil.innerHTML = '<option value=\"\">Selecciona tu ciclo</option>' +
                cicloKeys.map(c => `<option value=\"${c}\">${c.replace(/_/g,' ')}</option>`).join('');
            cicloPerfil.required = true;
            cicloPerfil.onchange = function() {
                cargarCursosPorCiclo(nombreCarrera, this.value);
            };
        }
        if (cicloKeys.length > 0) {
            const cicloInicial = cicloPreseleccionado || ((cicloPerfil && cicloPerfil.value) ? cicloPerfil.value : cicloKeys[0]);
            if (cicloPerfil && !cicloPerfil.value) cicloPerfil.value = cicloInicial;
            cargarCursosPorCiclo(nombreCarrera, cicloInicial);
        } else if (unidadSelect) {
            unidadSelect.innerHTML = '<option value=\"\">No hay cursos</option>';
        }
    });
}

// Llenar cursos para un ciclo específico de una carrera
function cargarCursosPorCiclo(nombreCarrera, cicloClave) {
    const unidadSelect = ensureUnidadSelect();
    if (!nombreCarrera || !cicloClave) {
        if (unidadSelect) unidadSelect.innerHTML = '<option value=\"\">Seleccione un curso</option>';
        return;
    }
    const ref = firebase.database().ref(`carreras/${nombreCarrera}/ciclos/${cicloClave}/cursos`);
    ref.once('value').then(function(snapshot) {
        const cursosObj = snapshot.val() || {};
        let cursos = [];
        if (Array.isArray(cursosObj)) {
            cursos = cursosObj.filter(Boolean).map(c => (typeof c === 'string' ? { nombre: c } : c));
        } else if (typeof cursosObj === 'object') {
            cursos = Object.values(cursosObj).map(c => (typeof c === 'string' ? { nombre: c } : c));
        }
        if (unidadSelect) {
            unidadSelect.innerHTML = '<option value=\"\">Seleccione un curso</option>' +
                cursos.map(c => `<option value=\"${c.nombre}\">${c.nombre}</option>`).join('');
        }
    });
}

function initializeAlumnoPanel() {
    console.log('Panel del alumno inicializado');
    setupEventListeners();
    setupPasswordValidation();
}

function setupEventListeners() {
    // Formulario de perfil
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Formulario de cambio de contraseña
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // Toggle de visibilidad de contraseña
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            if (input) {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            }
        });
    });
    
    // Validación de contraseña en tiempo real
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', validatePasswordStrength);
    }
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }
}

function setupPasswordValidation() {
    validatePasswordStrength();
    checkPasswordMatch();
}

// Escáner QR
function startScanner() {
    if (isScanning) return;
    isScanning = true;
    flashOn = false;
    // Ocultar placeholder y mostrar escáner activo
    const placeholder = document.getElementById('scannerPlaceholder');
    const active = document.getElementById('scannerActive');
    if (placeholder) placeholder.style.display = 'none';
    if (active) active.style.display = 'block';
    showStatus('Escáner activado. Apunte la cámara al código QR', 'info');
    // Inicializar html5-qrcode y permitir selección manual de cámara
    const qrRegion = document.createElement('div');
    qrRegion.id = 'qr-reader';
    active.appendChild(qrRegion);
    const html5QrCode = new Html5Qrcode('qr-reader');
    // Obtener lista de cámaras disponibles
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            // Si hay más de una cámara, mostrar select para elegir
            let cameraSelect = document.getElementById('cameraSelect');
            if (!cameraSelect) {
                cameraSelect = document.createElement('select');
                cameraSelect.id = 'cameraSelect';
                cameraSelect.className = 'unidad-select';
                cameras.forEach(cam => {
                    const option = document.createElement('option');
                    option.value = cam.id;
                    option.textContent = cam.label || cam.id;
                    cameraSelect.appendChild(option);
                });
                active.insertBefore(cameraSelect, qrRegion);
            }
            // Botón para iniciar escaneo con cámara seleccionada
            let btnScan = document.getElementById('btnScanCamera');
            if (!btnScan) {
                btnScan = document.createElement('button');
                btnScan.id = 'btnScanCamera';
                btnScan.textContent = 'Iniciar escaneo';
                btnScan.className = 'scan-btn';
                active.insertBefore(btnScan, qrRegion);
            }
            btnScan.onclick = function() {
                btnScan.disabled = true;
                html5QrCode.start(
                    cameraSelect.value,
                    { fps: 10, qrbox: 250 },
                    qrCodeMessage => {
                        try {
                            const qrData = JSON.parse(qrCodeMessage);
                            registrarAsistenciaDesdeQR(qrData);
                            showStatus('✅ Asistencia registrada correctamente', 'success');
                            html5QrCode.stop();
                            isScanning = false;
                            if (active) active.removeChild(qrRegion);
                            if (cameraSelect) active.removeChild(cameraSelect);
                            if (btnScan) active.removeChild(btnScan);
                            if (placeholder) placeholder.style.display = 'block';
                            if (active) active.style.display = 'none';
                        } catch (e) {
                            showStatus('❌ QR inválido', 'error');
                        }
                    },
                    errorMessage => {
                        // Puedes mostrar errores de escaneo aquí si lo deseas
                    }
                );
            };
        } else {
            showStatus('No se encontraron cámaras disponibles', 'error');
        }
    }).catch(err => {
        showStatus('Error al obtener cámaras: ' + err, 'error');
    });
}

function stopScanner() {
    if (!isScanning) return;
    
    isScanning = false;
    flashOn = false;
    updateFlashButton();
    
    // Ocultar escáner activo y mostrar placeholder
    const placeholder = document.getElementById('scannerPlaceholder');
    const active = document.getElementById('scannerActive');
    
    if (placeholder) placeholder.style.display = 'block';
    if (active) active.style.display = 'none';
    
    showStatus('Escáner detenido', 'info');
}

function toggleFlash() {
    if (!isScanning) return;
    
    flashOn = !flashOn;
    updateFlashButton();
    
    showStatus(flashOn ? 'Flash encendido' : 'Flash apagado', 'info');
}

function updateFlashButton() {
    const flashIcon = document.getElementById('flashIcon');
    const flashText = document.getElementById('flashText');
    
    if (!flashIcon || !flashText) return;
    
    if (flashOn) {
        flashIcon.className = 'fas fa-lightbulb';
        flashIcon.style.color = '#f59e0b';
        flashText.textContent = 'Apagar Flash';
    } else {
        flashIcon.className = 'fas fa-lightbulb';
        flashIcon.style.color = '';
        flashText.textContent = 'Encender Flash';
    }
}

function registrarAsistenciaDesdeQR(qrData) {
    if (!currentUser) return;
    // Validar que el alumno esté en la misma carrera/ciclo/unidad que el QR
    const carreraAlumno = document.getElementById('carrera')?.value || '';
    const cicloAlumno = document.getElementById('cicloPerfil')?.value || '';
    const unidadAlumno = document.getElementById('unidadSelect')?.value || '';
    // Carrera y ciclo obligatorios cuando el QR los provee
    if ((qrData.carrera || qrData.ciclo) && (!carreraAlumno || !cicloAlumno)) {
        showStatus('Complete su carrera y ciclo en el perfil antes de escanear', 'error');
        mostrarToast('Complete carrera y ciclo');
        return;
    }
    if (!unidadAlumno) {
        showStatus('Seleccione su curso antes de escanear el QR', 'error');
        mostrarToast('Seleccione su curso');
        return;
    }
    // Comparar carrera y ciclo si están presentes en el QR
    if (qrData.carrera && carreraAlumno !== qrData.carrera) {
        showStatus('La carrera seleccionada no coincide con la del QR', 'error');
        mostrarToast('Carrera no coincide con el QR');
        return;
    }
    if (qrData.ciclo && cicloAlumno !== qrData.ciclo) {
        showStatus('El ciclo seleccionado no coincide con el del QR', 'error');
        mostrarToast('Ciclo no coincide con el QR');
        return;
    }
    if (unidadAlumno !== qrData.unidad) {
        showStatus(`El curso seleccionado (${unidadAlumno}) no coincide con el QR (${qrData.unidad})`, 'error');
        mostrarToast('Curso no coincide con el QR');
        return;
    }
    // Guardar la asistencia en Firebase
    const asistencia = {
        unidad: qrData.unidad,
        turno: qrData.turno,
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        docente: qrData.docente,
        nombreDocente: qrData.nombreDocente || '',
        alumno: currentUser.uid,
        status: 'success',
        mensaje: 'Asistencia registrada correctamente'
    };
    const ref = firebase.database().ref('asistencias/' + currentUser.uid);
    // Índice por sesión: docente/unidad/turno/fecha (YYYYMMDD)/alumnoUid
    const fechaKey = (function() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${day}`;
    })();

    const sesionPath = `asistencias_sesiones/${qrData.docente}/${qrData.unidad}/${qrData.turno}/${fechaKey}/${currentUser.uid}`;
    const sesionRef = firebase.database().ref(sesionPath);

    // Índice por curso (vinculado al alumno): asistencias_por_curso/{uid}/{unidad}/{YYYYMMDD}/{autoId}
    const cursoPath = `asistencias_por_curso/${currentUser.uid}/${qrData.unidad}/${fechaKey}`;
    const cursoRef = firebase.database().ref(cursoPath).push();

    ref.push(asistencia, function(error) {
        if (error) {
            showStatus('Error al guardar asistencia', 'error');
        } else {
            // Escribir/actualizar en el índice de la sesión del docente
            sesionRef.set({
                ...asistencia,
                fechaKey: fechaKey,
                emailAlumno: currentUser.email || ''
            });
            // Escribir también en el índice por curso del alumno
            cursoRef.set({
                ...asistencia,
                fechaKey: fechaKey
            });
        }
    });
}

// Historial de escaneos
function loadScanHistory() {
    // Este método ya no se usa. Ahora se carga desde Firebase.
}

function loadScanHistoryRealtime(uid) {
    firebase.database().ref('asistencias/' + uid).limitToLast(10).on('value', function(snapshot) {
        const history = [];
        snapshot.forEach(function(child) {
            history.unshift(child.val());
        });
        scanHistory = history;
        updateScanHistoryDisplay();
    });
}

function addScanToHistory(scanRecord) {
    if (!currentUser) return;
    // Guardar el escaneo en Firebase Realtime Database
    const ref = firebase.database().ref('asistencias/' + currentUser.uid);
    ref.push(scanRecord, function(error) {
        if (error) {
            showStatus('Error al guardar asistencia', 'error');
        } else {
            // El historial se actualizará automáticamente por el listener
        }
    });
}

function updateScanHistoryDisplay() {
    const historyContainer = document.getElementById('scanHistory');
    
    if (!historyContainer) return;
    
    if (scanHistory.length === 0) {
        historyContainer.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-history"></i>
                <p>No hay escaneos recientes</p>
            </div>
        `;
        return;
    }
    
    historyContainer.innerHTML = scanHistory.map(scan => `
        <div class="scan-record">
            <div class="scan-info">
                <span class="scan-status ${scan.status}">${scan.status === 'success' ? '✅' : '❌'}</span>
                <div>
                    <div class="scan-unidad">${scan.unidad}</div>
                    <div class="scan-time">${scan.fecha} ${scan.hora}</div>
                </div>
            </div>
            <div class="scan-message">${scan.mensaje}</div>
        </div>
    `).join('');
}

// Actualizar perfil
function handleProfileUpdate(e) {
    e.preventDefault();
    if (!currentUser) return;
    const nombre = document.getElementById('nombre').value;
    const email = currentUser.email;
    const telefono = document.getElementById('telefono').value;
    const carrera = document.getElementById('carrera').value;
    const ciclo = document.getElementById('cicloPerfil')?.value || '';
    const direccion = document.getElementById('direccion').value;
    // Validaciones básicas
    if (!email || !telefono || !direccion) {
        showStatus('Por favor complete todos los campos', 'error');
        return;
    }
    if (!isValidEmail(email)) {
        showStatus('Por favor ingrese un correo válido', 'error');
        return;
    }
    if (carrera && !ciclo) {
        showStatus('Seleccione su ciclo para la carrera elegida', 'error');
        const cicloPerfilEl = document.getElementById('cicloPerfil');
        if (cicloPerfilEl) cicloPerfilEl.focus();
        return;
    }
    // Guardar en Firebase vinculado al usuario actual
    firebase.database().ref('alumnos/' + currentUser.uid).set({
        nombre, email, telefono, carrera, ciclo, direccion
    }, function(error) {
        if (error) {
            showStatus('Error al actualizar perfil', 'error');
        } else {
            showStatus('✅ Perfil actualizado correctamente', 'success');
            mostrarToast('Perfil actualizado correctamente');
        }
    });

// Notificación tipo toast
function mostrarToast(mensaje) {
    let toast = document.getElementById('toastNoti');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNoti';
        toast.style.position = 'fixed';
        toast.style.bottom = '30px';
        toast.style.right = '30px';
        toast.style.background = '#10b981';
        toast.style.color = '#fff';
        toast.style.padding = '14px 28px';
        toast.style.borderRadius = '8px';
        toast.style.fontSize = '1rem';
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        toast.style.zIndex = '9999';
        document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}
}
// Script para cargar perfil desde Realtime Database
// Inicializar select de unidades
function ensureUnidadSelect() {
    let select = document.getElementById('unidadSelect');
    if (!select) {
        const container = document.getElementById('scannerPlaceholder');
        if (container) {
            select = document.createElement('select');
            select.id = 'unidadSelect';
            select.className = 'unidad-select';
            container.insertBefore(select, container.firstChild);
        }
    }
    return select;
}

function ensureCicloSelect() {
    let select = document.getElementById('cicloSelect');
    if (!select) {
        const container = document.getElementById('scannerPlaceholder');
        if (container) {
            select = document.createElement('select');
            select.id = 'cicloSelect';
            select.className = 'unidad-select';
            // Insertar antes del select de unidad si existe, sino al inicio
            const unidad = document.getElementById('unidadSelect');
            if (unidad) {
                container.insertBefore(select, unidad);
            } else {
                container.insertBefore(select, container.firstChild);
            }
        }
    }
    return select;
}

function inicializarSelectUnidades() {
    const select = ensureUnidadSelect();
    if (select) select.innerHTML = '<option value="">Seleccione un curso</option>';
}
function cargarPerfilRealtime(uid) {
    firebase.database().ref('alumnos/' + uid).once('value').then(function(snapshot) {
        const alumno = snapshot.val();
        document.getElementById('nombre').value = alumno?.nombre || '';
        // Mostrar el correo del usuario autenticado, no editable
        document.getElementById('email').value = currentUser?.email || '';
        document.getElementById('telefono').value = alumno?.telefono || '';
        const carreraSelect = document.getElementById('carrera');
        if (carreraSelect && alumno?.carrera) {
            // Intentar asignar por clave; si no existe, convertir espacios -> guiones bajos
            carreraSelect.value = alumno.carrera;
            if (carreraSelect.value !== alumno.carrera) {
                const underscored = String(alumno.carrera).replace(/\s+/g, '_');
                carreraSelect.value = underscored;
            }
            // Si hay carrera y ciclo guardados, pre-cargar ciclos y cursos
            if (alumno.ciclo) {
                cargarCiclosParaPerfil(carreraSelect.value, alumno.ciclo);
            } else {
                cargarCiclosParaPerfil(carreraSelect.value);
            }
        }
        document.getElementById('direccion').value = alumno?.direccion || '';
        // Preseleccionar ciclo si existe en el perfil
        const cicloPerfil = document.getElementById('cicloPerfil');
        if (cicloPerfil && alumno?.ciclo) {
            cicloPerfil.value = alumno.ciclo;
        }
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Cambiar contraseña
function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
        showStatus('Por favor complete todos los campos', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showStatus('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (!isPasswordStrong(newPassword)) {
        showStatus('La contraseña no cumple con los requisitos de seguridad', 'error');
        return;
    }
    
    // Cambiar la contraseña real en Firebase Auth
    const user = firebase.auth().currentUser;
    if (user) {
        // Reautenticación si es necesario
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        user.reauthenticateWithCredential(credential)
            .then(() => {
                return user.updatePassword(newPassword);
            })
            .then(() => {
                showStatus('✅ Contraseña cambiada correctamente', 'success');
                mostrarToast('Contraseña cambiada correctamente');
                const passwordForm = document.getElementById('passwordForm');
                if (passwordForm) passwordForm.reset();
                validatePasswordStrength();
                checkPasswordMatch();
                console.log('Contraseña cambiada');
            })
            .catch(error => {
                showStatus('Error al cambiar la contraseña: ' + error.message, 'error');
                mostrarToast('Error al cambiar la contraseña');
            });
    } else {
        showStatus('No hay usuario autenticado', 'error');
        mostrarToast('No hay usuario autenticado');
    }
}

function validatePasswordStrength() {
    const passwordInput = document.getElementById('newPassword');
    if (!passwordInput) return;
    
    const password = passwordInput.value;
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    const requirements = {
        length: document.getElementById('reqLength'),
        upper: document.getElementById('reqUpper'),
        number: document.getElementById('reqNumber'),
        special: document.getElementById('reqSpecial')
    };
    
    if (!strengthBar || !strengthText) return;
    
    let strength = 0;
    
    // Verificar cada requisito
    const checks = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    // Actualizar indicadores visuales
    Object.keys(checks).forEach(key => {
        if (requirements[key]) {
            if (checks[key]) {
                requirements[key].classList.add('valid');
                strength += 25;
            } else {
                requirements[key].classList.remove('valid');
            }
        }
    });
    
    // Actualizar barra de fuerza
    strengthBar.style.width = strength + '%';
    
    // Actualizar texto y color
    if (strength === 0) {
        strengthBar.style.background = '#ef4444';
        strengthText.textContent = 'Seguridad: Muy débil';
    } else if (strength <= 50) {
        strengthBar.style.background = '#f59e0b';
        strengthText.textContent = 'Seguridad: Débil';
    } else if (strength <= 75) {
        strengthBar.style.background = '#10b981';
        strengthText.textContent = 'Seguridad: Buena';
    } else {
        strengthBar.style.background = '#059669';
        strengthText.textContent = 'Seguridad: Excelente';
    }
    
    return strength >= 75;
}

function isPasswordStrong(password) {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[0-9]/.test(password) &&
           /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

function checkPasswordMatch() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const matchElement = document.getElementById('passwordMatch');
    
    if (!newPasswordInput || !confirmPasswordInput || !matchElement) return;
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!newPassword || !confirmPassword) {
        matchElement.textContent = '';
        return;
    }
    
    if (newPassword === confirmPassword) {
        matchElement.textContent = '✅ Las contraseñas coinciden';
        matchElement.style.color = '#10b981';
    } else {
        matchElement.textContent = '❌ Las contraseñas no coinciden';
        matchElement.style.color = '#ef4444';
    }
}

// Mensajes de estado
function showStatus(message, type = 'info') {
    const statusMessage = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText');
    
    if (!statusMessage || !statusText) return;
    
    const icon = statusMessage.querySelector('i');
    
    statusText.textContent = message;
    
    statusMessage.className = 'status-message';
    if (icon) icon.className = 'fas';
    
    switch(type) {
        case 'error':
            statusMessage.classList.add('error');
            if (icon) icon.classList.add('fa-exclamation-triangle');
            break;
        case 'success':
            statusMessage.classList.add('success');
            if (icon) icon.classList.add('fa-check-circle');
            break;
        default:
            if (icon) icon.classList.add('fa-info-circle');
    }
    
    // Auto-ocultar mensajes de éxito después de 5 segundos
    if (type === 'success') {
        setTimeout(() => {
            if (statusText.textContent === message) {
                showStatus('Panel del estudiante', 'info');
            }
        }, 5000);
    }
}

// Notificación tipo toast global
function mostrarToast(mensaje) {
    let toast = document.getElementById('toastNoti');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNoti';
        toast.style.position = 'fixed';
        toast.style.bottom = '30px';
        toast.style.right = '30px';
        toast.style.background = '#10b981';
        toast.style.color = '#fff';
        toast.style.padding = '14px 28px';
        toast.style.borderRadius = '8px';
        toast.style.fontSize = '1rem';
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        toast.style.zIndex = '9999';
        document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// Cerrar sesión
function logout() {
  // Si usas Firebase Auth:
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(function() {
      window.location.href = "/";
    });
  } else {
    window.location.href = "/";
  }
}

// Exponer funciones usadas por handlers inline en el HTML
window.startScanner = startScanner;
window.stopScanner = stopScanner;
window.toggleFlash = toggleFlash;
window.logout = logout;