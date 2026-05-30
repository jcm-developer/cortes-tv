/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TMDB_API_KEY: string;
  readonly PUBLIC_TMDB_LANG?: string;
  readonly PUBLIC_TMDB_REGION?: string;
  readonly PUBLIC_AUTH_USER?: string;
  readonly PUBLIC_AUTH_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
