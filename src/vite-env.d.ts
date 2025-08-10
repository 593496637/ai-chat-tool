/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  // 添加其他环境变量类型定义
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
