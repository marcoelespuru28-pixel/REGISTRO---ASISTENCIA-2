// Variables globales
let currentTab = 1;
let totalTabs = 3;
let users = [];
let currentPage = 1;
let usersPerPage = 5;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

function initializeAdminPanel() {
    console.log('Panel administrativo inicializado');
    setupEventListeners();
    loadUsers();
    setupRoleDependencies();
    showTab(1);
    // Inicializar en modo manual para código y contraseña
    initializeManualModes();
}

function setupEventListeners() {
    // Navegación entre pestañas
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchToTab(tabName);
        });
    });

    // Botones de navegación
    document.getElementById('prevBtn').addEventListener('click', prevTab);
    document.getElementById('nextBtn').addEventListener('click', nextTab);

    // Formulario
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);

    // Búsqueda
    document.getElementById('searchUsers').addEventListener('input', filterUsers);

    // Paginación
    document.getElementById('prevPage').addEventListener('click', prevPage);
    document.getElementById('nextPage').addEventListener('click', nextPage);

    // Dependencias del rol
    document.getElementById('rolUsuario').addEventListener('change', function() {
        toggleRoleFields();
        // Generar código automáticamente cuando cambie el rol (si está en modo auto)
        autoGenerateCode();
    });

    // Configurar botones de generación
    setupGenerationButtons();
}

function setupGenerationButtons() {
        // Solo mantenemos posibles botones que aún existan en el DOM
    const generateCodeBtn = document.querySelector('.generate-code-btn');
    if (generateCodeBtn) generateCodeBtn.onclick = toggleCodeMode;
}

function initializeManualModes() {
    // Configurar código en modo manual por defecto
    const codeInput = document.getElementById('codigoUsuario');
    if (codeInput) {
        codeInput.readOnly = false;
        codeInput.placeholder = 'Ingrese el código manualmente';
    }
    
    // Contraseña: siempre manual
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.readOnly = false;
        passwordInput.type = 'password';
        passwordInput.placeholder = 'Ingrese la contraseña';
    }
}

function setupRoleDependencies() {
    toggleRoleFields();
}

function toggleRoleFields() {
    const rol = document.getElementById('rolUsuario').value;
    // IDs reales en el HTML
    const carreraGroup = document.getElementById('carreraGroup');
    const cicloGroup = document.getElementById('cicloGroup');
    const docenteFields = document.getElementById('docenteFields');
    const alumnoFields = document.getElementById('alumnoFields');

    // Ocultar todos primero
    if (carreraGroup) carreraGroup.style.display = 'none';
    if (cicloGroup) cicloGroup.style.display = 'none';
    if (docenteFields) docenteFields.style.display = 'none';
    if (alumnoFields) alumnoFields.style.display = 'none';

    const carreraSelect = document.getElementById('carrera');
    const especialidadInput = document.getElementById('especialidad');
    const gradoSelect = document.getElementById('gradoAcademico');
    const cicloSelect = document.getElementById('ciclo');

    if (carreraSelect) carreraSelect.required = false;
    if (especialidadInput) especialidadInput.required = false;
    if (gradoSelect) gradoSelect.required = false;
    if (cicloSelect) cicloSelect.required = false;

    if (rol === 'alumno' || rol === 'docente') {
        if (carreraGroup) carreraGroup.style.display = 'block';
        if (cicloGroup) cicloGroup.style.display = 'block';
        if (rol === 'alumno' && alumnoFields) alumnoFields.style.display = 'block';
        if (rol === 'docente' && docenteFields) docenteFields.style.display = 'block';
        if (carreraSelect) carreraSelect.required = true;
        if (cicloSelect) cicloSelect.required = true;
        // Cargar carreras al mostrar
        cargarCarrerasAdmin();
    } else if (rol === 'administrativo') {
        // No campos adicionales requeridos
    }
}

// -------- Carreras y Ciclos (Admin) --------
function cargarCarrerasAdmin() {
    const select = document.getElementById('carrera');
    if (!select || !window.firebase) return;
    // Evitar duplicados si ya se cargó
    if (select.dataset.loaded === '1') return;
    firebase.database().ref('carreras').once('value').then(function(snapshot) {
        select.innerHTML = '<option value="">Seleccionar carrera</option>';
        snapshot.forEach(function(child) {
            const key = child.key;
            const label = String(key).replace(/_/g, ' ');
            select.innerHTML += `<option value="${key}">${label}</option>`;
        });
        select.dataset.loaded = '1';
    });
    // Listener para cargar ciclos al cambiar
    select.addEventListener('change', function() {
        cargarCiclosAdmin(this.value);
    });
}

