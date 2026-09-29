# Especificación de Diseño: Planning Poker Moderno (Estilo PlanningPokerOnline)

**Fecha:** 28 de Septiembre de 2026  
**Estado:** Aprobado  
**Propósito:** Transformar el modo de juego de Planning Poker de la aplicación a una experiencia inmersiva idéntica a [planningpokeronline.com](https://planningpokeronline.com/), con mesa de póker central realista, asientos con cartas 3D animadas, panel de distribución de votos en el tapete, mazo docked inferior y soporte de modo espectador.

---

## 1. Arquitectura y Modelo de Datos

### 1.1 Tipos (`src/app/poker/poker.types.ts`)
- **`PokerPlayer`**:
  ```typescript
  export interface PokerPlayer {
    socketId: string;
    name: string;
    avatar: string;
    vote?: string;
    hasVoted: boolean;
    connected: boolean;
    isSpectator?: boolean;
  }
  ```
- **Distribución de Votos en `PokerStats`**:
  ```typescript
  export interface PokerVoteDistributionItem {
    value: string;
    count: number;
    percentage: number;
    voters: string[];
  }

  export interface PokerStats {
    average: number | null;
    median: string | null;
    mode: string | null;
    isConsensus: boolean;
    consensusValue: string | null;
    hasExtremeDuel: boolean;
    duelists: PokerDuelists | null;
    distribution: PokerVoteDistributionItem[];
  }
  ```

### 1.2 Cálculo de Estadísticas (`src/app/poker/poker-stats.util.ts`)
- Filtra jugadores activos no espectadores (`!player.isSpectator && player.hasVoted`).
- Calcula el conteo de votos por carta y el porcentaje correspondiente respecto al total de votos emitidos.
- Genera la lista `distribution` ordenada de menor a mayor valor de carta para alimentar el gráfico de barras.

### 1.3 Eventos Socket.IO (`server/index.js` y `poker.service.ts`)
- **`poker:toggle-spectator`**: `{ roomId, isSpectator }`
  - Alterna el rol del usuario conectado entre votante y espectador.
  - Limpia el voto activo si pasa a espectador y retransmite `poker:players-update`.
- **`poker:join-room`**: Acepta `isSpectator` opcional.
- **`poker:reveal`** y **`poker:reset`**:
  - Permite al Host o a un participante autorizar el revelado/reinicio.
- Quorum de votación: calculado sobre `players.filter(p => !p.isSpectator)`.

---

## 2. Experiencia de Usuario e Interfaz Visual

### 2.1 Mesa Virtual Ovalada (`.poker-table-felt`)
- Tapete con reborde perimetral y fondo degradado oscuro elegante con iluminación radial sutil.
- Los jugadores ocupan asientos alrededor de la mesa con sus avatares, nombres, etiqueta de rol y sus naipes colocados directamente sobre el tapete.

### 2.2 Asientos y Cartas con Volteo 3D (`.card-flipper`)
- **Estado Votando:** Carta boca abajo (`card-back`) con trama geométrica de naipes de póker y efecto "Listo" cuando el jugador emite su voto.
- **Animación de Revelado:** Efecto 3D Flip con `perspective` y `transform: rotateY(180deg)` que revela simultáneamente todas las cartas de la mesa con una transición suave.
- **Espectador:** Chip visual `👁️ Espectador` sin naipe en la mesa.

### 2.3 Centro de la Mesa Interactivo
- **Fase de Votación:**
  - Contador de quórum circular: `"X / Y jugadores listos"`.
  - Botón prominente de *"👀 Revelar Cartas"*.
- **Fase de Revelado:**
  - Resumen métrico: Promedio, Mediana y banner de Consenso.
  - Gráfico de Distribución de Votos: Barras dinámicas que ilustran cuántos votos recibió cada valor de carta (ej. `3 votos para 5 (60%)`, `2 votos para 8 (40%)`).
  - Botones de acción: *"🔄 Revotar / Nueva Ronda"*, *"Fijar Estimación"* y Ruleta de Desempate.

### 2.4 Mazo Docked Inferior ("Choose your card")
- Barra flotante en la parte inferior de la pantalla para el participante (`poker-player.component`).
- Botones de naipes con elevación táctil (`transform: translateY(-12px)`) y selección activa resaltada.
- Switch rápido para alternar entre "🃏 Votante" y "👁️ Espectador".
- Responsivo para dispositivos móviles y pantallas de escritorio.

---

## 3. Plan de Verificación y Pruebas
1. **Pruebas Unitarias:** Ejecución de pruebas en `poker-stats.util.spec.ts` para verificar el cálculo de distribución de votos y omisión de espectadores.
2. **Pruebas de Integración y Sockets:** Comprobar emisión y sincronización de `poker:toggle-spectator`, `poker:vote`, `poker:reveal` y `poker:reset`.
3. **Prueba End-to-End Visual:**
   - Host en `/poker` y jugador en `/poker/play?room=...`.
   - Verificar la mesa ovalada, colocación de cartas boca abajo al votar, volteo 3D al revelar, visualización de barras de distribución y alternancia de rol de espectador.
