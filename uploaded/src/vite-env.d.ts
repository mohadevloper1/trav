/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_SECRET: string;
  // add more env vars here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
