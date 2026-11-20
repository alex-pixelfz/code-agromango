# MangoNota

MangoNota es un cuaderno digital para acopiadores de mango. Busca ayudar a llevar con claridad los datos de los productores y, en las siguientes etapas, las entregas de mango, los pagos y las canastillas. Reemplaza parte de las anotaciones que hoy se hacen en cuadernos de papel y pueden perderse o tener errores.

> **Estado actual:** la aplicación guarda usuarios y clientes en un archivo JSON local. La web actual es una página sencilla de registro, inicio de sesión y práctica de áreas; aún no tiene pantallas para administrar clientes.

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
- **Clientes en la API:** permite crearlos, buscarlos por nombre, consultarlos, editarlos y archivarlos o reactivarlos cambiando `activo`. Cada usuario solo consulta y modifica sus propios clientes. Estas operaciones aún no tienen pantallas en la web.
- **Áreas:** la página de práctica permite listar y crear áreas con sesión. Sus datos siguen en memoria y se pierden al reiniciar el servidor.
- **Web:** incluye la página de registro/inicio de sesión y la página de áreas. No es todavía una web completa para todas las tareas del acopiador.

## Qué falta

Todavía no están implementados el registro de entregas de mango, los abonos, las devoluciones de canastillas, los saldos ni los comprobantes por WhatsApp. MangoNota funciona sin internet en el computador donde está instalado (después de la primera instalación). Todavía no hay una versión para usar directamente en un celular.

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

No existe una ruta para borrar usuarios, clientes o áreas. Archivar un cliente se hace con `PATCH /clientes/:id` y `{"activo":false}`; reactivarlo, con `{"activo":true}`.

## Seguridad y privacidad

Las contraseñas no se guardan en texto plano; se protegen con bcrypt. El inicio de sesión aplica un límite de intentos fallidos. Las rutas de áreas y clientes piden un token, y los datos de clientes se filtran por la cuenta que inició sesión. No guardes información real innecesaria: los nombres y teléfonos de productores son datos personales. Úsalos solo para el fin de este cuaderno y no subas `backend/data/` a GitHub.

## Carpetas principales

```text
backend/                  API NestJS, autenticación, clientes y almacenamiento local
backend/src/areas/        Práctica de áreas, sus datos siguen en memoria
backend/src/auth/         Registro, inicio de sesión y guard de autenticación
backend/src/clientes/     Rutas y reglas de clientes
backend/src/storage/      Lectura y escritura del archivo JSON
frontend/                 Página web estática de registro, sesión y áreas
src/com/agromango/        Prototipo inicial en Java; se conserva como referencia
```

## Desarrollo

Desarrollado con asistencia de IA (Claude para planear y GitHub Copilot para generar código), con revisión y pruebas del autor.
