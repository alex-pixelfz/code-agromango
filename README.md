# MangoNota

MangoNota es un cuaderno digital para acopiadores de mango. Permite organizar los datos de los productores, registrar las entregas de mango, los abonos y las canastillas pendientes. Ayuda a reemplazar anotaciones en papel que pueden perderse o tener errores.

> **Estado actual:** la aplicación guarda usuarios, clientes y los movimientos en un archivo JSON local. La web permite registrar entregas de mango, abonos a la cuenta del cliente y devoluciones de canastillas, y consultar los saldos.

## Requisitos

- Windows.
- Node.js LTS instalado.
- Conexión a internet la primera vez, para descargar las dependencias del backend.

## Cómo iniciar

La forma más sencilla es hacer doble clic en `iniciar.bat`. El archivo prepara el backend y lo inicia en `http://localhost:3000`; después abre esa dirección en el navegador. Deja abierta la ventana negra mientras uses MangoNota. Para detener el servidor, cierra esa ventana.

También se puede iniciar manualmente desde una terminal de Windows:

```bat
cd backend
npm.cmd install
npm.cmd run build
npm.cmd run start
```

Luego abre `http://localhost:3000` en el navegador. El backend sirve desde allí la página estática que está en `frontend/`.

## Datos y copias de respaldo

Los usuarios y clientes se guardan en:

```text
backend/data/datos_acopio.json
```

El backend crea ese archivo al arrancar si todavía no existe. También guarda allí el secreto JWT local en `jwt.secret`. La carpeta `backend/data/` está excluida de Git: **no subas esos archivos a GitHub ni los compartas**, porque contienen datos privados y permiten mantener las sesiones.

Para guardar una copia, haz doble clic en `respaldar.bat`. Copia el archivo JSON a `Documentos\MangoNota-respaldos` con fecha y hora en el nombre. También puedes copiar `datos_acopio.json` a una memoria USB. Mantén las copias en un lugar privado.

Si tu carpeta Documentos se sincroniza con OneDrive u otra nube, las copias de respaldo también se subirán allí; cámbialas de lugar si no quieres eso.

## Qué funciona hoy

- **Registro e inicio de sesión** desde la página web. Las contraseñas se guardan protegidas mediante hash y el inicio de sesión limita los intentos fallidos.
- **Clientes:** la web permite crearlos, buscarlos por nombre, editarlos y archivarlos o reactivarlos. Cada usuario solo consulta y modifica sus propios clientes.
- **Entregas de mango:** registra cliente, tipo y calidad del mango, peso, precio por kilo, canastillas prestadas y fecha. El servidor calcula el total en pesos enteros.
- **Cuentas de clientes:** los abonos se registran contra la cuenta completa del productor. Calcula cuánto falta por pagar y cuántas canastillas debe; permite anular entregas, abonos y devoluciones dejando el motivo en el historial.
- **Consultas y comprobantes:** muestra las cuentas con saldo, sugiere el tipo, calidad y precio de la última entrega vigente, y prepara un comprobante para WhatsApp.
- **Áreas:** la página de práctica permite listar y crear áreas con sesión. Sus datos siguen en memoria y se pierden al reiniciar el servidor.
- **Web local:** incluye registro/inicio de sesión, un directorio de clientes y la página de áreas. La web se conecta al servidor local y los datos de usuarios y clientes quedan en el archivo JSON de este computador.

## Qué falta

Todavía no hay una versión para usar directamente en un celular. Los movimientos guardados con las rutas antiguas de recogidas se conservan para consultarlos en esas rutas, pero no se convierten automáticamente al nuevo saldo por entregas. La aplicación funciona sin internet en el computador donde está instalada después de descargar por primera vez las dependencias.

## Rutas de la API

Las rutas protegidas requieren el encabezado `Authorization: Bearer <token>`. El token se obtiene al iniciar sesión.

