const token = sessionStorage.getItem('access_token');
if (!token) {
  window.location.replace('index.html');
} else {
  const form = document.querySelector('#delivery-form');
  const clientSelect = document.querySelector('#delivery-client');
  const typeInput = document.querySelector('#delivery-type');
  const qualitySelect = document.querySelector('#delivery-quality');
  const weightInput = document.querySelector('#delivery-weight');
  const priceInput = document.querySelector('#delivery-price');
  const basketsInput = document.querySelector('#delivery-baskets');
  const dateInput = document.querySelector('#delivery-date');
  const clienteInicial = new URLSearchParams(location.search).get('cliente');
  const totalLabel = document.querySelector('#delivery-total');
  const message = document.querySelector('#delivery-message');
  const done = document.querySelector('#delivery-done');
  const today = new Date();
  dateInput.value = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  function expired() {
    sessionStorage.removeItem('access_token');
    sessionStorage.setItem('auth_message', 'Tu sesión venció, entra de nuevo');
    window.location.replace('index.html');
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (response.status === 401) expired();
    return response;
  }

  async function serverMessage(response) {
    try {
      const body = await response.json();
      return Array.isArray(body.message) ? body.message.join('. ') : body.message;
    } catch {
      return '';
    }
  }

  function kilos() {
    const value = Number(weightInput.value.trim().replace(',', '.'));
    return Number.isFinite(value) ? value : 0;
  }

  function total() {
    const centiKg = Math.round(kilos() * 100);
    const price = Number(priceInput.value);
    return Math.round((price * centiKg) / 100);
  }

  function actualizarTotal() {
    totalLabel.textContent = `Total calculado: $${total().toLocaleString('es-CO')}`;
  }

  async function cargarClientes() {
    const response = await request('/clientes');
    if (!response.ok) throw new Error('No se pudieron cargar los clientes.');
    const clients = await response.json();
    clientSelect.replaceChildren();
    const prompt = document.createElement('option');
    prompt.value = '';
    prompt.textContent = clients.length ? 'Selecciona un cliente' : 'Primero agrega un cliente';
    clientSelect.append(prompt);
    clients.forEach((client) => {
      const option = document.createElement('option');
      option.value = String(client.id);
      option.textContent = client.nombre;
      clientSelect.append(option);
    });
    if (clienteInicial && clients.some((client) => String(client.id) === clienteInicial)) {
      clientSelect.value = clienteInicial;
      clientSelect.dispatchEvent(new Event('change'));
    }
  }

  clientSelect.addEventListener('change', async () => {
    if (!clientSelect.value) return;
    try {
      const response = await request(`/clientes/${clientSelect.value}/sugerencias`);
      if (response.status === 401) return;
      if (!response.ok) return;
      const body = await response.text();
      if (!body) return;
      const suggestion = JSON.parse(body);
      if (!suggestion) return;
      typeInput.value = suggestion.tipoMango;
      qualitySelect.value = suggestion.calidad;
      priceInput.value = String(suggestion.precioPorKg);
      actualizarTotal();
    } catch {
      message.textContent = 'No se pudieron cargar los datos de la última entrega.';
      message.classList.add('message-error');
    }
  });

  [weightInput, priceInput].forEach((input) =>
    input.addEventListener('input', actualizarTotal),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const totalPesos = total();
    const clientName = clientSelect.selectedOptions[0]?.textContent || 'el cliente';
    if (!window.confirm(`Se guardará una entrega para ${clientName} por $${totalPesos.toLocaleString('es-CO')}. ¿Continuar?`)) return;
    message.textContent = 'Guardando entrega…';
    message.classList.remove('message-error');
    const body = {
      clienteId: Number(clientSelect.value),
      tipoMango: typeInput.value.trim(),
      calidad: qualitySelect.value,
      pesoKg: kilos(),
      precioPorKg: Number(priceInput.value),
      canastillasEntregadas: Number(basketsInput.value),
      fecha: dateInput.value || undefined,
    };
    try {
      const response = await request('/entregas', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        message.textContent = (await serverMessage(response)) || 'No se pudo guardar la entrega.';
        message.classList.add('message-error');
        return;
      }
      const entrega = await response.json();
      const receiptResponse = await request(`/clientes/${entrega.clienteId}/comprobante?entregaId=${entrega.id}`);
      const receipt = receiptResponse.ok ? await receiptResponse.json() : null;
      document.querySelector('#delivery-result').textContent =
        `${entrega.tipoMango}: ${entrega.pesoKg.toLocaleString('es-CO')} kg · Total $${entrega.totalPesos.toLocaleString('es-CO')}`;
      const whatsapp = document.querySelector('#whatsapp-link');
      if (receipt) {
        whatsapp.href = receipt.url;
        whatsapp.hidden = false;
      } else {
        whatsapp.hidden = true;
      }
      document.querySelector('#delivery-account').href = `cuenta.html?cliente=${entrega.clienteId}`;
      form.hidden = true;
      done.hidden = false;
      message.textContent = '';
    } catch {
      message.textContent = 'No se pudo conectar con MangoNota. Revisa que el servidor siga abierto.';
      message.classList.add('message-error');
    }
  });

  document.querySelector('#another-delivery').addEventListener('click', () => {
    form.reset();
    dateInput.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    form.hidden = false;
    done.hidden = true;
    actualizarTotal();
  });
  document.querySelector('#logout-button').addEventListener('click', () => {
    sessionStorage.removeItem('access_token');
    window.location.replace('index.html');
  });

  cargarClientes().catch(() => {
    message.textContent = 'No se pudieron cargar los clientes. Comprueba que el servidor esté abierto.';
    message.classList.add('message-error');
  });
}
