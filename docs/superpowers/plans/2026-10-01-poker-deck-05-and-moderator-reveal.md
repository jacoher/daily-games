# Plan de Implementación: Baraja Fibonacci 0.5 y Control de Revelado Exclusivo del Moderador

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Actualizar la baraja Fibonacci sustituyendo la carta '0' por '0.5' y restringir la acción de revelar cartas para que sea exclusiva del moderador/host en frontend y backend.

**Architecture:** Modificación de constantes en `poker.types.ts`, restricción de permisos en socket `poker:reveal` en `server/index.js`, y ajuste del template/lógica en `poker-player.component.html`, `.ts` y `.css` reemplazando el botón de revelado por un banner de espera para participantes.

**Tech Stack:** Angular 17+, TypeScript, Socket.io, Node.js (Express).

## Global Constraints
- Mantener la integridad de los cálculos de estadísticas (`poker-stats.util.ts`) con decimales.
- El moderador debe retener el control completo para revelar cartas tanto en UI como en validación de socket.
- El proyecto debe pasar la compilación (`npm run build`).

---

### Task 1: Actualizar la baraja Fibonacci en Frontend

**Files:**
- Modify: `src/app/poker/poker.types.ts:3`

**Interfaces:**
- Produces: `FIBONACCI_CARDS = ['0.5', '1', '2', '3', '5', '8', '13', '21', '?', '☕']`

- [ ] **Step 1: Modificar la constante `FIBONACCI_CARDS` en `poker.types.ts`**
Reemplazar `'0'` por `'0.5'`.

- [ ] **Step 2: Verificar la compilación del frontend**
Ejecutar:
```bash
npm run build
```

- [ ] **Step 3: Commit del cambio**
```bash
git add src/app/poker/poker.types.ts
git commit -m "feat(poker): update fibonacci deck from 0 to 0.5"
```

---

### Task 2: Restringir evento de revelado en el Servidor

**Files:**
- Modify: `server/index.js:220-226`

**Interfaces:**
- Consumes: Socket event `poker:reveal`
- Restricción: Permitir solo si `room.hostSocketId === socket.id`

- [ ] **Step 1: Modificar el handler `poker:reveal` en `server/index.js`**
Cambiar la condición de autorización:
```javascript
  socket.on('poker:reveal', ({ roomId }) => {
    const room = pokerRooms.get(roomId);
    if (!room) return;
    const isHost = room.hostSocketId === socket.id;
    if (!isHost) return;

    room.revealed = true;
    ...
```

- [ ] **Step 2: Verificar sintaxis del servidor con Node**
```bash
node -c server/index.js
```

- [ ] **Step 3: Commit del cambio**
```bash
git add server/index.js
git commit -m "fix(poker): restrict card reveal to room host only on backend"
```

---

### Task 3: Actualizar vista del participante (Poker Player)

**Files:**
- Modify: `src/app/poker/poker-player/poker-player.component.html:88-94`
- Modify: `src/app/poker/poker-player/poker-player.component.ts:182-185`
- Modify: `src/app/poker/poker-player/poker-player.component.css`

**Interfaces:**
- Participante ve `⏳ Esperando que el moderador revele las cartas...` en la fase de votación.
- Se elimina `revealCards()` del componente de participante.

- [ ] **Step 1: Actualizar template en `poker-player.component.html`**
Reemplazar el botón `<button class="action-btn reveal-btn" (click)="revealCards()">` por:
```html
<div class="waiting-moderator-banner">
  <span class="wait-icon">⏳</span>
  <span>Esperando que el moderador revele las cartas...</span>
</div>
```

- [ ] **Step 2: Eliminar método `revealCards()` en `poker-player.component.ts`**
Remover la función no utilizada.

- [ ] **Step 3: Agregar estilos en `poker-player.component.css`**
Añadir diseño y animación sutil para `.waiting-moderator-banner`:
```css
.waiting-moderator-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  animation: pulse 2.5s infinite ease-in-out;
}
```

- [ ] **Step 4: Verificar compilación**
```bash
npm run build
```

- [ ] **Step 5: Commit del cambio**
```bash
git add src/app/poker/poker-player/
git commit -m "feat(poker): replace player reveal button with moderator wait banner"
```

---

### Task 4: Verificación Integral

- [ ] **Step 1: Compilación general y revisión de git diff**
Ejecutar:
```bash
npm run build && git status
```
Confirmar que todo compile con éxito y el workspace quede limpio.
