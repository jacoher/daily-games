# Especificación de Diseño: Juego de Casino Tragamonedas (Slot Machine)

**Fecha:** 2026-09-06  
**Estado:** Aprobado  
**Módulo:** `src/app/slot-machine`

---

## 1. Resumen Ejecutivo
Añadir una nueva modalidad de sorteo a la suite Daily Games: una máquina tragamonedas clásica de casino (Slot Machine) de 3 rodillos sincronizados accionada por una palanca lateral mecánica interactiva. Al accionar la palanca, los rodillos giran a gran velocidad y se detienen en cascada alineando al participante ganador (efecto "Jackpot"), acompañado de efectos de sonido sintetizados con Web Audio API (palanca, engranajes girando, paradas mecánicas y lluvia de monedas/fanfarria). Al finalizar, se despliega un modal temático de victoria que permite eliminar o mantener al participante para continuar jugando.

---

## 2. Requerimientos y Casos de Uso

### 2.1 Requerimientos Funcionales
- **RF-01 (Selección Aleatoria):** Elegir un participante al azar entre los registrados en `ParticipantService`.
- **RF-02 (Palanca Mecánica):** Permitir accionar el tiro mediante clic o arrastre en la palanca física 3D lateral, botón "TIRAR", o barra espaciadora / tecla Enter.
- **RF-03 (Animación 3 Rodillos):** Tres carretes cilíndricos que giran verticalmente con avatares y nombres, con desenfoque de movimiento y detención en cascada (Rodillo 1, luego 2, luego 3) mostrando al mismo ganador.
- **RF-04 (Efectos de Sonido Web Audio):**
  - Sonido de palanca bajando y soltando mecanismo ("ka-chunk").
  - Sonido rítmico continuo de giro de rodillos ("tick-tick-tick").
  - Sonido seco de parada de cada rodillo ("clack").
  - Sonido de jackpot/celebración con fanfarria brillante y monedas tintineando.
- **RF-05 (Modal de Victoria):**
  - Muestra foto y nombre del ganador con fuegos artificiales/confeti.
  - Opción 1: **"Quitar participante"** (lo elimina de la lista persistida en `ParticipantService`).
  - Opción 2: **"Mantener y seguir"** (conserva al participante en la lista).
- **RF-06 (Integración y Navegación):**
  - Nueva ruta `/slots` en `app.routes.ts`.
  - Tarjeta de acceso al juego en `SetupComponent` con estética y badges consistentes.
  - Botón de retorno al inicio (`/`).

---

## 3. Arquitectura y Componentes

### 3.1 Nuevo Componente: `SlotMachineComponent`
- **Ruta:** `src/app/slot-machine/slot-machine.component.ts` (con `.html` y `.css` o inline según convención del proyecto).
- **Responsabilidades:**
  - Gestionar el ciclo de vida del tiro (`idle`, `pulling`, `spinning`, `stopping`, `won`).
  - Renderizar el gabinete de casino, la palanca interactiva y las 3 columnas de rodillos.
  - Gestionar las tiras repetidas de participantes para la animación continua CSS 3D.
  - Desplegar el modal de ganador con confeti y opciones de gestión.

### 3.2 Modificaciones en `SoundService` (`src/app/sound.service.ts`)
- Métodos añadidos:
  - `playSlotLeverPull()`: Síntesis de golpe metálico y muelle.
  - `startSlotSpinLoop()` & `stopSlotSpinLoop()`: Osciladores modulados para el traqueteo de engranajes mecánicos.
  - `playSlotReelStop()`: Percusión metálica y grave para frenado de carrete.
  - `playCasinoJackpot()`: Acordes mayores arpegiados brillantes con modulación FM imitando cascada de monedas.

### 3.3 Modificaciones en Navegación y Setup
- `app.routes.ts`: Registrar `{ path: 'slots', component: SlotMachineComponent }`.
- `setup.component.ts`: Agregar tarjeta "Tragamonedas Casino" (🎰) en la cuadrícula de modos de juego.

---

## 4. Flujo de Datos y Estados de la Máquina

```
[IDLE] 
  │  (Tirar palanca / Espacio / Botón Tirar)
  ▼
[PULLING LEVER] ──> playSlotLeverPull()
  │  (Palanca baja y rebota a posición original)
  ▼
[SPINNING] ──> startSlotSpinLoop(), blur vertical en rodillos
  │  (Rodillo 1 frena a 2.5s) ──> playSlotReelStop()
  │  (Rodillo 2 frena a 3.2s) ──> playSlotReelStop()
  │  (Rodillo 3 frena a 4.0s) ──> playSlotReelStop(), stopSlotSpinLoop()
  ▼
[WINNER REVEAL] ──> playCasinoJackpot(), confeti, destello de línea dorada
  │
  ▼
[WINNER MODAL OPEN]
  ├── "Quitar participante" ──> participantService.removeParticipant() ──> [IDLE]
  └── "Mantener y seguir"   ──> [IDLE]
```

---

## 5. Manejo de Errores y Casos Borde
- **Participantes insuficientes (< 2):** Se bloquea la palanca y se muestra aviso en pantalla invitando a ir al menú principal para ingresar más participantes.
- **Nombres largos:** `text-overflow: ellipsis` con tamaño de fuente auto-adaptable en las celdas de los rodillos para mantener alineación estética.
- **Acción repetida durante el giro:** Se bloquea la palanca hasta que finalice el modal de victoria para evitar interrupciones o estados inconsistentes.
