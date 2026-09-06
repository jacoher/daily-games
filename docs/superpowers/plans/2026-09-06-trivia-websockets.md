# Trivia Multijugador por WebSockets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar una experiencia de Trivia interactiva multijugador basada en WebSockets (Socket.IO) donde los participantes votan en vivo desde sus móviles y el primero en responder correctamente gana cada ronda.

**Architecture:** 
- Un backend centralizado en Node.js + Express + Socket.IO (`server/index.js`) que administra el estado en memoria de las salas, los timestamps autoritativos de emisión y respuesta (`elapsedMs`), y los broadcasts de resultados.
- Un servicio de Angular (`src/app/trivia/trivia.service.ts`) migrado a `socket.io-client`.
- Interfaces de Host y Jugador (`trivia-host`, `trivia-player`) adaptadas para conexión en tiempo real, votación rápida, visualización de ganador de ronda por velocidad y podio final.

**Tech Stack:** Node.js, Express, Socket.IO, Angular 18 (Standalone Components, RxJS), TypeScript, QRCode.

## Global Constraints
- Medición de tiempo estricta en el servidor backend para evitar desincronización horaria entre dispositivos.
- Eliminar por completo la dependencia de PeerJS en el flujo de Trivia para evitar fallos de conexión WebRTC.
- Compatibilidad responsive para dispositivos móviles en la vista de jugador.
- Banco de preguntas locales desde `trivia-data.ts`.

---

### Task 1: Servidor Backend Socket.IO (`server/index.js`)

**Files:**
- Create: `server/index.js`
- Modify: `package.json:4-10`

**Interfaces:**
- Consumes: Socket.IO client connections on port 3001 (or env `PORT`).
- Produces: Room management events (`host:create-room`, `player:join`, `host:start-game`, `host:next-question`, `player:submit-answer`, `room:round-ended`, `room:game-over`).

- [ ] **Step 1: Crear `server/index.js` con soporte para salas, temporizador y cálculo del más rápido**

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Memory storage for active rooms
const rooms = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

io.on('connection', (socket) => {
  // Host creates a room
  socket.on('host:create-room', ({ category, timeLimit, questionCount, questions, participants }, callback) => {
    const roomId = generateRoomId();
    const roomState = {
      id: roomId,
      hostSocketId: socket.id,
      category,
      timeLimit: Number(timeLimit) || 20,
      questionCount: Number(questionCount) || 5,
      questions: questions || [],
      currentQuestionIndex: -1,
      questionStartTime: 0,
      timerInterval: null,
      secondsLeft: 0,
      players: new Map(), // socketId -> { name, avatar, score, correctCount, wrongCount }
      currentAnswers: new Map(), // socketId -> { answerId, elapsedMs, isCorrect }
      availableParticipants: participants || []
    };

    rooms.set(roomId, roomState);
    socket.join(roomId);

    if (callback) {
      callback({ success: true, roomId, participants: roomState.availableParticipants });
    }
  });

  // Player joins
  socket.on('player:join', ({ roomId, name, avatar }, callback) => {
    const room = rooms.get(roomId?.toUpperCase());
    if (!room) {
      if (callback) callback({ success: false, error: 'Sala no encontrada' });
      return;
    }

    const player = {
      socketId: socket.id,
      name,
      avatar,
      score: 0,
      correctCount: 0,
      wrongCount: 0
    };

    room.players.set(socket.id, player);
    socket.join(room.id);

    const playerList = Array.from(room.players.values());
    io.to(room.id).emit('room:players-update', playerList);

    if (callback) {
      callback({
        success: true,
        roomId: room.id,
        currentPhase: room.currentQuestionIndex >= 0 ? 'question' : 'lobby'
      });
    }
  });

  // Host starts game
  socket.on('host:start-game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    dispatchQuestion(room, 0);
  });

  // Host next question
  socket.on('host:next-question', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    const nextIdx = room.currentQuestionIndex + 1;
    if (nextIdx >= room.questions.length) {
      endGame(room);
    } else {
      dispatchQuestion(room, nextIdx);
    }
  });

  // Player submits answer
  socket.on('player:submit-answer', ({ roomId, answerId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    if (room.currentAnswers.has(socket.id)) return; // already voted

    const elapsedMs = Date.now() - room.questionStartTime;
    const currentQ = room.questions[room.currentQuestionIndex];
    const isCorrect = currentQ && currentQ.correctId === answerId;

    room.currentAnswers.set(socket.id, {
      answerId,
      elapsedMs,
      isCorrect,
      playerName: player.name
    });

    // Notify host that player answered
    io.to(room.hostSocketId).emit('room:player-answered', {
      playerName: player.name,
      totalAnswered: room.currentAnswers.size,
      totalPlayers: room.players.size
    });

    // Check if all players answered
    if (room.currentAnswers.size >= room.players.size) {
      revealRound(room);
    }
  });

  socket.on('disconnect', () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.hostSocketId === socket.id) {
        clearInterval(room.timerInterval);
        io.to(roomId).emit('room:closed', { message: 'El anfitrión cerró la partida' });
        rooms.delete(roomId);
      } else if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        io.to(roomId).emit('room:players-update', Array.from(room.players.values()));
      }
    }
  });
});

