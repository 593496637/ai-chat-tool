// GraphQL 客户端和查询定义 - 修复版

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

// GraphQL 查询和变异 - 修复大小写问题
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

// GraphQL 客户端类 - 增强错误处理和重试机制
export class GraphQLClient {
  private endpoint: string;
  private retryCount: number;

  constructor(endpoint: string = '/graphql', retryCount: number = 2) {
    this.endpoint = endpoint;
    this.retryCount = retryCount;
  }

  // 设置端点（用于动态切换）
  setEndpoint(endpoint: string) {
    this.endpoint = endpoint;
  }

  async query<T = any>(
    query: string, 
    variables: Record<string, any> = {},
    attempt: number = 0
  ): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
    try {
      console.log(`Sending GraphQL request (attempt ${attempt + 1})...`, { 
        endpoint: this.endpoint,
        query: query.substring(0, 100) + '...', 
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

      // 处理405错误 - 尝试备用端点
      if (response.status === 405 && attempt < this.retryCount) {
        console.log('Got 405 error, trying alternative endpoint...');
        const alternativeEndpoint = this.endpoint === '/graphql' ? '/api/graphql' : '/graphql';
        this.setEndpoint(alternativeEndpoint);
        return this.query(query, variables, attempt + 1);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
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
      
      // 网络错误时尝试重试
      if (attempt < this.retryCount && (
        error instanceof TypeError || // 网络错误
        (error instanceof Error && error.message.includes('fetch'))
      )) {
        console.log(`Retrying GraphQL request (attempt ${attempt + 2})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // 指数退避
        return this.query(query, variables, attempt + 1);
      }

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

  // 重置端点
  resetEndpoint(): void {
    this.endpoint = '/graphql';
  }
}

// 导出默认客户端实例
export const graphqlClient = new GraphQLClient();

// 工具函数：测试 GraphQL 连接（支持多个端点）
export async function testGraphQLConnection(): Promise<boolean> {
  const endpoints = ['/graphql', '/api/graphql'];
  
  for (const endpoint of endpoints) {
    try {
      const client = new GraphQLClient(endpoint);
      const result = await client.testConnection();
      console.log(`GraphQL connection test result for ${endpoint}:`, result);
      
      if (result === 'Hello from GraphQL API!') {
        // 更新全局客户端端点
        graphqlClient.setEndpoint(endpoint);
        return true;
      }
    } catch (error) {
      console.error(`GraphQL connection test failed for ${endpoint}:`, error);
    }
  }
  
  return false;
}

// 工具函数：发送聊天消息（增强错误处理）
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