# Diseño: Trivia Multijugador por WebSockets (Ganador por Velocidad)

**Fecha:** 2026-09-06  
**Estado:** Propuesta aprobada por el usuario  
**Módulo:** Trivia (`src/app/trivia/`, `server/`)

---

## 1. Visión General
Transformar el minijuego Trivia a una experiencia multijugador en tiempo real simple, ágil y confiable, basada en un servidor Node.js + Socket.IO. Los participantes votan desde sus dispositivos móviles/navegadores escaneando un código QR o ingresando el código de sala. Para cada pregunta, el participante que responda correctamente en el **menor tiempo** gana la ronda. Al finalizar todas las preguntas, se corona al ganador de la partida.

---

## 2. Arquitectura de Comunicación

### 2.1 Backend (`server/index.js`)
* **Servidor Node.js + Express + Socket.IO** (puerto por defecto: `3001`).
* Almacena en memoria (`Map<roomId, RoomState>`) el estado de las salas:
  ```ts
  interface RoomState {
    id: string;
    hostSocketId: string;
    category: string;
    timeLimit: number;
    questionCount: number;
    currentQuestionIndex: number;
    questions: TriviaQuestion[];
    questionStartTime: number; // Date.now()
    roundTimer?: NodeJS.Timeout;
    players: Map<string, {
      socketId: string;
      name: string;
      avatar: string;
      score: number;
      roundsWon: number;
    }>;
    currentAnswers: Map<string, {
      answerId: string;
      elapsedMs: number;
      isCorrect: boolean;
    }>;
    roundWinner?: {
      name: string;
      avatar: string;
      elapsedMs: number;
    };
  }
  ```

### 2.2 Eventos Socket.IO
* **Host -> Servidor**:
  * `host:create-room`: Envía configuración (`category`, `count`, `timeLimit`, `participants`). Retorna `roomId`.
  * `host:start-game`: Inicia la partida.
  * `host:next-question`: Avanza a la siguiente pregunta.
  * `host:end-game`: Fuerza el fin de partida si es necesario.
* **Jugador -> Servidor**:
  * `player:join`: `{ roomId, name, avatar }`.
  * `player:submit-answer`: `{ roomId, answerId }`.
* **Servidor -> Sala / Jugadores (Broadcast)**:
  * `room:player-joined`: Lista actualizada de jugadores para el lobby.
  * `room:question-started`: Datos de la pregunta (sin revelar la respuesta correcta), índice, total y tiempo límite.
  * `room:player-answered`: Notifica al Host que un jugador ha emitido su voto (para feedback visual).
  * `room:round-ended`: Envía respuesta correcta, explicación, respuestas de cada jugador, tiempo de respuesta en ms y el ganador más veloz de la ronda.
  * `room:game-over`: Podio final y estadísticas de rondas ganadas y puntajes.

---

## 3. Dinámica de Juego y Reglas de Velocidad

1. **Medición Autoritaria de Tiempo**:
   * En el instante en que el servidor emite `room:question-started`, guarda `questionStartTime = Date.now()`.
   * Cuando llega `player:submit-answer`, el servidor calcula:
     $$\text{elapsedMs} = \text{Date.now()} - \text{questionStartTime}$$
   * Esto elimina desincronizaciones de reloj entre los teléfonos de los participantes y el host.

2. **Criterio de Ganador de Ronda**:
   * Entre todos los jugadores que seleccionen la opción `correctId`, el que tenga el menor `elapsedMs` es coronado **Ganador de la Ronda**.
   * Puntuación:
     * El ganador más rápido recibe 100 puntos + bono de velocidad proporcional al tiempo sobrante.
     * Los demás que aciertan reciben puntos base (ej. 50 puntos).
     * Los que fallan o no contestan a tiempo reciben 0 puntos.
   * Si nadie acierta, la ronda queda desierta.

3. **Criterio de Ganador Final**:
   * Al terminar la última pregunta, el jugador con mayor puntaje acumulado (o mayor número de rondas ganadas) queda en el 1º lugar del podio.

---

## 4. Banco de Preguntas y Configuración

* Se utilizará el catálogo local preexistente en `src/app/trivia/trivia-data.ts`, cargado y gestionado de manera fluida y sin requerir API keys de terceros.
* Posibilidad de elegir categorías (General, Cine, Ciencia, Historia, Videojuegos, Mixto).

---

## 5. Componentes de UI (Frontend Angular)

1. **Host (`TriviaHostComponent`)**:
   * **Setup**: Selección de categoría, número de preguntas y tiempo (10s, 15s, 20s, 30s).
   * **Lobby**: Muestra código de sala, código QR scannable con IP local del servidor, y participantes conectados en tiempo real con sus avatares.
   * **Pantalla de Pregunta**: Barra de tiempo regresivo sincronizada, enunciado y tarjetas de opciones. Indicadores visuales de quiénes han votado.
   * **Pantalla de Revelación**: Anuncio estelar del jugador más rápido (*"⚡ ¡Juan respondió correctamente en 1.42s!"*), distribución de votos y resumen de tabla.
   * **Podio Final**: Animación de confeti, puestos 1, 2 y 3, y botón para jugar otra partida o volver al menú.

2. **Jugador Móvil (`TriviaPlayerComponent`)**:
   * Interfaz responsive adaptada para smartphones.
   * Selección rápida de participante al ingresar.
   * Botones táctiles grandes y llamativos (A, B, C, D) con vibración/feedback visual al pulsar.
   * Bloqueo inmediato tras votar para evitar dobles clics.
   * Indicador del resultado personal en la ronda: *"¡Fuiste el más rápido! 🏆"* o *"¡Correcto, pero Pedro fue más veloz!"*.

---

## 6. Scripts y Ejecución

* Agregar script en `package.json`:
  * `"server"`: `node server/index.js`
  * Posibilidad de correrlo en paralelo o con script unificado.
