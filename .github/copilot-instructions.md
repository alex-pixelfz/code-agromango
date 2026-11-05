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

## Al terminar cada tarea, responde con este formato
REPORTE PARA CLAUDE
- Archivos creados o modificados:
- Comandos ejecutados y su salida (copiada tal cual):
- Errores o advertencias (copiados tal cual):
- Resultado de las pruebas (GET/POST):
- Siguiente paso sugerido:

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
