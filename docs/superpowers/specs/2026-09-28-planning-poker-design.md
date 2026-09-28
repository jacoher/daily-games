# Spec: Planning Poker Épico e Interactivo

## Resumen Ejecutivo
Incorporar un nuevo minijuego de **Planning Poker** a la suite de *Daily Games*, enfocado en hacer divertidas, ágiles y participativas las sesiones de estimación de historias de usuario en equipos de desarrollo. El juego utiliza una arquitectura cliente-servidor en tiempo real (Socket.io) donde el Host proyecta la sala con código QR y los miembros del equipo votan desde sus dispositivos móviles o navegadores con cartas ocultas, revelación dramática y dinámicas de gamificación ("Consenso Party", "Duelo de Extremos", reacciones de emojis en vivo y ruleta de desempate).

---

## 1. Arquitectura del Sistema y Flujo de Comunicación

### 1.1 Backend (`server/index.js`)
El servidor Express + Socket.io gestionará el estado en memoria de las salas de poker a través del mapa `pokerRooms = new Map<string, PokerRoomState>()`.

#### Modelo de Estado de Sala
```typescript
interface PokerPlayer {
  socketId: string;
  name: string;
  avatar: string;
  vote?: string;
  hasVoted: boolean;
  connected: boolean;
}

interface PokerStory {
  id: string;
  title: string;
  estimate?: string;
}

interface PokerRoomState {
  id: string; // Código alfanumérico único de 5 caracteres
  hostSocketId: string;
  deckType: 'fibonacci' | 'tshirt';
  stories: PokerStory[];
  currentStoryIndex: number;
  revealed: boolean;
  players: Map<string, PokerPlayer>; // Key: playerName normalizado o socketId
  availableParticipants: Array<{ name: string; avatarUrl: string }>;
}
```

#### Eventos de Socket.io
- **`poker:create-room`**: El host envía la configuración inicial (`deckType`, `participants`, `stories`). El servidor devuelve `roomId` y registra al host.
- **`poker:join-room`**: Un jugador se une proporcionando `roomId`, `name` y `avatar`. Si el jugador ya existía (reconexión), se actualiza su `socketId` y se preserva su estado.
- **`poker:player-joined`**: Notificación a todos los clientes en la sala sobre la lista de participantes conectados.
- **`poker:select-deck`**: El host cambia la baraja (`fibonacci` <-> `tshirt`), reseteando los votos de la ronda activa.
- **`poker:set-stories` / `poker:next-story`**: Gestión y navegación de historias a estimar.
- **`poker:vote`**: Un jugador emite o modifica su voto. El servidor notifica a la sala que el jugador ha votado (`hasVoted = true`) sin divulgar el valor de la carta.
- **`poker:reveal`**: El host solicita revelar las cartas. El servidor emite `poker:revealed` con los valores de todos los jugadores y los cálculos estadísticos (promedio, mediana, moda, consenso, extremos).
- **`poker:reset`**: El host reinicia la votación para la historia actual o pasa a la siguiente.
- **`poker:reaction`**: Un jugador envía un emoji (`🔥`, `💩`, `☕`, `🤯`, `🚀`). El servidor retransmite a la sala para animación flotante en pantalla.
- **`poker:roulette-settle`**: El host activa el resultado de la ruleta de desempate y se guarda la estimación final.

---

## 2. Barajas Soportadas
1. **Fibonacci Clásico**:
   - Cartas: `['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕']`
2. **T-Shirt Sizes**:
   - Cartas: `['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕']`

---

## 3. Dinámicas Divertidas de Gamificación

### 3.1 🎉 Consenso Party (Unanimidad Total)
- **Activación**: Todos los votos válidos (excluyendo `☕` y `?`) coinciden exactamente.
- **Efectos**:
  - Lluvia masiva de confetti con `canvas-confetti`.
  - Sonido de victoria triunfal ejecutado mediante `SoundService`.
  - Banner animado: *"¡UNANIMIDAD TOTAL! El equipo está perfectamente alineado"*.

### 3.2 ⚔️ Duelo de Extremos (Debate Cara a Cara)
- **Activación**: Diferencia marcada de criterios tras el reveal (ej. Fibonacci con dispersión >= 2 niveles como 2 vs 13, o T-Shirt XS vs XL).
- **Efectos**:
  - Modal/overlay con estética arcade de pelea "VS".
  - Muestra al votante con la estimación más baja ("El Optimista") frente al votante con la más alta ("El Prudente").
  - Temporizador cómico de 60 segundos de debate para exponer argumentos antes de revotar.

### 3.3 🎈 Reacciones Flotantes en Tiempo Real
- **Activación**: En cualquier momento desde la pantalla del participante.
- **Efectos**: Emojis ascienden flotando por la pantalla del Host con variaciones orgánicas de rotación y escala.

### 3.4 🎰 Ruleta de Desempate
- **Activación**: Botón accesible para el host si persiste el desacuerdo.
- **Efectos**: Renderiza una mini ruleta conteniendo exclusivamente las opciones más votadas en disputa, girando con efectos sonoros y seleccionando una al azar.

---

## 4. Estructura de Componentes en Angular

### 4.1 Rutas (`app.routes.ts`)
- `/poker`: `PokerHostComponent` (vista proyectable para el facilitador).
- `/poker/play`: `PokerPlayerComponent` (vista responsive táctil para participantes).

### 4.2 Componentes Nuevos
1. **`PokerHostComponent`** (`src/app/poker/poker-host/`):
   - Generación y despliegue de QR con `qrcode`.
   - Visualización de la mesa de cartas y estado de los jugadores (pensando, listo, revelado).
   - Panel de historias de usuario y estimación activa.
   - Gráfica/resumen de distribución de votos y métricas (promedio, mediana, dispersión).
   - Overlays de Consenso Party, Duelo de Extremos y Ruleta de Desempate.
2. **`PokerPlayerComponent`** (`src/app/poker/poker-player/`):
   - Selector o ingreso de avatar/nombre.
   - Visualización de la historia actual.
   - Selector de cartas táctil con animaciones y confirmación visual.
   - Barra flotante de reacciones en vivo.
3. **Actualización de `SetupComponent`**:
   - Tarjeta para entrar a **Planning Poker Épico** en el grid de juegos principales.
4. **Servicio `PokerService`** (`src/app/poker/poker.service.ts`):
   - Conexión Socket.io unificada, métodos de emisión y observables de estado reactivo.
   - Lógica de cálculo de promedios, medianas, modas, detección de consenso y extremos.

---

## 5. Manejo de Errores y Casos Borde
- **Reconexión de jugadores**: Reconexión transparente por nombre de jugador sin duplicar registros ni perder votos.
- **Falta de votos**: El host puede forzar la revelación si algún jugador está inactivo (marcado con `—`).
- **Desconexión del servidor**: Banner informativo en la interfaz que indica estado de conexión Socket.io e instrucciones de ejecución local.

---

## 6. Verificación y Pruebas
- Pruebas unitarias de `PokerService` evaluando cálculos estadísticos (consenso, promedios con Fibonacci y mapeo de T-Shirt).
- Verificación de compilación estricta (`ng build`).
- Pruebas manuales multijugador con simulación de clientes concurrentes (host + 2 o más jugadores).
