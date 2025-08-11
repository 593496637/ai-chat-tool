/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  
  // 自定义环境变量类型声明
  readonly VITE_GRAPHQL_ENDPOINT: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_DEBUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
