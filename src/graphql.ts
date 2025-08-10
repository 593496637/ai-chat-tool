// GraphQL 客户端 - 快速修复版，使用 /api/graphql 路径

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

// API配置 - 使用已经工作的 /api 路径
const getApiBaseUrl = (): string => {
  // 如果在生产环境且有自定义域名，使用bestvip.life的api路径
  if (window.location.hostname === 'bestvip.life') {
    return 'https://bestvip.life/api';
  }
  
  // 如果在Pages环境，使用Workers的直接URL
  if (window.location.hostname.includes('pages.dev')) {
    return 'https://ai-chat-api.593496637.workers.dev';
  }
  
  // 本地开发
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8787';
  }
  
  // 默认回退
  return 'https://bestvip.life/api';
};

// 简化的连接管理器
class SimpleGraphQLManager {
  private static instance: SimpleGraphQLManager;
  private isInitialized = false;
  private isConnected = false;
  private apiBaseUrl: string;
  private graphqlEndpoint: string;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.apiBaseUrl = getApiBaseUrl();
    this.graphqlEndpoint = `${this.apiBaseUrl}/graphql`;
    console.log('GraphQL Manager initialized with:', {
      apiBaseUrl: this.apiBaseUrl,
      graphqlEndpoint: this.graphqlEndpoint,
      currentHost: window.location.hostname
    });
  }

  static getInstance(): SimpleGraphQLManager {
    if (!SimpleGraphQLManager.instance) {
      SimpleGraphQLManager.instance = new SimpleGraphQLManager();
    }
    return SimpleGraphQLManager.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('GraphQL already initialized, connection status:', this.isConnected);
      return this.isConnected;
    }

    if (this.initPromise) {
      console.log('GraphQL initialization in progress, waiting...');
      return await this.initPromise;
    }

    console.log('Starting GraphQL initialization...');
    this.initPromise = this.doInitialize();
    const result = await this.initPromise;
    this.isInitialized = true;
    this.initPromise = null;
    
    console.log('GraphQL initialization completed:', result);
    return result;
  }

  private async doInitialize(): Promise<boolean> {
    try {
      console.log('Testing GraphQL connection to', this.graphqlEndpoint);
      
      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: HELLO_QUERY,
        }),
      });

      console.log('GraphQL test response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('GraphQL test result:', result);
        
        if (result.data?.hello === 'Hello from GraphQL API!') {
          this.isConnected = true;
          console.log('GraphQL connection successful');
          return true;
        } else {
          console.error('GraphQL test failed: invalid response', result);
        }
      } else {
        const errorText = await response.text();
        console.error(`GraphQL test failed: ${response.status} - ${errorText}`);
      }
      
      this.isConnected = false;
      return false;
    } catch (error) {
      console.error('GraphQL connection test error:', error);
      this.isConnected = false;
      return false;
    }
  }

  getStatus(): { endpoint: string; connected: boolean; apiBaseUrl: string } {
    return {
      endpoint: this.graphqlEndpoint,
      connected: this.isConnected,
      apiBaseUrl: this.apiBaseUrl
    };
  }

  async reset(): Promise<boolean> {
    console.log('Resetting GraphQL connection...');
    this.isInitialized = false;
    this.isConnected = false;
    this.initPromise = null;
    this.apiBaseUrl = getApiBaseUrl();
    this.graphqlEndpoint = `${this.apiBaseUrl}/graphql`;
    return await this.initialize();
  }
}

// 全局管理器实例
const manager = SimpleGraphQLManager.getInstance();

// 简化的GraphQL客户端
export class GraphQLClient {
  async query<T = any>(
    query: string, 
    variables: Record<string, any> = {}
  ): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
    try {
      const endpoint = manager.getStatus().endpoint;
      console.log('GraphQL request to:', endpoint, { query: query.substring(0, 50) + '...', variables });
      
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

      console.log('GraphQL response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GraphQL HTTP error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('GraphQL result:', result);

      return result;
    } catch (error) {
      console.error('GraphQL request failed:', error);
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
}

// 导出默认客户端实例
export const graphqlClient = new GraphQLClient();

// 工具函数：测试GraphQL连接
export async function testGraphQLConnection(): Promise<boolean> {
  try {
    console.log('Testing GraphQL connection...');
    return await manager.initialize();
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
    const apiBaseUrl = getApiBaseUrl();
    const healthUrl = `${apiBaseUrl}/health`;
    console.log('Checking health status at:', healthUrl);
    
    const response = await fetch(healthUrl);
    console.log('Health response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Health result:', result);
      return result;
    }
    return null;
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
}

// 工具函数：刷新连接
export async function refreshGraphQLConnection(): Promise<boolean> {
  try {
    console.log('Refreshing GraphQL connection...');
    return await manager.reset();
  } catch (error) {
    console.error('Failed to refresh GraphQL connection:', error);
    return false;
  }
}

// 工具函数：获取状态
export function getGraphQLStatus(): { endpoint: string; status: string; apiBaseUrl: string } {
  const status = manager.getStatus();
  return {
    endpoint: status.endpoint,
    status: status.connected ? 'connected' : 'failed',
    apiBaseUrl: status.apiBaseUrl
  };
}

// 工具函数：获取当前API配置（用于调试）
export function getApiConfig() {
  return {
    currentHost: window.location.hostname,
    apiBaseUrl: getApiBaseUrl(),
    graphqlEndpoint: `${getApiBaseUrl()}/graphql`,
    healthEndpoint: `${getApiBaseUrl()}/health`
  };
}