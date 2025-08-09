// GraphQL 客户端和查询定义

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
  mutation SendMessage($input: ChatInput!) {
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
  query Hello {
    hello
  }
`;

// GraphQL 客户端类
export class GraphQLClient {
  private endpoint: string;

  constructor(endpoint: string = '/graphql') {
    this.endpoint = endpoint;
  }

  async query<T = any>(
    query: string, 
    variables: Record<string, any> = {}
  ): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
    try {
      console.log('Sending GraphQL request...', { query, variables });
      const startTime = Date.now();

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const duration = Date.now() - startTime;
      console.log(`GraphQL request completed in ${duration}ms`);

      if (!response.ok) {
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
}

// 导出默认客户端实例
export const graphqlClient = new GraphQLClient();

// 工具函数：测试 GraphQL 连接
export async function testGraphQLConnection(): Promise<boolean> {
  try {
    const result = await graphqlClient.testConnection();
    console.log('GraphQL connection test result:', result);
    return result === 'Hello from GraphQL API!';
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