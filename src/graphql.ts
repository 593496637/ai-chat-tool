// GraphQL 客户端和查询定义 - 最终修复版，彻底解决重复请求问题

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

// 全局状态管理 - 防止重复初始化
class GraphQLManager {
  private static instance: GraphQLManager;
  private isInitialized = false;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;
  private endpoint = '/graphql'; // 统一使用 /graphql
  private connectionStatus: 'unknown' | 'connected' | 'failed' = 'unknown';

  static getInstance(): GraphQLManager {
    if (!GraphQLManager.instance) {
      GraphQLManager.instance = new GraphQLManager();
    }
    return GraphQLManager.instance;
  }

  async initialize(): Promise<void> {
    // 如果已经初始化或正在初始化，直接返回
    if (this.isInitialized) {
      console.log('GraphQL manager already initialized');
      return;
    }

    if (this.isInitializing) {
      console.log('GraphQL manager initialization in progress, waiting...');
      return this.initializationPromise!;
    }

    this.isInitializing = true;
    this.initializationPromise = this.doInitialize();
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
      console.log('GraphQL manager initialization completed');
    } catch (error) {
      console.error('GraphQL manager initialization failed:', error);
      this.connectionStatus = 'failed';
    } finally {
      this.isInitializing = false;
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('Testing GraphQL connection...');
      const result = await this.testConnectionInternal();
      
      if (result) {
        this.connectionStatus = 'connected';
        console.log('GraphQL connection established successfully');
      } else {
        this.connectionStatus = 'failed';
        console.log('GraphQL connection test failed');
      }
    } catch (error) {
      this.connectionStatus = 'failed';
      console.error('GraphQL initialization error:', error);
    }
  }

  private async testConnectionInternal(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
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
      
      console.error(`GraphQL test failed with status: ${response.status}`);
      return false;
    } catch (error) {
      console.error('GraphQL connection test error:', error);
      return false;
    }
  }

  getEndpoint(): string {
    return this.endpoint;
  }

  getConnectionStatus(): 'unknown' | 'connected' | 'failed' {
    return this.connectionStatus;
  }

  // 强制重新初始化
  async reinitialize(): Promise<void> {
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    this.connectionStatus = 'unknown';
    await this.initialize();
  }
}

// 全局管理器实例
const graphqlManager = GraphQLManager.getInstance();

// GraphQL 客户端类 - 简化版本
export class GraphQLClient {
  async query<T = any>(
    query: string, 
    variables: Record<string, any> = {}
  ): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
    try {
      // 确保已初始化
      await graphqlManager.initialize();
      
      const endpoint = graphqlManager.getEndpoint();
      
      console.log('Sending GraphQL request...', { 
        endpoint,
        query: query.substring(0, 50) + '...', 
        variables 
      });
      
      const startTime = Date.now();

      const response = await fetch(endpoint, {
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
        console.error(`GraphQL HTTP error! status: ${response.status}, body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
      } else {
        console.log('GraphQL request successful');
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
}

// 导出默认客户端实例
export const graphqlClient = new GraphQLClient();

// 工具函数：测试 GraphQL 连接（防止重复调用）
export async function testGraphQLConnection(): Promise<boolean> {
  try {
    await graphqlManager.initialize();
    return graphqlManager.getConnectionStatus() === 'connected';
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

// 工具函数：手动刷新连接
export async function refreshGraphQLConnection(): Promise<boolean> {
  try {
    await graphqlManager.reinitialize();
    return graphqlManager.getConnectionStatus() === 'connected';
  } catch (error) {
    console.error('Failed to refresh GraphQL connection:', error);
    return false;
  }
}

// 工具函数：获取当前状态
export function getGraphQLStatus(): {
  endpoint: string;
  status: 'unknown' | 'connected' | 'failed';
} {
  return {
    endpoint: graphqlManager.getEndpoint(),
    status: graphqlManager.getConnectionStatus()
  };
}