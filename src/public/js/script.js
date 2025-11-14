// --- Lógica de login/registro extraída de index.html ---
document.addEventListener('DOMContentLoaded', function() {
	// Alternar entre login y registro
	const toggleBtn = document.getElementById('toggleFormBtn');
	const loginForm = document.getElementById('loginForm');
	const registerForm = document.getElementById('registerForm');
	let showingLogin = true;
	toggleBtn.addEventListener('click', function() {
		if (showingLogin) {
			loginForm.style.display = 'none';
			registerForm.style.display = 'flex';
			toggleBtn.textContent = 'Ir a Login';
		} else {
			loginForm.style.display = 'flex';
			registerForm.style.display = 'none';
			toggleBtn.textContent = 'Ir a Registro';
		}
		showingLogin = !showingLogin;
	});

	// Mostrar mensajes
	window.showMessage = function(msg, isError = false) {
		let msgDiv = document.getElementById('msgDiv');
		if (!msgDiv) {
			msgDiv = document.createElement('div');
			msgDiv.id = 'msgDiv';
			msgDiv.style.position = 'fixed';
			msgDiv.style.top = '20px';
			msgDiv.style.left = '50%';
			msgDiv.style.transform = 'translateX(-50%)';
			msgDiv.style.padding = '10px 20px';
			msgDiv.style.borderRadius = '7px';
			msgDiv.style.zIndex = '9999';
			document.body.appendChild(msgDiv);
		}
		msgDiv.textContent = msg;
		msgDiv.style.background = isError ? '#ff4d4d' : '#4caf50';
		msgDiv.style.color = '#fff';
		setTimeout(() => { msgDiv.textContent = ''; }, 3000);
	}

	// Usar la instancia global de Firebase ya inicializada en el HTML
	const auth = firebase.auth();

	// Login con email/password
	loginForm.addEventListener('submit', async function(e) {
		e.preventDefault();
		const email = document.getElementById('login_email_field').value;
		const password = document.getElementById('login_password_field').value;
		try {
			const cred = await auth.signInWithEmailAndPassword(email, password);
			const user = cred.user;
			const token = await user.getIdToken();
			// Enviar token al backend y redirigir según tipo
			const resp = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
			});
			const data = await resp.json();
			if (data.exito && data.redireccion) {
				showMessage('Login exitoso');
				setTimeout(() => { window.location.href = data.redireccion; }, 1000);
			} else {
				showMessage('Error en login', true);
			}
		} catch (err) {
			if (err.code === 'auth/wrong-password' || err.message.includes('INVALID_LOGIN_CREDENTIALS')) {
				showMessage('Credenciales inválidas. Es posible que hayas cambiado tu contraseña desde el perfil. Intenta nuevamente o recupera tu contraseña.', true);
			} else {
				showMessage(err.message, true);
			}
		}
	});

	// Registro con email/password
	registerForm.addEventListener('submit', async function(e) {
		e.preventDefault();
		const nombre = document.getElementById('register_name_field').value;
		const email = document.getElementById('register_email_field').value;
		const password = document.getElementById('register_password_field').value;
		try {
			await auth.createUserWithEmailAndPassword(email, password);
			showMessage('Registro exitoso');
			// Alternar a login automáticamente
			loginForm.style.display = 'flex';
			registerForm.style.display = 'none';
			toggleBtn.textContent = 'Ir a Registro';
			showingLogin = true;
		} catch (err) {
			showMessage(err.message, true);
		}
	});

	// Login con Google (login)
	document.getElementById('btnGoogleLogin').addEventListener('click', async function() {
		const provider = new firebase.auth.GoogleAuthProvider();
		try {
			const result = await auth.signInWithPopup(provider);
			const user = result.user;
			const token = await user.getIdToken();
			// Enviar token al backend y redirigir según tipo
			const resp = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
			});
			const data = await resp.json();
			if (data.exito && data.redireccion) {
				showMessage('Login con Google exitoso');
				setTimeout(() => { window.location.href = data.redireccion; }, 1000);
			} else {
				showMessage('Error en login con Google', true);
			}
		} catch (err) {
			showMessage(err.message, true);
		}
	});

	// Registro con Google (registro)
	document.getElementById('btnGoogleRegister').addEventListener('click', async function() {
		const provider = new firebase.auth.GoogleAuthProvider();
		try {
			const result = await auth.signInWithPopup(provider);
			const user = result.user;
			const token = await user.getIdToken();
			// Enviar token al backend para guardar usuario
			await fetch('/api/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
			});
			showMessage('Registro con Google exitoso');
			loginForm.style.display = 'flex';
			registerForm.style.display = 'none';
			toggleBtn.textContent = 'Ir a Registro';
			showingLogin = true;
			setTimeout(() => { window.location.reload(); }, 1000);
		} catch (err) {
			showMessage(err.message, true);
		}
	});
});
