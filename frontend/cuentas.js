const token = sessionStorage.getItem('access_token');
if (!token) {
  window.location.replace('index.html');
} else {
  const message = document.querySelector('#accounts-message');
  const list = document.querySelector('#accounts-list');
  function expired() {
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
        expired();
        return null;
      }
      if (!response.ok) throw new Error('No se pudieron cargar las cuentas.');
      return response.json();
    })
    .then((cuentas) => {
      if (!cuentas) return;
      if (cuentas.length === 0) {
        message.textContent = 'No hay cuentas con saldo pendiente.';
        return;
      }
      cuentas.forEach((cuenta) => {
        const item = document.createElement('li');
        item.className = 'client-card';
        const details = document.createElement('div');
        const name = document.createElement('h2');
        name.className = 'client-name';
        name.textContent = cuenta.cliente.nombre;
        const balance = document.createElement('p');
        balance.className = 'client-details';
        balance.textContent = `Falta por pagar: $${cuenta.saldoPesos.toLocaleString('es-CO')} · Canastillas que debe: ${cuenta.saldoCanastillas}`;
        details.append(name, balance);
        const link = document.createElement('a');
        link.className = 'action-button account-button';
        link.href = `cuenta.html?cliente=${encodeURIComponent(cuenta.cliente.id)}`;
        link.textContent = 'Abrir cuenta';
        item.append(details, link);
        list.append(item);
      });
    })
    .catch(() => {
      message.textContent = 'No se pudo conectar con MangoNota. Revisa que el servidor esté abierto.';
      message.classList.add('message-error');
    });
}
