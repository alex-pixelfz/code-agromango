const token = sessionStorage.getItem('access_token');

if (!token) {
  window.location.replace('index.html');
} else {
  const searchForm = document.querySelector('#search-form');
  const searchInput = document.querySelector('#client-search');
  const includeInactiveInput = document.querySelector('#show-inactive');
  const clientList = document.querySelector('#client-list');
  const clientCount = document.querySelector('#client-count');
  const message = document.querySelector('#clients-message');
  const dialog = document.querySelector('#client-dialog');
  const form = document.querySelector('#client-form');
  const dialogTitle = document.querySelector('#dialog-title');
  const formMessage = document.querySelector('#form-message');
  const saveButton = document.querySelector('#save-client-button');
  const nameInput = document.querySelector('#client-name');
  const phoneInput = document.querySelector('#client-phone');
  const villageInput = document.querySelector('#client-village');
  let searchTimer;
  let latestLoad = 0;

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('message-error', isError);
  }

  function showFormMessage(text, isError = false) {
    formMessage.textContent = text;
    formMessage.classList.toggle('message-error', isError);
  }

  function handleUnauthorized() {
    sessionStorage.removeItem('access_token');
    sessionStorage.setItem('auth_message', 'Tu sesión venció, entra de nuevo');
    window.location.replace('index.html');
  }

  async function getServerMessage(response, fallback) {
    try {
      const data = await response.json();
      if (Array.isArray(data.message)) return data.message.join('. ');
      if (typeof data.message === 'string') return data.message;
    } catch {
      return fallback;
    }
    return fallback;
  }

  async function request(url, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body) headers.set('Content-Type', 'application/json');

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Tu sesión venció, entra de nuevo.');
    }
    return response;
  }

  function makeClientCard(client) {
    const item = document.createElement('li');
    item.className = 'client-card';

    const info = document.createElement('div');
    info.className = 'client-info';

    const nameRow = document.createElement('div');
    nameRow.className = 'client-name-row';
    const name = document.createElement('h3');
    name.className = 'client-name';
    name.textContent = client.nombre;

    const state = document.createElement('span');
    state.className = client.activo ? 'client-status status-active' : 'client-status status-inactive';
    state.textContent = client.activo ? 'Activo' : 'Archivado';
    nameRow.append(name, state);

    const details = document.createElement('p');
    details.className = 'client-details';
    const detailParts = [];
    if (client.telefono) detailParts.push(`Cel. ${client.telefono}`);
    if (client.vereda) detailParts.push(`Vereda ${client.vereda}`);
    details.textContent = detailParts.join(' · ') || 'Sin teléfono ni vereda registrados';
    info.append(nameRow, details);

    const actions = document.createElement('div');
    actions.className = 'client-actions';
    const accountLink = document.createElement('a');
    accountLink.className = 'action-button account-button';
    accountLink.href = `cuenta.html?cliente=${encodeURIComponent(client.id)}`;
    accountLink.textContent = 'Ver cuenta';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'action-button';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => openEditDialog(client));

    const archiveButton = document.createElement('button');
    archiveButton.type = 'button';
    archiveButton.className = 'action-button action-archive';
    archiveButton.textContent = client.activo ? 'Archivar' : 'Reactivar';
    archiveButton.addEventListener('click', () => changeClientStatus(client));
    actions.append(accountLink, editButton, archiveButton);

    item.append(info, actions);
    return item;
  }

  async function loadClients() {
    const loadId = ++latestLoad;
    showMessage('Cargando clientes…');
    clientList.replaceChildren();

    const params = new URLSearchParams();
    const search = searchInput.value.trim();
    if (search) params.set('buscar', search);
    if (includeInactiveInput.checked) params.set('incluirInactivos', 'true');
    const queryString = params.toString();
    const query = queryString ? `?${queryString}` : '';

    try {
      const response = await request(`/clientes${query}`);
      if (loadId !== latestLoad) return;
      if (!response.ok) {
        showMessage(await getServerMessage(response, 'No se pudieron cargar los clientes.'), true);
        return;
      }

      const clients = await response.json();
      clientCount.textContent = String(clients.length);
      if (clients.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'client-empty';
        empty.textContent = search
          ? 'No encontramos clientes con ese nombre.'
          : 'Aún no tienes clientes. Agrega el primero para comenzar.';
        clientList.append(empty);
      } else {
        clients.forEach((client) => clientList.append(makeClientCard(client)));
      }
      showMessage('');
    } catch (error) {
      if (loadId !== latestLoad) return;
      if (error instanceof TypeError) {
        showMessage('No se pudo conectar con MangoNota. Comprueba que la ventana del servidor siga abierta.', true);
      } else if (error.message !== 'Tu sesión venció, entra de nuevo.') {
        showMessage('Ocurrió un problema al cargar los clientes. Inténtalo de nuevo.', true);
      }
    }
  }

  function resetClientForm() {
    form.reset();
    form.dataset.clientId = '';
    showFormMessage('');
  }

  function openCreateDialog() {
    resetClientForm();
    dialogTitle.textContent = 'Agregar cliente';
    saveButton.textContent = 'Guardar cliente';
    dialog.showModal();
    nameInput.focus();
  }

  function openEditDialog(client) {
    resetClientForm();
    form.dataset.clientId = String(client.id);
    dialogTitle.textContent = 'Editar cliente';
    saveButton.textContent = 'Guardar cambios';
    nameInput.value = client.nombre;
    phoneInput.value = client.telefono || '';
    villageInput.value = client.vereda || '';
    dialog.showModal();
    nameInput.focus();
  }

  async function changeClientStatus(client) {
    const action = client.activo ? 'archivar' : 'reactivar';
    if (!window.confirm(`¿Quieres ${action} a ${client.nombre}?`)) return;

    try {
      const response = await request(`/clientes/${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !client.activo }),
      });
      if (!response.ok) {
        showMessage(await getServerMessage(response, `No se pudo ${action} el cliente.`), true);
        return;
      }
      await loadClients();
      showMessage(client.activo ? 'Cliente archivado.' : 'Cliente reactivado.');
    } catch (error) {
      if (error instanceof TypeError) {
        showMessage('No se pudo conectar con MangoNota. Comprueba que la ventana del servidor siga abierta.', true);
      } else if (error.message !== 'Tu sesión venció, entra de nuevo.') {
        showMessage(`No se pudo ${action} el cliente. Inténtalo de nuevo.`, true);
      }
    }
  }

  document.querySelector('#new-client-button').addEventListener('click', openCreateDialog);
  document.querySelector('#close-dialog-button').addEventListener('click', () => dialog.close());
  document.querySelector('#cancel-dialog-button').addEventListener('click', () => dialog.close());
  document.querySelector('#logout-button').addEventListener('click', () => {
    sessionStorage.removeItem('access_token');
    window.location.assign('index.html');
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    loadClients();
  });

  searchInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(loadClients, 250);
  });

  includeInactiveInput.addEventListener('change', loadClients);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showFormMessage('');
    saveButton.disabled = true;
    saveButton.textContent = 'Guardando…';

    const clientId = form.dataset.clientId;
    const payload = {
      nombre: nameInput.value.trim(),
      telefono: phoneInput.value.trim(),
      vereda: villageInput.value.trim(),
    };
    const url = clientId ? `/clientes/${clientId}` : '/clientes';
    const method = clientId ? 'PATCH' : 'POST';

    try {
      const response = await request(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        showFormMessage(await getServerMessage(response, 'No se pudo guardar el cliente.'), true);
        return;
      }

      dialog.close();
      searchInput.value = '';
      await loadClients();
      showMessage(clientId ? 'Cambios guardados.' : 'Cliente agregado.');
    } catch (error) {
      if (error instanceof TypeError) {
        showFormMessage('No se pudo conectar con MangoNota. Comprueba que la ventana del servidor siga abierta.', true);
      } else if (error.message !== 'Tu sesión venció, entra de nuevo.') {
        showFormMessage('No se pudo guardar el cliente. Inténtalo de nuevo.', true);
      }
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = clientId ? 'Guardar cambios' : 'Guardar cliente';
    }
  });

  dialog.addEventListener('close', resetClientForm);
  loadClients();
}
