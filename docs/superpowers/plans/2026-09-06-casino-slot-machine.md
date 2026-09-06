# Casino Slot Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar un nuevo juego de sorteo tipo Máquina Tragamonedas (Casino Slot Machine) con 3 rodillos, palanca mecánica interactiva, efectos de sonido Web Audio API y modal de gestión de ganador (eliminar/mantener).

**Architecture:** Componente standalone de Angular (`SlotMachineComponent`) con animaciones CSS 3D sincronizadas, desacoplado y reactivo, conectado a `ParticipantService` para persistencia de participantes y `SoundService` extendido con métodos de audio procedural Web Audio API.

**Tech Stack:** Angular 19, TypeScript, Tailwind CSS / Vanilla CSS 3D Transforms, Web Audio API, Canvas Confetti.

## Global Constraints
- Seguir el estilo visual y patrones existentes en `daily-games` (Tailwind, componentes standalone, TypeScript estricto).
- Web Audio API sin dependencias externas para efectos de casino.
- Respetar accesibilidad con atajos de teclado (barra espaciadora / Enter para accionar palanca).
- Persistencia intacta en `ParticipantService` y `localStorage`.

---

### Task 1: Extensiones de Audio en SoundService

**Files:**
- Modify: `src/app/sound.service.ts`

**Interfaces:**
- Produces:
  - `playSlotLeverPull(): void` — Sintetiza el chasquido y muelle mecánico de la palanca.
  - `startSlotSpinLoop(): void` — Inicia el zumbido rítmico continuo de engranajes mecánicos.
  - `stopSlotSpinLoop(): void` — Detiene suavemente el zumbido rítmico.
  - `playSlotReelStop(): void` — Golpe seco de percusión metálica para frenado de rodillo.
  - `playCasinoJackpot(): void` — Fanfarria ascendente con carillón y cascada de monedas.

- [ ] **Step 1: Implementar `playSlotLeverPull()` en `SoundService`**
- [ ] **Step 2: Implementar osciladores para `startSlotSpinLoop()` y `stopSlotSpinLoop()`**
- [ ] **Step 3: Implementar `playSlotReelStop()` y `playCasinoJackpot()`**
- [ ] **Step 4: Verificar compilación de `src/app/sound.service.ts` con `npx ng build` o linter**
- [ ] **Step 5: Commit cambios de Task 1**

---

### Task 2: Componente SlotMachine (Lógica, Palanca y Animación de Rodillos)

**Files:**
- Create: `src/app/slot-machine/slot-machine.component.ts`
- Create: `src/app/slot-machine/slot-machine.component.html`
- Create: `src/app/slot-machine/slot-machine.component.css`

**Interfaces:**
- Consumes:
  - `ParticipantService.participants`
  - `ParticipantService.removeParticipant(index)`
  - `SoundService` (métodos de palanca, rodillo y jackpot)
- Produces:
  - `SlotMachineComponent`: Componente standalone exportado para la ruta `/slots`.

- [ ] **Step 1: Crear la estructura del componente `SlotMachineComponent` con estados del juego (`idle`, `pulling`, `spinning`, `won`)**
- [ ] **Step 2: Crear el template HTML con el gabinete de casino, las 3 columnas de rodillos, la palanca interactiva 3D y el modal de ganador**
- [ ] **Step 3: Crear los estilos CSS con efectos 3D, sombras de tambor cilíndrico, desenfoque de movimiento y animación de la palanca**
- [ ] **Step 4: Conectar interacción de palanca (click, drag gesture, barra espaciadora) y lógica de sincronización de parada escalonada**
- [ ] **Step 5: Implementar las acciones del modal de ganador ("Quitar participante" vs "Mantener y seguir")**
- [ ] **Step 6: Commit cambios de Task 2**

---

### Task 3: Integración de Rutas y Navegación en Setup

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/setup/setup.component.ts`

**Interfaces:**
- Consumes:
  - `SlotMachineComponent`
- Produces:
  - Ruta `/slots` accesible en el navegador.
  - Tarjeta interactiva de "Tragamonedas / Casino Slot" en el lobby de selección de juegos.

- [ ] **Step 1: Registrar la ruta `/slots` en `src/app/app.routes.ts`**
- [ ] **Step 2: Añadir la tarjeta de juego en la cuadrícula de `SetupComponent` con badge e icono temático**
- [ ] **Step 3: Añadir botón de navegación de retorno a inicio en `SlotMachineComponent`**
- [ ] **Step 4: Commit cambios de Task 3**

---

### Task 4: Verificación Integral y Pruebas

**Files:**
- Test / Verify: Construcción y ejecución del proyecto (`npm run build`).

- [ ] **Step 1: Ejecutar `npm run build` para asegurar compilación sin errores de TypeScript ni templates**
- [ ] **Step 2: Verificar navegación fluida entre `/setup` y `/slots`**
- [ ] **Step 3: Verificar que la eliminación y persistencia de participantes funcione adecuadamente tras el tiro**
- [ ] **Step 4: Commit final de verificación**
