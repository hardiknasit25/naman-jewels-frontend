# Naman Jewels Admin — Frontend

React + TypeScript + Vite admin panel for Naman Jewels. This is a standalone
single-page app that talks to the separate backend API
([naman-jewels-admin-backend](../naman-jewels-admin-backend)) over HTTP.

## Prerequisites

- Node.js 18+
- The backend running and reachable (see its README).

Default admin login: **admin@namanjewels.com** / **admin123**

## Setup

```bash
npm install
cp .env.example .env   # then set VITE_API_URL
```

## Configuration

The app reads a single environment variable at build time:

| Variable       | Example                       | Description                          |
| -------------- | ----------------------------- | ------------------------------------ |
| `VITE_API_URL` | `https://api.namanjewels.com` | Base URL of the backend API          |

- In **development**, set `VITE_API_URL=http://localhost:3000` to call the local
  backend directly. If you leave it empty, requests go to the relative `/api`
  path, which Vite proxies to `http://localhost:3000` (see `vite.config.ts`).
- In **production**, set `VITE_API_URL` to your deployed backend's URL. The
  value is baked into the build, so set it before running `npm run build`.

Make sure the backend's `CORS_ORIGIN` allows this app's origin.

## Development

```bash
npm run dev
```

Vite dev server: http://localhost:5173

## Production build

```bash
npm run build      # outputs static assets to dist/
npm run preview    # preview the production build locally
```

Deploy the contents of `dist/` to any static host (Vercel, Netlify, S3/CDN,
nginx, …).

## Lint

```bash
npm run lint
```
