const registerForm = document.querySelector('#register-form');
const loginForm = document.querySelector('#login-form');
const message = document.querySelector('#mensaje');

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('message-error', isError);
}

const savedMessage = sessionStorage.getItem('auth_message');
if (savedMessage) {
  showMessage(savedMessage, true);
  sessionStorage.removeItem('auth_message');
}

async function getResponseMessage(response, fallback) {
  try {
    const data = await response.json();
    if (Array.isArray(data.message)) {
      return data.message.join('. ');
    }
    if (typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function getCredentials(form) {
  const formData = new FormData(form);
  return {
    usuario: formData.get('usuario'),
    contrasena: formData.get('contrasena'),
  };
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('Creando la cuenta…');

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getCredentials(registerForm)),
    });

    if (!response.ok) {
      showMessage(await getResponseMessage(response, 'No se pudo crear la cuenta.'), true);
      return;
    }

    showMessage('Cuenta creada. Ya puedes iniciar sesión.');
    registerForm.reset();
  } catch {
    showMessage('No se pudo conectar con el servidor. Inténtalo de nuevo.', true);
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('Iniciando sesión…');

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getCredentials(loginForm)),
    });

    if (!response.ok) {
      showMessage(await getResponseMessage(response, 'No se pudo iniciar sesión.'), true);
      return;
    }

    const data = await response.json();
    if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
      showMessage('El servidor no devolvió un token válido.', true);
      return;
    }

    sessionStorage.setItem('access_token', data.access_token);
    window.location.assign('areas.html');
  } catch {
    showMessage('No se pudo conectar con el servidor. Inténtalo de nuevo.', true);
  }
});
