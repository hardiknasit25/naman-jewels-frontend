/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the backend API (the backend is a separate app).
   * Example: https://api.namanjewels.com
   * When empty, the app calls the relative "/api", which Vite proxies to the
   * backend in development.
   */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
