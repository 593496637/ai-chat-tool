// 用户界面消息类型
export interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

// API消息类型（GraphQL使用）
export interface ApiMessage {
  role: string;
  content: string;
}

// GraphQL响应类型
export interface ChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

// GraphQL输入类型
export interface ChatInput {
  messages: ApiMessage[];
}

// API客户端配置
export interface ApiConfig {
  graphqlEndpoint: string;
  timeout?: number;
}