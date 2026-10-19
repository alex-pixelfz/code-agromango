# Cuaderno Digital Agro (Mango) 🥭

## 01. Visión y Problema
* **Visión:** Modernizar el comercio de frutas en zonas rurales a través de una herramienta móvil offline de mínima fricción, erradicando los descuadres contables y las pérdidas de canastillas en el campo.
* **Problema:** En el acopio de mango, el control de peso, valores fiados y canastillas se lleva en cuadernos de papel. Esto provoca errores manuales, deterioro del papel y disputas entre acopiadores y productores.
* **Público Objetivo:** Acopiadores de campo (usuario operativo) y productores/transportadores (usuario receptor de la tirilla digital).

## 02. Historias de Usuario
* **HU-01:** Como acopiador, quiero registrar cliente, canastillas y precio en menos de 3 toques para no retrasar la carga del vehículo.
* **HU-02:** Como cliente/productor, quiero ver el detalle de fruta, abonos y saldo pendiente para exigir transparencia.
* **HU-03:** Como acopiador, quiero registrar abonos en efectivo para actualizar el saldo al instante.
* **HU-04:** Como acopiador, quiero compartir la cuenta por WhatsApp con un solo clic para generar respaldo digital sin imprimir.

## 03. Requisitos Funcionales y No Funcionales
### Requisitos Funcionales (RF)
* **RF-01:** Registro de transacciones (tipo de mango, precio, calidad, canastillas y abonos).
* **RF-02:** Control explícito de canastillas (`Entregadas - Devueltas = Saldo`).
* **RF-03:** Generación automática de resumen de cuenta formateado para envío por WhatsApp.
* **RF-04:** Almacenamiento y procesamiento local 100% offline.

### Requisitos No Funcionales (RNF)
* **Usabilidad:** Botones grandes ($\ge 48\times48\text{ dp}$) y registros en $\le 3$ toques.
* **Rendimiento:** Respuesta de interfaz en menos de 1.5 segundos.
* **Disponibilidad:** Operatividad del 100% offline sin red móvil.
* **Seguridad:** Cifrado de base de datos local mediante AES-256.
* **Escalabilidad:** Soporte de hasta 10,000 registros fluidos en dispositivos de gama baja.

## 04. Fuera de Alcance
* Pasarelas de pago electrónico (Nequi, Daviplata, PSE).
* Facturación electrónica o integración fiscal con la DIAN.
* Seguimiento por GPS en tiempo real.

## 05. Instrucciones de Ejecución
1. Requisitos: JDK Java 27 y Visual Studio Code.
2. Compilación e inicio desde la terminal:
   ```bash
   javac src/*.java -d bin
   java -cp bin Main
