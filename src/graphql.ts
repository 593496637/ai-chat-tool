// GraphQL 客户端和查询定义 - 优化版本，解决重复请求问题

export interface Message {
  role: string;
  content: string;
}

export interface ChatInput {
  messages: Message[];
}

export interface ChatResponse {
  choices: Array<{
    message: Message;
    index: number;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
}

// GraphQL 查询和变异
export const SEND_MESSAGE_MUTATION = `
  mutation sendMessage($input: ChatInput!) {
    sendMessage(input: $input) {
      choices {
        message {
          role
          content
        }
        index
        finish_reason
      }
      usage {
        prompt_tokens
        completion_tokens
        total_tokens
      }
      model
    }
  }
`;

export const HELLO_QUERY = `
  query hello {
    hello
  }
`;

// 端点检测和缓存
class EndpointManager {
  private validEndpoint: string | null = null;
  private lastTestTime: number = 0;
  private testCacheDuration = 5 * 60 * 1000; // 5分钟缓存

  async getValidEndpoint(): Promise<string> {
    // 如果有缓存的有效端点且未过期，直接返回
    if (this.validEndpoint && Date.now() - this.lastTestTime < this.testCacheDuration) {
      console.log(`Using cached endpoint: ${this.validEndpoint}`);
      return this.validEndpoint;
    }

    // 测试端点
    const endpoints = ['/graphql', '/api/graphql'];
    
    for (const endpoint of endpoints) {
      if (await this.testEndpoint(endpoint)) {
        this.validEndpoint = endpoint;
        this.lastTestTime = Date.now();
        console.log(`Found valid endpoint: ${endpoint}`);
        return endpoint;
      }
    }

    // 如果都测试失败，返回默认端点
    console.warn('No valid endpoint found, using default /graphql');
    return '/graphql';
  }

  private async testEndpoint(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: HELLO_QUERY,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data?.hello === 'Hello from GraphQL API!';
      }
    } catch (error) {
      console.log(`Endpoint ${endpoint} test failed:`, error);
    }
    return false;
  }

  // 清除缓存（用于强制重新检测）
  clearCache(): void {
    this.validEndpoint = null;
    this.lastTestTime = 0;
  }

  // 获取当前缓存的端点
  getCachedEndpoint(): string | null {
    return this.validEndpoint;
  }
}

// 全局端点管理器
const endpointManager = new EndpointManager();

// GraphQL 客户端类 - 优化版本
export class GraphQLClient {
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || '/graphql';
  }

  // 设置端点
  setEndpoint(endpoint: string) {
    this.endpoint = endpoint;
  }

  async query<T = any>(
    query: string, 
    variables: Record<string, any> = {}
  ): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
    try {
      // 如果没有指定端点，自动获取有效端点
      if (!this.endpoint || this.endpoint === '/graphql') {
        this.endpoint = await endpointManager.getValidEndpoint();
      }

      console.log('Sending GraphQL request...', { 
        endpoint: this.endpoint,
        query: query.substring(0, 50) + '...', 
        variables 
      });
      const startTime = Date.now();

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const duration = Date.now() - startTime;
      console.log(`GraphQL request completed in ${duration}ms (status: ${response.status})`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        
        // 如果是405错误，清除端点缓存并抛出错误
        if (response.status === 405) {
          endpointManager.clearCache();
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('GraphQL response:', result);

      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
      }

      return result;
    } catch (error) {
      console.error('GraphQL client error:', error);
      return {
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }]
      };
    }
  }

  async sendMessage(messages: Message[]): Promise<ChatResponse | null> {
    const result = await this.query<{ sendMessage: ChatResponse }>(
      SEND_MESSAGE_MUTATION,
      { input: { messages } }
    );

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'GraphQL error');
    }

    return result.data?.sendMessage || null;
  }

  async testConnection(): Promise<string | null> {
    const result = await this.query<{ hello: string }>(HELLO_QUERY);
    
    if (result.errors) {
      console.error('Connection test failed:', result.errors);
      return null;
    }

    return result.data?.hello || null;
  }

  // 获取当前端点
  getCurrentEndpoint(): string {
    return this.endpoint;
  }

  // 强制重新检测端点
  async refreshEndpoint(): Promise<string> {
    endpointManager.clearCache();
    this.endpoint = await endpointManager.getValidEndpoint();
    return this.endpoint;
  }
}

// 导出默认客户端实例
export const graphqlClient = new GraphQLClient();

// 工具函数：测试 GraphQL 连接（优化版本，不会重复请求）
export async function testGraphQLConnection(): Promise<boolean> {
  try {
    // 使用端点管理器获取有效端点
    const validEndpoint = await endpointManager.getValidEndpoint();
    const client = new GraphQLClient(validEndpoint);
    const result = await client.testConnection();
    console.log(`GraphQL connection test result:`, result);
    
    if (result === 'Hello from GraphQL API!') {
      // 更新全局客户端端点
      graphqlClient.setEndpoint(validEndpoint);
      return true;
    }
    return false;
  } catch (error) {
    console.error('GraphQL connection test failed:', error);
    return false;
  }
}

// 工具函数：发送聊天消息
export async function sendChatMessage(messages: Message[]): Promise<ChatResponse> {
  try {
    const result = await graphqlClient.sendMessage(messages);
    if (!result) {
      throw new Error('No response from GraphQL API');
    }
    return result;
  } catch (error) {
    console.error('Failed to send chat message:', error);
    throw error;
  }
}

// 工具函数：获取健康状态
export async function getHealthStatus(): Promise<any> {
  try {
    const response = await fetch('/health');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
  return null;
}

// 工具函数：手动刷新端点（用于调试）
export async function refreshGraphQLEndpoint(): Promise<string> {
  const newEndpoint = await graphqlClient.refreshEndpoint();
  console.log(`Refreshed GraphQL endpoint: ${newEndpoint}`);
  return newEndpoint;
}

// 工具函数：获取当前有效端点
export function getCurrentValidEndpoint(): string | null {
  return endpointManager.getCachedEndpoint();
}