| Método | Ruta | ¿Pide sesión? | Para qué sirve |
|---|---|---:|---|
| `POST` | `/auth/register` | No | Crear una cuenta de usuario |
| `POST` | `/auth/login` | No | Iniciar sesión y recibir un token |
| `GET` | `/areas` | Sí | Listar áreas en memoria |
| `POST` | `/areas` | Sí | Crear un área en memoria |
| `GET` | `/clientes` | Sí | Listar clientes propios; acepta `buscar` e `incluirInactivos` |
| `GET` | `/clientes/:id` | Sí | Consultar un cliente propio |
| `POST` | `/clientes` | Sí | Crear un cliente propio |
| `PATCH` | `/clientes/:id` | Sí | Editar un cliente propio o cambiar su estado activo |
| `GET` | `/clientes/:id/cuenta` | Sí | Consultar saldos y hasta 10 movimientos recientes |
| `GET` | `/clientes/:id/sugerencias` | Sí | Obtener datos de la última entrega vigente |
| `GET` | `/clientes/:id/comprobante?entregaId=` | Sí | Preparar texto y enlace de WhatsApp |
| `GET` | `/cuentas` | Sí | Listar cuentas con saldo, de mayor a menor |
| `GET` | `/entregas` | Sí | Listar entregas propias; acepta `clienteId` |
| `POST` | `/entregas` | Sí | Registrar una entrega de mango; el servidor calcula el total |
| `POST` | `/entregas/:id/anular` | Sí | Anular una entrega dejando el motivo |
| `GET` | `/abonos` | Sí | Listar abonos propios; acepta `clienteId` |
| `POST` | `/abonos` | Sí | Registrar un abono a la cuenta del cliente |
| `POST` | `/abonos/:id/anular` | Sí | Anular un abono dejando el motivo |
| `GET` | `/devoluciones` | Sí | Listar devoluciones propias; acepta `clienteId` |
| `POST` | `/devoluciones` | Sí | Registrar canastillas devueltas |
| `POST` | `/devoluciones/:id/anular` | Sí | Anular una devolución dejando el motivo |
| `GET` | `/clientes/:id/movimientos` | Sí | Consultar recogidas, devoluciones, abonos y saldos del cliente |
| `POST` | `/clientes/:id/movimientos/recogidas` | Sí | Registrar una recogida con fecha, canastillas y precio |
| `POST` | `/clientes/:id/movimientos/recogidas/:recogidaId/abonos` | Sí | Guardar un abono ligado a una recogida |
| `POST` | `/clientes/:id/movimientos/recogidas/:recogidaId/devoluciones` | Sí | Guardar una devolución de canastillas ligada a una recogida |

No existe una ruta para borrar usuarios, clientes o áreas. Archivar un cliente se hace con `PATCH /clientes/:id` y `{"activo":false}`; reactivarlo, con `{"activo":true}`.

Las rutas `/clientes/:id/movimientos/...` mantienen el formato anterior de recogidas; las pantallas nuevas usan `/entregas`, `/abonos` y `/devoluciones`.

## Seguridad y privacidad

Las contraseñas no se guardan en texto plano; se protegen con bcrypt. El inicio de sesión aplica un límite de intentos fallidos. Las rutas protegidas requieren token y los datos se filtran por la cuenta que inició sesión. No guardes información real innecesaria: los nombres y teléfonos de productores son datos personales. El repositorio es público: no subas `backend/data/` a GitHub.

## Carpetas principales

```text
backend/                  API NestJS, autenticación, movimientos y almacenamiento local
backend/src/areas/        Práctica de áreas, sus datos siguen en memoria
backend/src/auth/         Registro, inicio de sesión y guard de autenticación
backend/src/clientes/     Rutas y reglas de clientes
backend/src/storage/      Lectura y escritura del archivo JSON
frontend/                 Página web estática de registro, clientes, cuentas y movimientos
src/com/agromango/        Prototipo inicial en Java; se conserva como referencia
```

## Desarrollo

Desarrollado con asistencia de IA (Claude para planear y GitHub Copilot para generar código), con revisión y pruebas del autor.