function cargarCiclosAdmin(carrera) {
    const cicloSelect = document.getElementById('ciclo');
    if (!cicloSelect) return;
    cicloSelect.innerHTML = '<option value="">Seleccionar ciclo</option>';
    if (!carrera) return;
    firebase.database().ref(`carreras/${carrera}/ciclos`).once('value').then(function(snapshot) {
        const keys = Object.keys(snapshot.val() || {});
        cicloSelect.innerHTML = '<option value="">Seleccionar ciclo</option>' +
            keys.map(k => `<option value="${k}">${k.replace(/_/g,' ')}</option>`).join('');
    });
}

// Helpers para llenar selects en el modal de edición
function cargarCarrerasAdminInto(selectEl) {
    return new Promise(resolve => {
        if (!selectEl || !window.firebase) return resolve();
        firebase.database().ref('carreras').once('value').then(function(snapshot) {
            selectEl.innerHTML = '<option value="">Seleccionar carrera</option>';
            snapshot.forEach(function(child) {
                const key = child.key;
                const label = String(key).replace(/_/g, ' ');
                selectEl.innerHTML += `<option value="${key}">${label}</option>`;
            });
            resolve();
        });
        selectEl.onchange = function() {
            cargarCiclosAdminInto(this.value, document.getElementById('editCiclo'));
        };
    });
}

function cargarCiclosAdminInto(carrera, cicloSelectEl) {
    return new Promise(resolve => {
        if (!cicloSelectEl) return resolve();
        cicloSelectEl.innerHTML = '<option value="">Seleccionar ciclo</option>';
        if (!carrera) return resolve();
        firebase.database().ref(`carreras/${carrera}/ciclos`).once('value').then(function(snapshot) {
            const keys = Object.keys(snapshot.val() || {});
            cicloSelectEl.innerHTML = '<option value="">Seleccionar ciclo</option>' +
                keys.map(k => `<option value="${k}">${k.replace(/_/g,' ')}</option>`).join('');
            resolve();
        });
    });
}

function toggleEditRoleFields() {
    const selRol = document.getElementById('editRol');
    const selCarrera = document.getElementById('editCarrera');
    const selCiclo = document.getElementById('editCiclo');
    const carreraWrapper = selCarrera?.closest('.input-group');
    const cicloWrapper = selCiclo?.closest('.input-group');
    const rol = selRol?.value || 'alumno';
    const showAcad = (rol === 'alumno' || rol === 'docente');
    if (carreraWrapper) carreraWrapper.style.display = showAcad ? 'block' : 'none';
    if (cicloWrapper) cicloWrapper.style.display = showAcad ? 'block' : 'none';
}

// Navegación entre pestañas
function showTab(tabNumber) {
    currentTab = tabNumber;
    
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar pestaña actual
    const currentTabElement = document.getElementById(`tab-${getTabName(tabNumber)}`);
    const currentTabButton = document.querySelector(`[data-tab="${getTabName(tabNumber)}"]`);
    
    if (currentTabElement) currentTabElement.classList.add('active');
    if (currentTabButton) currentTabButton.classList.add('active');

    // Actualizar botones de navegación
    updateNavigationButtons();
}

function getTabName(tabNumber) {
    const tabNames = ['personal', 'academic', 'account'];
    return tabNames[tabNumber - 1];
}

function switchToTab(tabName) {
    const tabNumbers = { 'personal': 1, 'academic': 2, 'account': 3 };
    showTab(tabNumbers[tabName]);
}

function prevTab() {
    if (currentTab > 1) {
        showTab(currentTab - 1);
    }
}

