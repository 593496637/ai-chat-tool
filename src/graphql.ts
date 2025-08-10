// 精简版 GraphQL 客户端

export interface Message {
  role: string;
  content: string;
}

export interface ChatResponse {
  choices: Array<{
    message: Message;
  }>;
}

// GraphQL 查询
const HELLO_QUERY = `query { hello }`;

const SEND_MESSAGE_MUTATION = `
  mutation sendMessage($input: ChatInput!) {
    sendMessage(input: $input) {
      choices {
        message {
          role
          content
        }
      }
    }
  }
`;

// 获取API地址
function getApiUrl(): string {
  const host = window.location.hostname;
  if (host === 'bestvip.life') return 'https://bestvip.life/api/graphql';
  if (host.includes('pages.dev')) return 'https://ai-chat-api.593496637.workers.dev/graphql';
  return 'https://bestvip.life/api/graphql';
}

// GraphQL 客户端
export class GraphQLClient {
  private endpoint = getApiUrl();

  // 发送请求
  async request<T>(query: string, variables?: any): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    const { data, errors } = await response.json();
    if (errors) throw new Error(errors[0]?.message);
    return data;
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      const data = await this.request<{ hello: string }>(HELLO_QUERY);
      return data.hello === 'Hello from GraphQL API!';
    } catch {
      return false;
    }
  }

  // 发送消息
  async sendMessage(messages: Message[]): Promise<string> {
    const data = await this.request<{ sendMessage: ChatResponse }>(
      SEND_MESSAGE_MUTATION,
      { input: { messages } }
    );
    return data.sendMessage.choices[0]?.message?.content || '无回复';
  }
}

export const client = new GraphQLClient();