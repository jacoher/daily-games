# Niveles de Dificultad en Trivia IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar selector UX de dificultad (Fácil, Medio, Difícil, Todas) antes de crear la sala en Trivia IA, categorizando las 78 preguntas del banco en al menos 20 por nivel y mostrando indicadores táctiles y visuales en setup, lobby y durante el juego.

**Architecture:** Se extiende la interfaz `TriviaQuestion` con `difficulty?: TriviaDifficulty` y se categorizan las 78 preguntas de `trivia-data.ts` (26 fácil, 26 medio, 26 difícil). En `TriviaService` se implementa el filtrado reactivo en `loadQuestions` y `createRoom`. En la interfaz de usuario se construye un control segmentado táctil para el anfitrión y chips de dificultad en el lobby y en las pantallas de preguntas del host y jugadores.

**Tech Stack:** Angular 18 (Standalone Components), TypeScript, Socket.IO, CSS Glassmorphism & Micro-interacciones.

## Global Constraints
- No alterar eventos de Socket.IO existentes de forma que rompa la compatibilidad con clientes activos.
- Mantener diseño consistente con el estilo dark glassmorphism del juego.
- Cada nivel de dificultad debe contar con al menos 20 preguntas categorizadas.
- Touch target mínimo de 44px para controles interactivos en móvil.
- `npm run build` debe completar sin advertencias ni errores.

---

### Task 1: Modelo de Tipos y Categorización de Preguntas

**Files:**
- Modify: `src/app/trivia/trivia.service.ts:1-35`
- Modify: `src/app/trivia/trivia-data.ts:1-87`
- Modify: `src/app/trivia/trivia-data.spec.ts:1-18`

**Interfaces:**
- Produces: `TriviaDifficulty = 'facil' | 'medio' | 'dificil'`
- Produces: `TriviaQuestion.difficulty?: TriviaDifficulty`

- [ ] **Step 1: Extender la interfaz `TriviaQuestion` en `trivia.service.ts`**
Añadir el tipo `TriviaDifficulty` y la propiedad `difficulty?: TriviaDifficulty`:
```typescript
export type TriviaDifficulty = 'facil' | 'medio' | 'dificil';

export interface TriviaQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctId?: string;
  category: string;
  difficulty?: TriviaDifficulty;
  explanation?: string;
}
```

- [ ] **Step 2: Clasificar las 78 preguntas en `trivia-data.ts` con al menos 20 por nivel**
Asignar `difficulty: 'facil'`, `'medio'` o `'dificil'` a cada pregunta en `TRIVIA_QUESTIONS['Inteligencia Artificial']`:
- 26 preguntas `facil` (conceptos generales, siglas GPT/LLM, asistentes de voz, Turing, etc.)
- 26 preguntas `medio` (RAG, embeddings, Claude Code, Codex, MCP, overfitting, etc.)
- 26 preguntas `dificil` (Transformers, backpropagation, MCTS en AlphaGo, vanishing gradient, etc.)

- [ ] **Step 3: Actualizar `trivia-data.spec.ts` para verificar la distribución de dificultad**
Agregar pruebas para comprobar que cada nivel tiene al menos 20 preguntas y todas son válidas:
```typescript
it('should have at least 20 questions for each difficulty level', () => {
  const questions = TRIVIA_QUESTIONS['Inteligencia Artificial'];
  const facil = questions.filter(q => q.difficulty === 'facil');
  const medio = questions.filter(q => q.difficulty === 'medio');
  const dificil = questions.filter(q => q.difficulty === 'dificil');

  expect(facil.length).toBeGreaterThanOrEqual(20);
  expect(medio.length).toBeGreaterThanOrEqual(20);
  expect(dificil.length).toBeGreaterThanOrEqual(20);
});
```

- [ ] **Step 4: Ejecutar verificación de build y test**
Run: `npm run build`
Expected: Build exitoso sin errores de tipos.

- [ ] **Step 5: Commit**
```bash
git add src/app/trivia/trivia.service.ts src/app/trivia/trivia-data.ts src/app/trivia/trivia-data.spec.ts
git commit -m "feat(trivia): add difficulty type and categorize 78 questions into facil, medio, and dificil"
```

---

### Task 2: Lógica de Filtrado por Dificultad en `TriviaService`

