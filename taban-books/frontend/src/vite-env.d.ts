/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_FRONTEND_URL?: string;
  readonly VITE_NODE_ENV?: string;
  readonly VITE_PORT?: string;
  readonly VITE_EMAIL_SENDER_NAME?: string;
  readonly VITE_EMAIL_FROM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

