export interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

export interface GraphQLMessage {
  role: string;
  content: string;
}

export interface ConnectionStatus {
  status: 'unknown' | 'connected' | 'failed';
  endpoint: string;
  lastChecked?: Date;
  error?: string;
}

export interface AppConfig {
  useMarkdown: boolean;
  useGraphQL: boolean;
  maxRetries: number;
  retryDelay: number;
}