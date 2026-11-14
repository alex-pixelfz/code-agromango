const token = sessionStorage.getItem('access_token');

if (!token) {
  window.location.replace('index.html');
} else {
  const form = document.querySelector('#area-form');
  const nameInput = document.querySelector('#area-nombre');
  const activeInput = document.querySelector('#area-activa');
  const areaList = document.querySelector('#area-list');
  const message = document.querySelector('#areas-message');
  const logoutButton = document.querySelector('#logout-button');

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('message-error', isError);
  }

  async function getServerMessage(response, fallback) {
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

  function handleUnauthorized() {
    sessionStorage.removeItem('access_token');
    sessionStorage.setItem('auth_message', 'Tu sesión venció, inicia sesión de nuevo');
    window.location.replace('index.html');
  }

  function addAreaToList(area) {
    const item = document.createElement('li');
    item.className = 'area-item';

    const name = document.createElement('span');
    name.className = 'area-name';
    name.textContent = area.nombre;

    const state = document.createElement('span');
    state.className = area.activa ? 'area-state area-active' : 'area-state area-inactive';
    state.textContent = area.activa ? 'Activa' : 'Inactiva';

    item.append(name, state);
    areaList.append(item);
  }

  async function loadAreas() {
    showMessage('Cargando áreas…');

    try {
      const response = await fetch('/areas', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        showMessage(await getServerMessage(response, 'No se pudieron cargar las áreas.'), true);
        return;
      }

      const areas = await response.json();
      areaList.replaceChildren();

      if (areas.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'area-empty';
        emptyItem.textContent = 'Aún no hay áreas';
        areaList.append(emptyItem);
      } else {
        areas.forEach(addAreaToList);
      }

      showMessage('');
    } catch {
      showMessage('No se pudo conectar con el servidor. Inténtalo de nuevo.', true);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage('Creando área…');

    try {
      const response = await fetch('/areas', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nameInput.value.trim(),
          activa: activeInput.checked,
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        showMessage(await getServerMessage(response, 'No se pudo crear el área.'), true);
        return;
      }

      form.reset();
      activeInput.checked = true;
      await loadAreas();
      showMessage('Área creada correctamente.');
    } catch {
      showMessage('No se pudo conectar con el servidor. Inténtalo de nuevo.', true);
    }
  });

  logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('access_token');
    window.location.assign('index.html');
  });

  loadAreas();
}