**Files:**
- Modify: `src/app/trivia/trivia.service.ts:118-175`
- Modify: `src/app/trivia/trivia.service.spec.ts:1-27`

**Interfaces:**
- Produces: `loadQuestions(category: string, count: number, difficulty?: TriviaDifficulty | 'todas'): TriviaQuestion[]`
- Produces: `createRoom(participants, category, count, difficulty?): Promise<string>`
- Produces: `selectedDifficulty: TriviaDifficulty | 'todas'`

- [ ] **Step 1: Actualizar `loadQuestions` y `createRoom` en `trivia.service.ts`**
Implementar el filtrado por dificultad en `loadQuestions`:
```typescript
selectedDifficulty: TriviaDifficulty | 'todas' = 'todas';

loadQuestions(category: string, count: number, difficulty: TriviaDifficulty | 'todas' = 'todas'): TriviaQuestion[] {
  let pool: TriviaQuestion[] = [...(TRIVIA_QUESTIONS[category] || [])];

  if (difficulty && difficulty !== 'todas') {
    pool = pool.filter(q => q.difficulty === difficulty);
  }

  this.questions = this.shuffle(pool).slice(0, Math.min(count, pool.length));
  this.totalQuestions$.next(this.questions.length);
  return this.questions;
}
```
Y en `createRoom`:
```typescript
createRoom(
  participants: { name: string; avatar: string }[],
  category: string = 'Inteligencia Artificial',
  count: number = 5,
  difficulty: TriviaDifficulty | 'todas' = 'todas'
): Promise<string> {
  this.selectedDifficulty = difficulty;
  this.availableParticipants = participants;
  this.isHost = true;
  const socket = this.initSocket();

  const selectedQuestions = this.loadQuestions(category, count, difficulty);
  // Emit host:create-room con selectedQuestions y difficulty
```

- [ ] **Step 2: Actualizar `trivia.service.spec.ts` con pruebas de filtrado**
Añadir especificaciones para validar que `loadQuestions` filtra adecuadamente por dificultad:
```typescript
it('should filter questions by difficulty', () => {
  const facil = service.loadQuestions('Inteligencia Artificial', 10, 'facil');
  expect(facil.every(q => q.difficulty === 'facil')).toBe(true);

  const medio = service.loadQuestions('Inteligencia Artificial', 10, 'medio');
  expect(medio.every(q => q.difficulty === 'medio')).toBe(true);

  const dificil = service.loadQuestions('Inteligencia Artificial', 10, 'dificil');
  expect(dificil.every(q => q.difficulty === 'dificil')).toBe(true);
});
```

- [ ] **Step 3: Verificar compilación**
Run: `npm run build`
Expected: Build exitoso.

- [ ] **Step 4: Commit**
```bash
git add src/app/trivia/trivia.service.ts src/app/trivia/trivia.service.spec.ts
git commit -m "feat(trivia): support difficulty filtering in TriviaService loadQuestions and createRoom"
```

---

### Task 3: Control Segmentado de Dificultad y Badges en `TriviaHostComponent`

**Files:**
- Modify: `src/app/trivia/trivia-host/trivia-host.component.ts`

**Interfaces:**
- Consumes: `TriviaDifficulty`, `triviaService.selectedDifficulty`, `triviaService.createRoom`
- Produces: `selectedDifficulty: TriviaDifficulty | 'todas'`
- Produces: Control segmentado en UI con pills táctiles

- [ ] **Step 1: Agregar propiedad `selectedDifficulty` en `TriviaHostComponent`**
```typescript
selectedDifficulty: TriviaDifficulty | 'todas' = 'todas';
```
Y en `setupGame()` pasar `this.selectedDifficulty`:
```typescript
const roomId = await this.triviaService.createRoom(
  participants,
  this.selectedCategory,
  Number(this.questionCount),
  this.selectedDifficulty
);
```

