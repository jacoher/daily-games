# Especificación de Diseño: Niveles de Dificultad en Trivia IA

**Fecha:** 2026-09-15  
**Estado:** Aprobado  
**Objetivo:** Permitir al anfitrión seleccionar el nivel de dificultad (Fácil, Medio, Difícil o Todas) antes de crear la sala de Trivia IA, categorizando el banco actual de preguntas en al menos 20 por nivel y mostrando indicadores UX consistentes en el lobby y durante la partida.

---

## 1. Arquitectura y Modelo de Datos

### 1.1 Modelo `TriviaQuestion` y Tipos
En `src/app/trivia/trivia.service.ts`:
- Se define el tipo:
  ```typescript
  export type TriviaDifficulty = 'facil' | 'medio' | 'dificil';
  ```
- Se añade el campo opcional `difficulty?: TriviaDifficulty` a `TriviaQuestion`:
  ```typescript
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

### 1.2 Categorización del Banco de Preguntas
En `src/app/trivia/trivia-data.ts`:
- Las 78 preguntas de la categoría `'Inteligencia Artificial'` se clasifican rigurosamente con la propiedad `difficulty`:
  - **`facil` (26 preguntas)**: Siglas populares (GPT, LLM), cultura general de IA (Test de Turing, Asimov, ELIZA), herramientas cotidianas (asistentes de voz, GitHub Copilot).
  - **`medio` (26 preguntas)**: Herramientas agénticas modernas (Claude Code, Codex, MCP, RAG), conceptos fundamentales de ML (overfitting, supervised learning, embeddings, tokenización, fine-tuning).
  - **`dificil` (26 preguntas)**: Arquitectura avanzada y matemáticas (mecanismos de autoatención, backpropagation, gradientes desvanecientes, funciones de activación, AlphaGo MCTS, perplejidad, agent harnesses).

---

## 2. Lógica de Servicio (`TriviaService`)

### 2.1 Filtrado de Preguntas
- Se actualiza el método `loadQuestions`:
  ```typescript
  loadQuestions(
    category: string,
    count: number,
    difficulty: TriviaDifficulty | 'todas' = 'todas'
  ): TriviaQuestion[]
  ```
- Si `difficulty !== 'todas'`, se filtra el conjunto:
  ```typescript
  let pool = [...(TRIVIA_QUESTIONS[category] || [])];
  if (difficulty && difficulty !== 'todas') {
    pool = pool.filter(q => q.difficulty === difficulty);
  }
  ```
- Luego se barajan aleatoriamente y se toma el subconjunto solicitado por `count`.

### 2.2 Creación de Sala
- Se actualiza `createRoom` para recibir `difficulty: TriviaDifficulty | 'todas' = 'todas'`.
- Se almacena `selectedDifficulty` en el servicio y se envía en el payload a Socket.IO.

---

## 3. Diseño de Experiencia de Usuario (UX)

### 3.1 Setup (Host): Selector Segmentado Táctil
En `trivia-host.component.ts`:
- En lugar de un `<select>`, se implementa un control segmentado interactivo (`.diff-pill-group`) con 4 opciones:
  - 🎲 **Todas**
  - 🟢 **Fácil**
  - 🟡 **Medio**
  - 🔴 **Difícil**
- **Estilos UX:**
  - Botones con altura mínima de 44px (touch target accesible).
  - Estado activo con gradiente semántico suave y halo de luz (`glow`).
  - Animación suave de transición (`transform: translateY(-1px)`, cambio de color de borde).

### 3.2 Lobby: Badge de Dificultad
- En `game-config-badge`, se visualiza la dificultad configurada:
  - `🟢 Fácil` / `🟡 Medio` / `🔴 Difícil` / `🎲 Todas`

### 3.3 Pantalla de Pregunta (Host y Jugador)
- En la cabecera de la pregunta de `trivia-host.component.ts` y `trivia-player.component.ts`:
  - Se añade un chip visual con micro-badge que refleja la dificultad de la pregunta actual (`currentQ?.difficulty`):
    - `.badge-diff-facil`: verde esmeralda con borde translúcido.
    - `.badge-diff-medio`: ámbar cálido con borde translúcido.
    - `.badge-diff-dificil`: carmesí/fucsia con borde translúcido.

---

## 4. Pruebas y Criterios de Aceptación

1. **Prueba unitaria de datos**: Verificar que en `TRIVIA_QUESTIONS['Inteligencia Artificial']` existan al menos 20 preguntas con dificultad `facil`, 20 con `medio` y 20 con `dificil`.
2. **Prueba unitaria de filtrado**:
   - `loadQuestions('Inteligencia Artificial', 10, 'facil')` solo retorna preguntas marcadas como `'facil'`.
   - `loadQuestions('Inteligencia Artificial', 10, 'medio')` solo retorna preguntas marcadas como `'medio'`.
   - `loadQuestions('Inteligencia Artificial', 10, 'dificil')` solo retorna preguntas marcadas como `'dificil'`.
   - `loadQuestions('Inteligencia Artificial', 10, 'todas')` retorna preguntas de cualquier dificultad.
3. **Prueba de compilación**: `npm run build` debe completar sin advertencias ni errores.
