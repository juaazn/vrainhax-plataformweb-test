# vrainhax-web-test

Aplicación web de test para el harness VRAINHAX. Permite verificar en tiempo real el funcionamiento del backend (WebSocket, sesiones, métricas) antes de integrar con Unity.

## Stack

- Next.js 16.2 (App Router) + React 19
- TypeScript 5 strict
- TanStack Query 5, React Hook Form 7, Zod 4
- Tailwind CSS 4
- Vitest 4

## Inicio rápido

```bash
npm install
cp .env.example .env               # configurar variables
npm run dev
```

## Variables de entorno

```
AUTH0_SECRET=<random-32-byte-hex>
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000/ws/clients
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.auth-vrainhax.com
APP_BASE_URL=http://localhost:3000
```

## Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run typecheck    # Verificar tipos TypeScript
npm run test:run     # Ejecutar tests (Vitest)
npm run lint         # ESLint
npm run format       # Prettier
```

## Páginas disponibles

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard — estado WebSocket y últimos eventos |
| `/login` | Landing pública para iniciar sesión con Auth0 |
| `/register` | Landing pública para abrir el signup de Auth0 |
| `/complete-profile` | Completa username y rol si Auth0 no tiene perfil interno aún |
| `/status` | Estado del sistema (DB, Redis, WebSocket) |
| `/devices` | Dispositivos conectados y su estado |
| `/sessions` | Sesiones activas |
| `/commands` | Envío de comandos a dispositivos |
| `/metrics` | Métricas y telemetría en tiempo real |
| `/sandbox` | Sandbox de pruebas libre |

## Flujo Auth0

1. Usuario anónimo abre una ruta privada y es redirigido a `/login`.
2. `Login` usa `/api/auth/login?returnTo=/`.
3. `Register` usa `/api/auth/login?screen_hint=signup&returnTo=/`.
4. Tras volver de Auth0, el frontend llama `GET /api/v1/auth/me`.
5. Si backend responde `404`, el usuario completa `/complete-profile` y se ejecuta `POST /api/v1/users/sync`.
