/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" im Capacitor-Android-Build (siehe app/package.json build:android), sonst unset. */
  readonly VITE_CAPACITOR?: string;
}