- [ ] **Step 2: Agregar control segmentado en la plantilla de Setup**
En `trivia-host.component.ts` dentro de `phase === 'setup'`:
```html
<div class="diff-control-wrap">
  <label class="form-label">⚡ Dificultad de preguntas</label>
  <div class="diff-pill-group" role="radiogroup" aria-label="Nivel de dificultad">
    <button type="button" class="diff-pill" [class.active]="selectedDifficulty === 'todas'" (click)="selectedDifficulty = 'todas'">
      <span class="pill-icon">🎲</span> Todas
    </button>
    <button type="button" class="diff-pill pill-facil" [class.active]="selectedDifficulty === 'facil'" (click)="selectedDifficulty = 'facil'">
      <span class="pill-icon">🟢</span> Fácil
    </button>
    <button type="button" class="diff-pill pill-medio" [class.active]="selectedDifficulty === 'medio'" (click)="selectedDifficulty = 'medio'">
      <span class="pill-icon">🟡</span> Medio
    </button>
    <button type="button" class="diff-pill pill-dificil" [class.active]="selectedDifficulty === 'dificil'" (click)="selectedDifficulty = 'dificil'">
      <span class="pill-icon">🔴</span> Difícil
    </button>
  </div>
</div>
```

- [ ] **Step 3: Agregar badge de dificultad en Lobby y en la cabecera de Pregunta**
En `game-config-badge` del lobby:
```html
<span class="diff-lobby-badge diff-{{ selectedDifficulty }}">
  {{ selectedDifficulty === 'facil' ? '🟢 Fácil' : selectedDifficulty === 'medio' ? '🟡 Medio' : selectedDifficulty === 'dificil' ? '🔴 Difícil' : '🎲 Todas las dificultades' }}
</span>
```
En la pantalla de pregunta:
```html
<span class="diff-chip diff-{{ currentQ?.difficulty }}" *ngIf="currentQ?.difficulty">
  {{ currentQ?.difficulty === 'facil' ? '🟢 Fácil' : currentQ?.difficulty === 'medio' ? '🟡 Medio' : '🔴 Difícil' }}
</span>
```

- [ ] **Step 4: Añadir estilos CSS responsivos y accesibles**
Micro-interacciones para `.diff-pill-group`, `.diff-pill`, `.diff-chip`:
- Altura táctil mínima de 44px.
- Bordes translúcidos con acentos verdes para Fácil, ámbar para Medio, rojo para Difícil.
- Efecto de sombra luminosa (*glow*) en el botón activo.

- [ ] **Step 5: Verificar compilación**
Run: `npm run build`
Expected: Build exitoso sin advertencias.

- [ ] **Step 6: Commit**
```bash
git add src/app/trivia/trivia-host/trivia-host.component.ts
git commit -m "feat(trivia): add segmented difficulty control and badges to host component"
```

---

### Task 4: Chip de Dificultad en `TriviaPlayerComponent`

**Files:**
- Modify: `src/app/trivia/trivia-player/trivia-player.component.ts`

**Interfaces:**
- Consumes: `currentQ.difficulty`
- Produces: Chip visual de dificultad en cabecera de pregunta del jugador

- [ ] **Step 1: Añadir chip de dificultad en la vista de pregunta de `trivia-player.component.ts`**
En la barra de estado superior de la pregunta (junto al contador de tiempo / indicador de pregunta):
```html
<span class="diff-chip diff-{{ currentQ?.difficulty }}" *ngIf="currentQ?.difficulty">
  {{ currentQ?.difficulty === 'facil' ? '🟢 Fácil' : currentQ?.difficulty === 'medio' ? '🟡 Medio' : '🔴 Difícil' }}
</span>
```

- [ ] **Step 2: Añadir estilos CSS para `.diff-chip` en `trivia-player.component.ts`**
Estilos idénticos a los del host para coherencia visual entre dispositivos.

- [ ] **Step 3: Verificar compilación**
Run: `npm run build`
Expected: Build exitoso.

- [ ] **Step 4: Commit**
```bash
git add src/app/trivia/trivia-player/trivia-player.component.ts
git commit -m "feat(trivia): add difficulty chip badge to player question view"
```

---

### Task 5: Verificación Integral y Pruebas

**Files:**
- Verify all modified files

- [ ] **Step 1: Ejecutar build de producción completo**
Run: `npm run build`
Expected: 0 errores, 0 advertencias NG8107.

- [ ] **Step 2: Ejecutar script de verificación de datos y filtrado**
Run: `node --experimental-strip-types -e "..."` para validar que las 78 preguntas están completas y que los 3 niveles tienen al menos 20 preguntas cada uno.

- [ ] **Step 3: Commit final si aplica**
```bash
git status
```