function dispatchQuestion(room, index) {
  clearInterval(room.timerInterval);
  room.currentQuestionIndex = index;
  room.currentAnswers.clear();
  room.questionStartTime = Date.now();
  room.secondsLeft = room.timeLimit;

  const q = room.questions[index];
  const questionPayload = {
    id: q.id,
    text: q.text,
    options: q.options,
    category: q.category,
    index,
    total: room.questions.length,
    timeLimit: room.timeLimit
  };

  io.to(room.id).emit('room:question-started', questionPayload);

  room.timerInterval = setInterval(() => {
    room.secondsLeft -= 1;
    io.to(room.id).emit('room:timer', { secondsLeft: room.secondsLeft });
    if (room.secondsLeft <= 0) {
      clearInterval(room.timerInterval);
      revealRound(room);
    }
  }, 1000);
}

function revealRound(room) {
  clearInterval(room.timerInterval);
  const q = room.questions[room.currentQuestionIndex];
  if (!q) return;

  // Identify correct answers sorted by elapsedMs
  const correctSubmissions = [];
  const playerAnswersObj = {};

  for (const [socketId, ans] of room.currentAnswers.entries()) {
    const player = room.players.get(socketId);
    if (!player) continue;
    playerAnswersObj[player.name] = ans.answerId;

    if (ans.isCorrect) {
      correctSubmissions.push({
        socketId,
        player,
        elapsedMs: ans.elapsedMs
      });
    } else {
      player.wrongCount += 1;
    }
  }

  // Account for players who didn't submit
  for (const [socketId, player] of room.players.entries()) {
    if (!room.currentAnswers.has(socketId)) {
      player.wrongCount += 1;
    }
  }

  correctSubmissions.sort((a, b) => a.elapsedMs - b.elapsedMs);

  let roundWinner = null;
  if (correctSubmissions.length > 0) {
    const fastest = correctSubmissions[0];
    const timeBonus = Math.max(0, Math.round((room.timeLimit * 1000 - fastest.elapsedMs) / 100));
    fastest.player.score += 100 + timeBonus;
    fastest.player.correctCount += 1;

    roundWinner = {
      name: fastest.player.name,
      avatar: fastest.player.avatar,
      elapsedMs: fastest.elapsedMs,
      seconds: (fastest.elapsedMs / 1000).toFixed(2),
      pointsGained: 100 + timeBonus
    };

    // Other correct players receive smaller score
    for (let i = 1; i < correctSubmissions.length; i++) {
      const other = correctSubmissions[i];
      other.player.score += 50;
      other.player.correctCount += 1;
    }
  }

  const updatedPlayers = Array.from(room.players.values());

  io.to(room.id).emit('room:round-ended', {
    correctId: q.correctId,
    explanation: q.explanation,
    answers: playerAnswersObj,
    roundWinner,
    players: updatedPlayers
  });
}

