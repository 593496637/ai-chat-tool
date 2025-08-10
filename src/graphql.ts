// 完整的 GraphQL 客户端 - 与 Worker 端点保持完全一致

export interface Message {
  role: string;
  content: string;
}

export interface ChatResponse {
  choices: Array<{
    message: Message;
  }>;
}

// 与Worker中实现完全一致的GraphQL查询
const HELLO_QUERY = `query { hello }`;

// 使用正确的 'chat' mutation，与Worker保持一致
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

// 获取API地址 - 支持多种环境
function getApiUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://ai-chat-api.593496637.workers.dev/api/graphql'; // SSR fallback
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
  
  // 默认回退到Workers端点
  return 'https://ai-chat-api.593496637.workers.dev/api/graphql';
}

// GraphQL 客户端
export class GraphQLClient {
  private endpoint = getApiUrl();

  constructor() {
    console.log('GraphQL客户端初始化，端点:', this.endpoint);
  }

  // 发送GraphQL请求
  async request<T>(query: string, variables?: any): Promise<T> {
    console.log('发送GraphQL请求:', { query: query.trim(), variables, endpoint: this.endpoint });
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    console.log('GraphQL响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GraphQL HTTP错误:', response.status, errorText);
      throw new Error(`请求失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('GraphQL响应数据:', result);
    
    if (result.errors && result.errors.length > 0) {
      console.error('GraphQL业务错误:', result.errors);
      throw new Error(result.errors[0]?.message || 'GraphQL错误');
    }
    
    return result.data;
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      console.log('测试GraphQL连接...');
      const data = await this.request<{ hello: string }>(HELLO_QUERY);
      const isConnected = data.hello === 'Hello from GraphQL API!';
      console.log('GraphQL连接测试结果:', isConnected, data);
      return isConnected;
    } catch (error) {
      console.error('GraphQL连接测试失败:', error);
      return false;
    }
  }

  // 发送消息 - 使用正确的 chat mutation
  async sendMessage(messages: Message[]): Promise<string> {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('消息数组不能为空');
    }

    console.log('发送聊天消息:', messages);

    try {
      const data = await this.request<{ chat: ChatResponse }>(
        CHAT_MUTATION,
        { input: { messages } }
      );
      
      console.log('聊天响应:', data);
      return data.chat.choices[0]?.message?.content || '无回复';
    } catch (error) {
      console.error('发送聊天消息失败:', error);
      throw error;
    }
  }

  // 获取端点信息
  getEndpoint(): string {
    return this.endpoint;
  }

  // 更新端点
  updateEndpoint(newEndpoint: string) {
    this.endpoint = newEndpoint;
    console.log('GraphQL端点已更新:', this.endpoint);
  }
}

// 导出单例实例
export const client = new GraphQLClient();

// 便捷函数
export const testGraphQLConnection = () => client.testConnection();
export const sendChatMessage = (messages: Message[]) => client.sendMessage(messages);

// 调试信息
console.log('GraphQL模块已加载，默认端点:', getApiUrl());
