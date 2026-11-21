const token = sessionStorage.getItem('access_token');
const clienteId = new URLSearchParams(location.search).get('cliente');
if (!token) {
  window.location.replace('index.html');
} else if (!/^\d+$/.test(clienteId || '') || Number(clienteId) < 1) {
  window.location.replace('clientes.html');
} else {
  const message = document.querySelector('#account-message');
  const movementList = document.querySelector('#movement-list');
  let latestDeliveries = [];
  let client = null;
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.querySelector('#abono-date').value = today;
  document.querySelector('#return-date').value = today;
  document.querySelector('#new-delivery-link').href = `entrega.html?cliente=${clienteId}`;

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

  async function responseMessage(response) {
    try {
      const body = await response.json();
      return Array.isArray(body.message) ? body.message.join('. ') : body.message;
    } catch {
      return 'No se pudo completar el movimiento.';
    }
  }

  function setMessage(node, text, isError = false) {
    node.textContent = text;
    node.classList.toggle('message-error', isError);
  }

  function makeMovement(movement) {
    const item = document.createElement('li');
    item.className = movement.anulada ? 'movement-item movement-cancelled' : 'movement-item';
    const details = document.createElement('div');
    const title = document.createElement('strong');
    const date = document.createElement('span');
    const extra = document.createElement('p');
    const typeLabels = { ENTREGA: 'Entrega', ABONO: 'Abono', DEVOLUCION: 'Devolución de canastillas' };
    title.textContent = movement.id === 0
      ? movement.descripcion
      : `${typeLabels[movement.tipo] || movement.tipo}: ${movement.descripcion}`;
    date.textContent = movement.fecha ? new Date(`${movement.fecha}T00:00:00`).toLocaleDateString('es-CO') : '';
    const bits = [];
    if (movement.montoPesos !== undefined) bits.push(`$${movement.montoPesos.toLocaleString('es-CO')}`);
    if (movement.cantidad !== undefined) bits.push(`${movement.cantidad} canastillas`);
    if (movement.anulada) bits.push(`Anulada: ${movement.motivoAnulacion}`);
    extra.textContent = bits.join(' · ');
    details.append(title, date, extra);
    item.append(details);
    if (!movement.anulada && movement.id > 0) {
      const button = document.createElement('button');
      button.className = 'action-button action-archive';
      button.type = 'button';
      button.textContent = 'Anular (queda anotado)';
      button.addEventListener('click', () => anular(movement));
      item.append(button);
    }
    return item;
  }

  async function anular(movement) {
    const motivo = window.prompt('Escribe el motivo de la anulación (3 a 200 caracteres):');
    if (motivo === null) return;
    if (!window.confirm('El movimiento quedará visible como anulado. ¿Continuar?')) return;
    const endpoint = movement.tipo === 'ENTREGA' ? 'entregas' : movement.tipo === 'ABONO' ? 'abonos' : 'devoluciones';
    try {
      const response = await request(`/${endpoint}/${movement.id}/anular`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      });
      if (!response.ok) {
        setMessage(message, await responseMessage(response), true);
        return;
      }
      await cargarCuenta();
      setMessage(message, 'Movimiento anulado y conservado en el historial.');
    } catch {
      setMessage(message, 'No se pudo conectar con MangoNota.', true);
    }
  }

  async function cargarCuenta() {
    const [clientResponse, accountResponse, deliveriesResponse] = await Promise.all([
      request(`/clientes/${clienteId}`),
      request(`/clientes/${clienteId}/cuenta`),
      request(`/entregas?clienteId=${clienteId}`),
    ]);
    if ([clientResponse, accountResponse, deliveriesResponse].some((response) => response.status === 401)) return;
    if (!clientResponse.ok || !accountResponse.ok || !deliveriesResponse.ok) {
      setMessage(message, 'No se pudo cargar la cuenta del cliente.', true);
      return;
    }
    client = await clientResponse.json();
    const account = await accountResponse.json();
    latestDeliveries = await deliveriesResponse.json();
    document.querySelector('#client-name').textContent = client.nombre;
    document.querySelector('#client-contact').textContent = [client.telefono, client.vereda].filter(Boolean).join(' · ');
    document.querySelector('#money-balance').textContent = `$${account.saldoPesos.toLocaleString('es-CO')}`;
    document.querySelector('#basket-balance').textContent = String(account.saldoCanastillas);
    document.querySelector('#total-paid').textContent = `$${account.totalAbonadoPesos.toLocaleString('es-CO')}`;
    document.querySelector('#archived-notice').hidden = client.activo;
    document.querySelector('#movement-forms').hidden = !client.activo;
    document.querySelector('#new-delivery-link').hidden = !client.activo;
    const shareLink = document.querySelector('#share-account');
    const latest = latestDeliveries.find((delivery) => !delivery.anuladaEn);
    if (latest) {
      const receiptResponse = await request(
        `/clientes/${clienteId}/comprobante?entregaId=${latest.id}`,
      );
      if (receiptResponse.status === 401) return;
      if (receiptResponse.ok) {
        const receipt = await receiptResponse.json();
        shareLink.href = receipt.url;
        shareLink.removeAttribute('aria-disabled');
      } else {
        shareLink.removeAttribute('href');
        shareLink.setAttribute('aria-disabled', 'true');
      }
    } else {
      shareLink.removeAttribute('href');
      shareLink.setAttribute('aria-disabled', 'true');
    }
    movementList.replaceChildren(...account.movimientos.map(makeMovement));
  }

  document.querySelector('#abono-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const amount = Number(document.querySelector('#abono-amount').value);
    if (!window.confirm(`Se registrará un abono de $${amount.toLocaleString('es-CO')}. ¿Continuar?`)) return;
    const output = document.querySelector('#abono-message');
    try {
      const response = await request('/abonos', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: Number(clienteId),
          montoPesos: amount,
          fecha: document.querySelector('#abono-date').value,
        }),
      });
      if (!response.ok) {
        setMessage(output, await responseMessage(response), true);
        return;
      }
      event.target.reset();
      document.querySelector('#abono-date').value = today;
      await cargarCuenta();
      setMessage(output, 'Abono guardado.');
    } catch {
      setMessage(output, 'No se pudo conectar con MangoNota.', true);
    }
  });

  document.querySelector('#return-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const output = document.querySelector('#return-message');
    try {
      const response = await request('/devoluciones', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: Number(clienteId),
          cantidad: Number(document.querySelector('#return-amount').value),
          fecha: document.querySelector('#return-date').value,
        }),
      });
      if (!response.ok) {
        setMessage(output, await responseMessage(response), true);
        return;
      }
      event.target.reset();
      document.querySelector('#return-date').value = today;
      await cargarCuenta();
      setMessage(output, 'Devolución guardada.');
    } catch {
      setMessage(output, 'No se pudo conectar con MangoNota.', true);
    }
  });

  document.querySelector('#logout-button').addEventListener('click', () => {
    sessionStorage.removeItem('access_token');
    window.location.replace('index.html');
  });
  cargarCuenta().catch(() => setMessage(message, 'No se pudo conectar con MangoNota.', true));
}