function endGame(room) {
  clearInterval(room.timerInterval);
  const rankings = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
  io.to(room.id).emit('room:game-over', { rankings });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Trivia Socket Server running on port ${PORT}`);
});
```

- [ ] **Step 2: Actualizar `package.json` para agregar script `server`**

Modificar `"scripts"` en `package.json`:
```json
"server": "node server/index.js",
"dev": "ng serve"
```

- [ ] **Step 3: Verificar arranque del servidor backend**

Run: `node server/index.js & sleep 2 && curl -I http://localhost:3001`
Expected: HTTP 200/404 response from Express on port 3001.

- [ ] **Step 4: Commit**

```bash
git add server/index.js package.json
git commit -m "feat(trivia): add socket.io multiplayer backend server"
```

---

### Task 2: Migrar `TriviaService` a Socket.IO (`src/app/trivia/trivia.service.ts`)

**Files:**
- Modify: `src/app/trivia/trivia.service.ts`

**Interfaces:**
- Consumes: Socket.IO connection to `http://<serverHost>:3001`.
- Produces: Observables (`phase$`, `players$`, `currentQuestion$`, `roundWinner$`, `rankings$`, `secondsLeft$`, `currentAnswers$`) consumidos por `trivia-host` y `trivia-player`.

- [ ] **Step 1: Adaptar `TriviaService` para conectarse al backend Socket.IO**

Reemplazar la inicialización de `PeerJS` por `io()` de `socket.io-client`.
Implementar métodos:
- `createRoom(category, count, timeLimit, participants)`
- `joinRoom(roomId, name, avatar)`
- `startGame()`
- `nextQuestion()`
- `submitAnswer(answerId)`
- `reset()`
- `roundWinner$` BehaviorSubject que guarda `{ name, avatar, elapsedMs, seconds, pointsGained }`.

- [ ] **Step 2: Verificar compilación en Angular**

Run: `npx ng build --configuration development --no-watch`
Expected: Compilación exitosa de `trivia.service.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/trivia/trivia.service.ts
git commit -m "refactor(trivia): migrate trivia.service to socket.io"
```

---

### Task 3: Actualizar Componente Host (`TriviaHostComponent`)

**Files:**
- Modify: `src/app/trivia/trivia-host/trivia-host.component.ts`

**Interfaces:**
- Consumes: `TriviaService` observables (`phase$`, `players$`, `roundWinner$`, `revealData$`, `currentQuestion$`).
- Produces: Interfaz de sala de TV / anfitrión con código de sala, QR con IP de red local para que se unan los móviles, temporizador visual, tarjeta destacando al ganador más rápido de la ronda y podio final.

- [ ] **Step 1: Actualizar template y estilos de `TriviaHostComponent`**

- Agregar en la pantalla de `reveal` un banner destacado:
  `⚡ ¡[Nombre] respondió en [segundos]s! (+[puntos] pts)`
- Asegurar que el código QR apunte a la IP de la máquina para que los celulares en la misma red Wi-Fi se unan inmediatamente.
- Sincronizar el conteo de votos recibidos en vivo durante la pregunta.

- [ ] **Step 2: Verificar compilación y renderizado**

Run: `npx ng build --configuration development --no-watch`
Expected: Compilación sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/trivia/trivia-host/trivia-host.component.ts
git commit -m "feat(trivia): display fastest winner highlight and real-time room status in host"
```

---

### Task 4: Actualizar Componente Jugador Móvil (`TriviaPlayerComponent`)

**Files:**
- Modify: `src/app/trivia/trivia-player/trivia-player.component.ts`

**Interfaces:**
- Consumes: `TriviaService` (`phase$`, `currentQuestion$`, `roundWinner$`, `revealData$`).
- Produces: Experiencia de respuesta móvil con 4 botones de selección claros, bloqueo tras votar, y pantalla de felicitaciones si fue el más rápido.

- [ ] **Step 1: Actualizar `TriviaPlayerComponent` para manejar votación Socket.IO**

- Botones táctiles A, B, C, D con retroalimentación inmediata al tocar.
- Bloqueo para impedir cambiar la respuesta una vez enviada.
- En fase `reveal`, mostrar al jugador su estado:
  - Si fue el ganador más veloz: *"⚡ ¡Fuiste el más rápido de la ronda! Ganaste la ronda"*
  - Si acertó pero otro fue más rápido: *"Correcto, pero [Nombre] fue más rápido"*
  - Si falló: *"Incorrecto ❌"*

- [ ] **Step 2: Verificar compilación**

Run: `npx ng build --configuration development --no-watch`
Expected: Build sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/trivia/trivia-player/trivia-player.component.ts
git commit -m "feat(trivia): add responsive player voting UI with instant speed feedback"
```

---

### Task 5: Verificación Integral End-to-End

**Files:**
- Test scripts / Simulación manual.

- [ ] **Step 1: Iniciar servidor backend y cliente frontend**
- [ ] **Step 2: Crear sala desde el Host y unir dos sockets/jugadores simulados**
- [ ] **Step 3: Enviar respuestas con diferente timestamp y verificar que el servidor premia al más rápido**
- [ ] **Step 4: Confirmar pantalla de final de juego y podio**
- [ ] **Step 5: Commit final de integración**
