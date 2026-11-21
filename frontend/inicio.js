const token = sessionStorage.getItem('access_token');
if (!token) {
  window.location.replace('index.html');
} else {
  const message = document.querySelector('#home-message');
  const list = document.querySelector('#home-accounts');

  function volverALogin() {
    sessionStorage.removeItem('access_token');
    sessionStorage.setItem('auth_message', 'Tu sesión venció, entra de nuevo');
    window.location.replace('index.html');
  }

  document.querySelector('#logout-button').addEventListener('click', () => {
    sessionStorage.removeItem('access_token');
    window.location.replace('index.html');
  });

  fetch('/cuentas', { headers: { Authorization: `Bearer ${token}` } })
    .then(async (response) => {
      if (response.status === 401) {
        volverALogin();
        return null;
      }
      if (!response.ok) throw new Error('No se pudieron cargar las cuentas.');
      return response.json();
    })
    .then((cuentas) => {
      if (!cuentas) return;
      if (cuentas.length === 0) {
        message.textContent = 'Todavía no hay clientes con saldo pendiente.';
        return;
      }
      cuentas.slice(0, 5).forEach((cuenta) => {
        const item = document.createElement('li');
        item.className = 'client-card';
        const info = document.createElement('div');
        const name = document.createElement('h3');
        name.className = 'client-name';
        name.textContent = cuenta.cliente.nombre;
        const balance = document.createElement('p');
        balance.className = 'client-details';
        balance.textContent = `Falta por pagar: $${cuenta.saldoPesos.toLocaleString('es-CO')} · Canastillas que debe: ${cuenta.saldoCanastillas}`;
        info.append(name, balance);
        const link = document.createElement('a');
        link.className = 'action-button account-button';
        link.href = `cuenta.html?cliente=${encodeURIComponent(cuenta.cliente.id)}`;
        link.textContent = 'Ver cuenta';
        item.append(info, link);
        list.append(item);
      });
    })
    .catch(() => {
      message.textContent = 'No se pudo conectar con MangoNota. Revisa que el servidor esté abierto.';
      message.classList.add('message-error');
    });
}
