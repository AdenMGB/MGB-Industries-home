/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@tresjs/core' {
  export * from '@tresjs/core'
}

declare module '@tresjs/cientos' {
  export * from '@tresjs/cientos'
}
