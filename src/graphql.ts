// GraphQL客户端工具
export class GraphQLClient {
  constructor(private endpoint: string) {}

  async query(query: string, variables?: any) {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data;
    } catch (error) {
      console.error('GraphQL query error:', error);
      throw error;
    }
  }
}

// GraphQL查询和变更
export const CHAT_MUTATION = `
  mutation Chat($input: ChatInput!) {
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

export const HELLO_QUERY = `
  query {
    hello
  }
`;

// 创建客户端实例
export const graphqlClient = new GraphQLClient('/api/graphql');