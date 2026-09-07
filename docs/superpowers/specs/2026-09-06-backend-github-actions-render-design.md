# Despliegue del Servidor Backend en Render con GitHub Actions

**Fecha:** 2026-09-06  
**Autor:** Antigravity  
**Estado:** Aprobado

---

## 1. Contexto y Objetivos

El modo multijugador de Trivia utiliza un servidor Node.js + Socket.IO ubicado en `server/index.js` (puerto local 3001).
Para que las partidas puedan jugarse por internet (cuando el frontend esté publicado en GitHub Pages u otro host), se requiere:
1. Desplegar el backend como un servicio web en **Render** (compatible con WebSockets y HTTPS/WSS gratuito).
2. Automatizar el despliegue continuo mediante un workflow de **GitHub Actions** cada vez que se actualice el código del backend (`server/**`).
3. Ajustar el frontend (`TriviaService`) para conectarse a la URL pública de Render cuando la aplicación se ejecute en producción o cuando se defina un endpoint remoto.

---

## 2. Componentes de la Solución

### 2.1. Workflow de GitHub Actions (`.github/workflows/deploy-backend.yml`)
- **Triggers:**
  - `push` a las ramas `main` y `develop` con filtro de rutas: `server/**` y `.github/workflows/deploy-backend.yml`.
  - `workflow_dispatch` (gatillado manual desde la pestaña Actions de GitHub).
- **Pasos:**
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` (Node.js 20)
  3. Validación de dependencias y sintaxis (`npm ci --prefix server` y verificación de sintaxis con `node --check server/index.js`).
  4. Disparo del **Deploy Hook** de Render mediante `curl`:
     ```bash
     curl -s -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
     ```
  5. Registro del estado y verificación de respuesta de Render.

### 2.2. Configuración en Render (`render.yaml` - Blueprint)
Permite a Render detectar la configuración de infraestructura como código:
- **Type:** web
- **Runtime:** node
- **Root Directory:** server
- **Build Command:** npm install
- **Start Command:** npm start
- **Plan:** free
- **Env:** Node 20

### 2.3. Frontend (`src/app/trivia/trivia.service.ts`)
- En `getServerUrl()`:
  - Si el hostname es `localhost` o una IP local (ej. `192.168.x.x`), usa `http://${hostname}:3001`.
  - Si está en GitHub Pages (`github.io`) u otro dominio de producción, resuelve a la URL de Render (con fallback predeterminado y opción de personalización vía `localStorage`).

---

## 3. Verificación
1. Validar sintaxis del workflow `.github/workflows/deploy-backend.yml`.
2. Validar sintaxis de `server/index.js`.
3. Validar compilación de Angular con `npx ng build`.