function nextTab() {
    if (currentTab < totalTabs) {
        showTab(currentTab + 1);
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (prevBtn) {
        prevBtn.style.display = currentTab > 1 ? 'inline-flex' : 'none';
    }

    if (nextBtn && submitBtn) {
        if (currentTab < totalTabs) {
            nextBtn.style.display = 'inline-flex';
            submitBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-flex';
        }
    }
}

// GENERACIÓN DE CÓDIGO - Modo Manual/Automático
function toggleCodeMode() {
    const codeInput = document.getElementById('codigoUsuario');
    const generateCodeBtn = document.querySelector('.generate-code-btn');
    
    if (!codeInput || !generateCodeBtn) return;
    
    if (codeInput.readOnly) {
        // Cambiar a modo manual
        codeInput.readOnly = false;
        codeInput.placeholder = 'Ingrese el código manualmente';
        generateCodeBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Auto';
        generateCodeBtn.onclick = toggleCodeMode;
    } else {
        // Cambiar a modo automático
        codeInput.readOnly = true;
        autoGenerateCode();
        generateCodeBtn.innerHTML = '<i class="fas fa-edit"></i> Manual';
        generateCodeBtn.onclick = toggleCodeMode;
    }
}

function autoGenerateCode() {
    const rolSelect = document.getElementById('rolUsuario');
    const codeInput = document.getElementById('codigoUsuario');
    
    if (!rolSelect || !codeInput) return;
    
    const rol = rolSelect.value || 'usuario'; // Valor por defecto
    let prefix = 'USR';
    
    if (rol === 'docente') prefix = 'DOC';
    if (rol === 'alumno') prefix = 'ALU';
    if (rol === 'administrativo') prefix = 'ADM';
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}${randomNum}`;
    
    codeInput.value = code;
    console.log('Código generado automáticamente:', code);
}

// Eliminado: generación automática de contraseña

// Manejo del formulario
function handleUserSubmit(e) {
    e.preventDefault();
    // Validación integral antes de enviar
    if (!validateAllRequiredFields()) {
        showStatus('Por favor complete todos los campos requeridos', 'error');
        return;
    }
    showUserConfirmation();
}

function validateForm() {
    // Validar pestaña actual
    const currentTabContent = document.getElementById(`tab-${getTabName(currentTab)}`);
    if (!currentTabContent) return false;
    
    const requiredFields = currentTabContent.querySelectorAll('[required]');
    
    for (let field of requiredFields) {
        if (!field.value.trim()) {
            field.focus();
            return false;
        }
    }

    // Validaciones específicas
    if (currentTab === 1) {
        const email = document.getElementById('email')?.value;
        if (email && !isValidEmail(email)) {
            showStatus('Por favor ingrese un correo electrónico válido', 'error');
            return false;
        }
    }

    if (currentTab === 3) {
        // Ya no forzamos política fuerte de contraseña aquí; solo que exista (handled by required)
        const password = document.getElementById('password')?.value;
        if (!password || !String(password).trim()) {
            showStatus('Ingrese una contraseña', 'error');
            return false;
        }
        
        const userCode = document.getElementById('codigoUsuario')?.value;
        if (userCode && isUserCodeExists(userCode)) {
            showStatus('El código de usuario ya existe. Por favor ingrese un código diferente.', 'error');
            return false;
        }
    }

    return true;
}

function validateAllRequiredFields() {
    const form = document.getElementById('userForm');
    if (!form) return false;

    // Aplicar dependencias del rol para establecer required correctos
    toggleRoleFields();

    const requiredFields = form.querySelectorAll('[required]');
    for (let field of requiredFields) {
        if (!field.value || !String(field.value).trim()) {
            // Cambiar a la pestaña que contiene el campo
            const tab = field.closest('.tab-content');
            if (tab && tab.id) {
                const tabName = tab.id.replace('tab-', '');
                switchToTab(tabName);
                field.focus();
            }
            return false;
        }
    }

    // Validaciones específicas transversales
    const email = document.getElementById('email')?.value;
    if (email && !isValidEmail(email)) {
        switchToTab('personal');
        document.getElementById('email')?.focus();
        return false;
    }

    const password = document.getElementById('password')?.value;
    if (!password || !String(password).trim()) {
        switchToTab('account');
        document.getElementById('password')?.focus();
        return false;
    }

    const rol = document.getElementById('rolUsuario')?.value;
    if (!rol) {
        switchToTab('academic');
        document.getElementById('rolUsuario')?.focus();
        return false;
    }

    if (rol === 'alumno') {
        const carrera = document.getElementById('carrera')?.value;
        const ciclo = document.getElementById('ciclo')?.value;
        if (!carrera || !ciclo) {
            switchToTab('academic');
            return false;
        }
    }
    if (rol === 'docente') {
        const carrera = document.getElementById('carrera')?.value;
        if (!carrera) {
            switchToTab('academic');
            return false;
        }
    }

    // Requeridos de cuenta (según formulario actual)
    const estado = document.getElementById('estadoCuenta')?.value;
    if (!estado) {
        switchToTab('account');
        return false;
    }

    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isPasswordStrong(password) {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password) &&
           /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

function isUserCodeExists(code) {
    const existingUsers = JSON.parse(localStorage.getItem('sistema_usuarios') || '[]');
    return existingUsers.some(user => user.codigoUsuario === code);
}

function gatherUserData() {
    const rol = document.getElementById('rolUsuario')?.value;
    
    return {
        // Datos personales
        tipoDocumento: document.getElementById('tipoDocumento')?.value,
        numeroDocumento: document.getElementById('numeroDocumento')?.value,
        nombres: document.getElementById('nombres')?.value,
        apellidos: document.getElementById('apellidos')?.value,
        fechaNacimiento: document.getElementById('fechaNacimiento')?.value,
        genero: document.getElementById('genero')?.value,
        telefono: document.getElementById('telefono')?.value,
        email: document.getElementById('email')?.value,
        direccion: document.getElementById('direccion')?.value,
        
        // Datos académicos
        rol: rol,
        carrera: document.getElementById('carrera')?.value || null,
        ciclo: document.getElementById('ciclo')?.value || null,
        especialidad: document.getElementById('especialidad')?.value || null,
        gradoAcademico: document.getElementById('gradoAcademico')?.value || null,
        ciclo: rol === 'alumno' ? document.getElementById('ciclo')?.value : null,
        fechaIngreso: document.getElementById('fechaIngreso')?.value || null,
        
        // Datos de cuenta
        password: document.getElementById('password')?.value,
        estadoCuenta: document.getElementById('estadoCuenta')?.value,
        
        // Permisos
        permisos: Array.from(document.querySelectorAll('input[name="permisos"]:checked')).map(cb => cb.value),
        
        // Metadata
        fechaRegistro: new Date().toISOString(),
        id: Date.now()
    };
}

function showUserConfirmation() {
    const userData = gatherUserData();
    const modal = document.getElementById('confirmationModal');
    const userSummary = document.getElementById('userSummary');
    const modalMessage = document.getElementById('modalMessage');
    
    if (!modal || !userSummary || !modalMessage) return;
    
    // Construir resumen del usuario
    userSummary.innerHTML = `
        <div class="user-summary-item">
            <strong>Nombre:</strong> ${userData.nombres} ${userData.apellidos}
        </div>
        <div class="user-summary-item">
            <strong>Rol:</strong> ${userData.rol}
        </div>
        <div class="user-summary-item">
            <strong>Carrera:</strong> ${userData.carrera || 'No especificada'}
        </div>
        <div class="user-summary-item">
            <strong>Contraseña:</strong> ${'*'.repeat(userData.password.length)}
        </div>
        <div class="user-summary-item">
            <strong>Estado:</strong> ${userData.estadoCuenta}
        </div>
    `;
    
    modalMessage.textContent = '¿Está seguro de que desea registrar este usuario?';
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('confirmationModal');
    if (modal) modal.style.display = 'none';
}

async function confirmUserRegistration() {
    const userData = gatherUserData();
    try {
        const res = await fetch('/api/admin/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al crear usuario');
        }
        closeModal();
        showStatus(`✅ Usuario ${userData.nombres} ${userData.apellidos} registrado exitosamente`, 'success');
        resetForm();
        await loadUsers();
    } catch (e) {
        showStatus(`❌ ${e.message}`, 'error');
    }
}

// Compat: funciones invocadas por atributos onclick del HTML
function generateUserCode() { autoGenerateCode(); }
function generatePassword() { autoGeneratePassword(); }

function resetForm() {
    document.getElementById('userForm').reset();
    // Volver a modo manual después del reset
    initializeManualModes();
    showTab(1);
}

// Gestión de usuarios existentes
async function loadUsers() {
    try {
        const res = await fetch('/api/admin/usuarios/listar');
        if (!res.ok) throw new Error('No se pudieron cargar los usuarios');
        const data = await res.json();
        const lista = Array.isArray(data.usuarios) ? data.usuarios : [];
        // Normalizar propiedades para la tabla existente
        users = lista.map(u => ({
            id: u.id,
            nombres: u.nombres || (u.nombre ? (u.nombre.split(' ').slice(0, -1).join(' ') || u.nombre) : ''),
            apellidos: u.apellidos || (u.nombre ? (u.nombre.split(' ').slice(-1).join(' ')) : ''),
            codigoUsuario: u.codigoUsuario || '',
            email: u.email || '',
            rol: u.tipo || u.rol || 'alumno',
            carrera: u.carrera || null,
            estadoCuenta: u.estadoCuenta || 'activo',
            fechaRegistro: u.fechaRegistro || new Date().toISOString(),
            username: u.username || '',
        }));
        displayUsers();
    } catch (e) {
        users = [];
        displayUsers();
        showStatus(e.message, 'error');
    }
}

function displayUsers() {
    const tableBody = document.getElementById('usersTableBody');
    const usersCount = document.getElementById('usersCount');
    const currentPageSpan = document.getElementById('currentPage');
    
    if (!tableBody || !usersCount || !currentPageSpan) return;
    
    // Calcular paginación
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToShow = users.slice(startIndex, endIndex);
    
    // Actualizar información de paginación
    usersCount.textContent = users.length;
    currentPageSpan.textContent = currentPage;
    
    // Actualizar tabla (Email, Nombre, Rol, Estado, Fecha, Acciones)
    tableBody.innerHTML = usersToShow.map(user => `
        <tr>
            <td>${user.email || ''}</td>
            <td>${user.nombres} ${user.apellidos}</td>
            <td>
                <span class="status-badge ${user.rol === 'docente' ? 'status-active' : user.rol === 'alumno' ? 'status-pending' : user.rol === 'administrativo' ? 'status-admin' : ''}">
                    ${user.rol === 'docente' ? 'Docente' : user.rol === 'alumno' ? 'Alumno' : user.rol === 'administrativo' ? 'Administrativo' : (user.rol || '')}
                </span>
            </td>
            <td>
                <span class="status-badge">${user.carrera ? user.carrera.replace(/_/g, ' ') : '-'}</span>
            </td>
            <td>
                <span class="status-badge ${user.estadoCuenta === 'activo' ? 'status-active' : user.estadoCuenta === 'inactivo' ? 'status-inactive' : 'status-pending'}">
                    ${user.estadoCuenta}
                </span>
            </td>
            <td>${user.fechaRegistro ? new Date(user.fechaRegistro).toLocaleDateString('es-ES') : '-'}</td>
            <td>
                <button class="action-btn view-btn" onclick="window.viewUser && window.viewUser('${user.id}')" title="Ver">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" onclick="window.openEditModal && window.openEditModal('${user.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="window.deleteUser && window.deleteUser('${user.id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Actualizar estado de botones de paginación
    updatePaginationButtons();
}

function updatePaginationButtons() {
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage === 1;
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage >= Math.ceil(users.length / usersPerPage);
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayUsers();
    }
}

function nextPage() {
    if (currentPage < Math.ceil(users.length / usersPerPage)) {
        currentPage++;
        displayUsers();
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
    
    if (searchTerm === '') {
        displayUsers();
        return;
    }
    
    const filteredUsers = users.filter(user => 
        user.nombres.toLowerCase().includes(searchTerm) ||
        user.apellidos.toLowerCase().includes(searchTerm) ||
        user.codigoUsuario.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.carrera && user.carrera.toLowerCase().includes(searchTerm))
    );
    
    const tableBody = document.getElementById('usersTableBody');
    if (tableBody) {
        tableBody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td>${user.codigoUsuario}</td>
                <td>${user.nombres} ${user.apellidos}</td>
                <td>${user.rol === 'docente' ? 'Docente' : 'Alumno'}</td>
                <td>${user.carrera || 'N/A'}</td>
                <td>${user.estadoCuenta}</td>
                <td>${new Date(user.fechaRegistro).toLocaleDateString('es-ES')}</td>
                <td>
                    <button class="action-btn view-btn" onclick="window.viewUser && window.viewUser('${user.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="window.openEditModal && window.openEditModal('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="window.deleteUser && window.deleteUser('${user.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Funciones de acciones de usuario
window.viewUser = function(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const modal = document.getElementById('userViewModal');
    const summary = document.getElementById('userViewSummary');
    if (!modal || !summary) return;
    summary.innerHTML = `
        <div class="user-summary-item"><strong>Nombre:</strong> ${user.nombres} ${user.apellidos}</div>
        <div class="user-summary-item"><strong>Rol:</strong> ${user.rol === 'docente' ? 'Docente' : user.rol === 'alumno' ? 'Alumno' : user.rol === 'administrativo' ? 'Administrativo' : user.rol}</div>
        <div class="user-summary-item"><strong>Carrera:</strong> ${user.carrera || 'N/A'}</div>
        <div class="user-summary-item"><strong>Código:</strong> ${user.codigoUsuario || '-'}</div>
        <div class="user-summary-item"><strong>Email:</strong> ${user.email}</div>
        <div class="user-summary-item"><strong>Estado:</strong> ${user.estadoCuenta}</div>
    `;
    modal.style.display = 'flex';
}

window.closeUserViewModal = function() {
    const modal = document.getElementById('userViewModal');
    if (modal) modal.style.display = 'none';
}

// ---- Modal edición inline (CRUD Update) ----
let editingUserId = null;

window.openEditModal = function(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    editingUserId = userId;
    const modal = document.getElementById('userEditModal');
    const selRol = document.getElementById('editRol');
    const selCarrera = document.getElementById('editCarrera');
    const selCiclo = document.getElementById('editCiclo');
    const selEstado = document.getElementById('editEstado');
    if (!modal || !selCarrera || !selCiclo || !selEstado) return;
    // Rol
    if (selRol) {
        selRol.value = (user.rol === 'alumno' || user.rol === 'docente' || user.rol === 'administrativo') ? user.rol : 'alumno';
        selRol.onchange = function() {
            toggleEditRoleFields();
        };
    }
    // Cargar carreras y preseleccionar
    cargarCarrerasAdminInto(selCarrera).then(() => {
        selCarrera.value = user.carrera || '';
        cargarCiclosAdminInto(user.carrera || '', selCiclo).then(() => {
            selCiclo.value = user.ciclo || '';
        });
    });
    selEstado.value = user.estadoCuenta || 'activo';
    toggleEditRoleFields();
    modal.style.display = 'flex';
}

function closeEditModal() {
    const modal = document.getElementById('userEditModal');
    if (modal) modal.style.display = 'none';
    editingUserId = null;
}

async function confirmUserUpdate() {
    if (!editingUserId) return;
    const selRol = document.getElementById('editRol');
    const selCarrera = document.getElementById('editCarrera');
    const selCiclo = document.getElementById('editCiclo');
    const selEstado = document.getElementById('editEstado');
    const payload = {
        rol: selRol?.value || undefined,
        carrera: selCarrera?.value || null,
        ciclo: selCiclo?.value || null,
        estadoCuenta: selEstado?.value || 'activo'
    };
    try {
        const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(editingUserId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('No se pudo actualizar el usuario');
        closeEditModal();
        await loadUsers();
        showStatus('✅ Usuario actualizado', 'success');
    } catch (e) {
        showStatus(`❌ ${e.message}`, 'error');
    }
}

window.deleteUser = async function(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (!confirm(`¿Está seguro de que desea eliminar al usuario ${user.nombres} ${user.apellidos}?`)) return;
    try {
        const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(userId)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('No se pudo eliminar el usuario');
        await loadUsers();
        showStatus('✅ Usuario eliminado exitosamente', 'success');
    } catch (e) {
        showStatus(`❌ ${e.message}`, 'error');
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
}

// Cerrar sesión
function logout() {
	if (confirm('¿Está seguro de que desea cerrar sesión?')) {
		if (window.firebase && firebase.auth) {
			firebase.auth().signOut().finally(() => { window.location.href = '/'; });
		} else {
			window.location.href = '/';
		}
	}
}