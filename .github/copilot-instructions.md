# Proyecto: Cuaderno Digital Agro (MangoNota)

## Objetivo actual
Construir un backend en NestJS (JavaScript/TypeScript) según la guía del seminario "Backend I":
- Servidor NestJS en el puerto 3000, arrancado con `npm run start`.
- Módulo `areas` con 3 archivos: areas.module.ts, areas.controller.ts, areas.service.ts.
- Un Area tiene `nombre` (texto) y `activa` (booleano, true por defecto) y un `id` incremental.
- GET /areas lista todas. POST /areas crea una (usa @Body()), responde 201.
- Si falta `nombre`, responder 400 con un mensaje claro.
- Datos guardados en memoria por ahora (sin base de datos).
- Después se repite el mismo patrón (módulo, controlador, servicio) para acopios y abonos de MangoNota.

## Estado del repositorio
- El prototipo en Java (src/com/agromango) y index.html NO se borran ni se modifican: son referencia.
- El backend NestJS va en la carpeta `backend/`.
- Reglas de negocio a portar luego: saldo de canastillas = entregadas - devueltas; saldo en dinero = total - abonos.

## Reglas de trabajo
- Idioma: español.
- La persona usuaria casi no sabe programar y VS Code es nuevo para ella: explica cada paso en lenguaje sencillo y con la analogía del restaurante (cliente, mesero/controlador, cocinero/servicio).
- Haz cambios pequeños. Antes de cambios grandes de arquitectura o tecnología, explica opciones y pregunta.
- Nunca borres archivos, ni uses comandos destructivos de git. Muestra `git status` antes de cada commit y NO hagas `git push` sin confirmación.
- Verifica con `node -v` y `npm -v` antes de instalar nada.

## Al terminar cada tarea, responde con un reporte breve y unificado

El reporte es un resumen para Claude, no una bitácora: apunta a menos de 150 palabras. No copies salidas completas de comandos, registros del servidor, código ni diffs. No crees un archivo de reporte salvo que la persona lo pida expresamente. Se aplican estas excepciones:

1. **Errores:** siempre copia el error tal cual, hasta un máximo de 10 líneas.
2. **Pruebas:** preséntalas en una tabla compacta, una línea por prueba e incluye su código HTTP.
3. **“Muéstrame”:** si la tarea dice “muéstrame”, esa instrucción prevalece sobre el límite de palabras.

Usa este formato y omite los campos que no correspondan:

REPORTE PARA CLAUDE
- **Resumen:** qué quedó hecho.
- **Archivos:** solo los principales, agrupados por propósito si son varios.
- **Verificación:** comandos importantes y resultado resumido; presenta las pruebas en una tabla compacta, una línea por prueba e incluye el código HTTP.
- **Errores o bloqueos:** solo si ocurrieron; copia literalmente el mensaje, máximo 10 líneas.
- **Siguiente paso:** una acción concreta, o “Ninguno”.

## graphify

For any question about this repo's architecture, structure, components, or how to add/modify/find
code, your first action should be `graphify query "<question>"` when `graphify-out/graph.json`
exists. Use `graphify path "<A>" "<B>"` for relationship questions and `graphify explain "<concept>"`
for focused-concept questions. These return a scoped subgraph, usually much smaller than the full
report or raw grep output.

Triggers: "how do I…", "where is…", "what does … do", "add/modify a <component>",
"explain the architecture", or anything that depends on how files or classes relate.

If `graphify-out/wiki/index.md` exists, use it for broad navigation. Read `graphify-out/GRAPH_REPORT.md`
only for broad architecture review or when query/path/explain do not surface enough context. Only read
source files when (a) modifying/debugging specific code, (b) the graph lacks the needed detail, or
(c) the graph is missing or stale.

Type `/graphify` in Copilot Chat to build or update the graph.

- Nunca detengas procesos con Stop-Process usando números de PID recordados de tareas anteriores. Detén solo los procesos que tú arrancaste en esta misma tarea, con la sesión de terminal que los lanzó.
- Las variables de prueba (DATOS_ARCHIVO, JWT_SECRET, PORT) se definen solo para el proceso que las necesita y se eliminan al terminar; no las dejes puestas en la terminal.
