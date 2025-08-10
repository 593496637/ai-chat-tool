// 修复后的 graphqlClient.ts - 与Worker实现保持一致

export interface Message {
  role: string;
  content: string;
}

export interface ChatResponse {
  choices: Array<{
    message: Message;
  }>;
}

// 与Worker中的实现保持一致的GraphQL查询
const HELLO_QUERY = `query { hello }`;

// 修正：使用 'chat' 而不是 'sendMessage'，与Worker保持一致
const CHAT_MUTATION = `
  mutation chat($input: ChatInput!) {
    chat(input: $input) {
      choices {
        message {
          role
          content
        }
      }
    }
  }
`;

// 改进的环境检测函数
function getApiUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://bestvip.life/api/graphql'; // SSR fallback
  }
  
  const host = window.location.hostname;
  
  // 生产环境
  if (host === 'bestvip.life') {
    return 'https://bestvip.life/api/graphql';
  }
  
  // Cloudflare Pages预览环境
  if (host.includes('pages.dev')) {
    return 'https://ai-chat-api.593496637.workers.dev/api/graphql';
  }
  
  // 本地开发环境
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8787/api/graphql'; // Wrangler默认端口
  }
  
  // 默认回退
  return 'https://bestvip.life/api/graphql';
}

// 改进的GraphQL客户端，增加错误处理和重试机制
export class GraphQLClient {
  private endpoint: string;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.endpoint = getApiUrl();
  }

  // 私有方法：延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 私有方法：执行HTTP请求
  private async executeRequest(query: string, variables?: any): Promise<any> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].message || '未知GraphQL错误');
    }

    return result.data;
  }

  // 带重试机制的请求方法
  async request<T>(query: string, variables?: any): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.executeRequest(query, variables);
      } catch (error) {
        lastError = error as Error;
        console.warn(`GraphQL请求失败 (尝试 ${attempt}/${this.maxRetries}):`, error);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw lastError || new Error('GraphQL请求失败');
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      const data = await this.request<{ hello: string }>(HELLO_QUERY);
      return data.hello === 'Hello from GraphQL API!';
    } catch (error) {
      console.error('GraphQL连接测试失败:', error);
      return false;
    }
  }

  // 发送聊天消息 - 修正方法名和返回类型
  async sendChatMessage(messages: Message[]): Promise<ChatResponse> {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('消息数组不能为空');
    }

    // 验证消息格式
    messages.forEach((msg, index) => {
      if (!msg.role || !msg.content) {
        throw new Error(`消息 ${index} 格式无效：缺少role或content字段`);
      }
    });

    try {
      const data = await this.request<{ chat: ChatResponse }>(
        CHAT_MUTATION,
        { input: { messages } }
      );
      return data.chat;
    } catch (error) {
      console.error('发送聊天消息失败:', error);
      throw error;
    }
  }

  // 获取当前状态信息
  getStatus() {
    return {
      endpoint: this.endpoint,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    };
  }

  // 更新配置
  updateConfig(config: { endpoint?: string; maxRetries?: number; retryDelay?: number }) {
    if (config.endpoint) this.endpoint = config.endpoint;
    if (config.maxRetries) this.maxRetries = config.maxRetries;
    if (config.retryDelay) this.retryDelay = config.retryDelay;
  }
}

// 单例实例
export const graphqlClient = new GraphQLClient();

// 便捷的导出函数，保持向后兼容
export const sendChatMessage = (messages: Message[]) => 
  graphqlClient.sendChatMessage(messages);

export const testGraphQLConnection = () => 
  graphqlClient.testConnection();

export const getHealthStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch {
    return false;
  }
};

export const refreshGraphQLConnection = async (): Promise<boolean> => {
  try {
    // 重新创建客户端实例
    const newClient = new GraphQLClient();
    const isConnected = await newClient.testConnection();
    if (isConnected) {
      // 更新全局客户端的配置
      graphqlClient.updateConfig({ endpoint: newClient.getStatus().endpoint });
    }
    return isConnected;
  } catch {
    return false;
  }
};

export const getGraphQLStatus = () => graphqlClient.getStatus();
