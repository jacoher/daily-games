# Backend Deployment to Render with GitHub Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar el pipeline de GitHub Actions para validar y disparar el despliegue automático del servidor backend de WebSockets en Render, configurando el soporte para Render Blueprint y la resolución de endpoints en el cliente frontend.

**Architecture:** Se creará un workflow de GitHub Actions (`.github/workflows/deploy-backend.yml`) que verifica sintaxis/dependencias de `server/` y notifica a Render mediante un Deploy Hook. Se agrega un blueprint `render.yaml` para la infraestructura y se actualiza `TriviaService` para permitir la conexión al backend en Render cuando se ejecute en producción.

**Tech Stack:** GitHub Actions, Node.js, Express, Socket.IO, Render Cloud, Angular 18.

## Global Constraints
- Node.js 20+ compatible.
- No alterar la medición de velocidad ni eventos existentes en `server/index.js`.
- Mantener la compatibilidad en local (`localhost:3001` / IP local para desarrollo offline).

---

### Task 1: Configurar Render Blueprint (`render.yaml`) y Scripts de Servidor

**Files:**
- Create: `render.yaml`
- Modify: `server/package.json`

- [ ] **Step 1: Crear `render.yaml` en la raíz**

```yaml
services:
  - type: web
    name: ruleta-trivia-backend
    runtime: node
    rootDir: server
    buildCommand: npm install
    startCommand: npm start
    plan: free
    autoDeploy: false
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

- [ ] **Step 2: Verificar `server/package.json` y scripts**
Asegurar que `server/package.json` tenga script `"start": "node index.js"` y dependencias completas.

- [ ] **Step 3: Commit**

```bash
git add render.yaml server/package.json
git commit -m "chore(server): add render.yaml blueprint and verify server scripts"
```

---

### Task 2: Crear el Workflow de GitHub Actions (`.github/workflows/deploy-backend.yml`)

**Files:**
- Create: `.github/workflows/deploy-backend.yml`

- [ ] **Step 1: Crear el archivo `.github/workflows/deploy-backend.yml`**

```yaml
name: Deploy Backend to Render

on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'server/**'
      - '.github/workflows/deploy-backend.yml'
      - 'render.yaml'
  workflow_dispatch:

jobs:
  validate-and-deploy:
    name: Validate and Trigger Render Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: 'server/package.json'

      - name: Install server dependencies
        run: |
          cd server
          npm ci || npm install

      - name: Check server syntax
        run: |
          node --check server/index.js

      - name: Trigger Render Deploy Hook
        if: success()
        run: |
          if [ -z "${{ secrets.RENDER_DEPLOY_HOOK_URL }}" ]; then
            echo "::warning ::RENDER_DEPLOY_HOOK_URL secret is not set. Skipping webhook deploy."
            echo "Configure RENDER_DEPLOY_HOOK_URL in repository Settings -> Secrets and variables -> Actions to enable auto-deploy."
          else
            echo "Triggering Render deploy..."
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}")
            echo "Render response HTTP status: $HTTP_STATUS"
            if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
              echo "✅ Deploy triggered successfully in Render!"
            else
              echo "::error ::Render deploy hook returned status $HTTP_STATUS"
              exit 1
            fi
          fi
```

- [ ] **Step 2: Probar la sintaxis del backend localmente**

```bash
node --check server/index.js
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-backend.yml
git commit -m "ci: add GitHub Actions workflow for backend deployment to Render"
```

---

### Task 3: Adaptar `TriviaService` para soportar Backend Remoto en Render

**Files:**
- Modify: `src/app/trivia/trivia.service.ts`

- [ ] **Step 1: Actualizar `getServerUrl()` en `src/app/trivia/trivia.service.ts`**
Permitir que use la URL pública del backend cuando esté en producción o cuando se defina en `localStorage`.

- [ ] **Step 2: Probar compilación de Angular**

```bash
npx ng build --configuration development
```

- [ ] **Step 3: Commit**

```bash
git add src/app/trivia/trivia.service.ts
git commit -m "feat(trivia): configure dynamic backend endpoint for local and remote deployment"
```
