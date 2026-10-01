# Diseño: Actualización de Baraja Fibonacci y Control de Revelado por Moderador

## 1. Contexto y Objetivos
En el módulo de Planning Poker:
1. Reemplazar la carta con valor `'0'` por `'0.5'` en la baraja Fibonacci.
2. Restringir la acción de revelar cartas para que **exclusivamente** el moderador (host de la sala) pueda ejecutarla.
3. En la interfaz del participante, remover el botón de revelado y mostrar un mensaje informativo que indique la espera de la acción del moderador.

## 2. Componentes Afectados y Modificaciones

### 2.1. Tipos y Constantes (`src/app/poker/poker.types.ts`)
- Modificar `FIBONACCI_CARDS`:
  ```typescript
  export const FIBONACCI_CARDS = ['0.5', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
  ```
- Dado que `poker-stats.util.ts` utiliza `Number(v.vote)`, el valor `'0.5'` se convierte numéricamente a `0.5`, garantizando el correcto cálculo de sumas, promedios, medianas y duelos de extremos.

### 2.2. Servidor Backend (`server/index.js`)
- En el evento Socket.io `poker:reveal`:
  - Verificar que el emisor coincida con `room.hostSocketId`.
  - Remover la condición que permitía a los participantes estándar invocar la revelación.
  - Si el emisor no es el host, rechazar la operación silenciosamente (o retornar callback si aplica).

### 2.3. Cliente Participante (`src/app/poker/poker-player/`)
- **Template (`poker-player.component.html`):**
  - Remover el botón `.action-btn.reveal-btn`.
  - Incorporar en el hub central de votación un indicador informativo:
    ```html
    <div class="waiting-moderator-banner">
      <span>⏳ Esperando que el moderador revele las cartas...</span>
    </div>
    ```
- **Componente (`poker-player.component.ts`):**
  - Eliminar el método `revealCards()` para mantener el código limpio de funciones muertas.
- **Estilos (`poker-player.component.css`):**
  - Añadir estilos para `.waiting-moderator-banner` acordes al diseño dark/glass del tablero.

## 3. Pruebas y Criterios de Aceptación
1. **Verificación de Baraja:**
   - Al iniciar sesión con baraja Fibonacci en Host y Jugador, la primera carta seleccionable debe ser `0.5` en vez de `0`.
   - Votar con `0.5` debe reflejarse en las estadísticas (promedio numérico decimal correcto, histograma y mediana).
2. **Control de Revelado:**
   - El participante ya no ve el botón "👀 Revelar Cartas", sino el texto de espera.
   - Si un participante intenta emitir el evento `poker:reveal` mediante consola de navegador, el backend debe ignorarlo.
   - El moderador mantiene su botón activo en la vista Host y, al hacer clic, las cartas se revelan sincronizadamente en todas las pantallas.
3. **Compilación:**
   - `npm run build` debe compilar sin errores de TypeScript ni de plantillas.
