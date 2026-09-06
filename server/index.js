const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('Trivia Socket Server Running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

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
      players: new Map(), // socketId -> { socketId, name, avatar, score, correctCount, wrongCount }
      currentAnswers: new Map(), // socketId -> { answerId, elapsedMs, isCorrect, playerName }
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
    const normalizedRoomId = roomId?.trim().toUpperCase();
    const room = rooms.get(normalizedRoomId);
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
    if (room.currentAnswers.size >= room.players.size && room.players.size > 0) {
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
