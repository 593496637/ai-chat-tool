// GraphQL schema定义
const typeDefs = `
  type Query {
    hello: String
  }
  
  type Mutation {
    chat(input: ChatInput!): ChatResponse!
  }
  
  input ChatInput {
    messages: [MessageInput!]!
  }
  
  input MessageInput {
    role: String!
    content: String!
  }
  
  type ChatResponse {
    choices: [Choice!]!
  }
  
  type Choice {
    message: Message!
  }
  
  type Message {
    role: String!
    content: String!
  }
`;

// 简单的GraphQL解析器
const resolvers = {
  Query: {
    hello: () => "Hello from GraphQL API!"
  },
  Mutation: {
    chat: async (parent, args, context) => {
      const { messages } = args.input;
      
      try {
        // 调用DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          throw new Error(`DeepSeek API error: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        throw new Error('Failed to get AI response');
      }
    }
  }
};

// 简单的GraphQL执行函数
async function executeGraphQL(query, variables, context) {
  try {
    // 解析查询类型
    if (query.includes('mutation')) {
      if (query.includes('chat')) {
        return await resolvers.Mutation.chat(null, variables, context);
      }
    } else if (query.includes('hello')) {
      return { hello: resolvers.Query.hello() };
    }
    
    throw new Error('Unknown query');
  } catch (error) {
    throw error;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // GraphQL端点
    if (url.pathname === '/api/graphql') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const body = await request.json();
        const { query, variables } = body;
        
        const context = { env };
        const result = await executeGraphQL(query, variables, context);
        
        return new Response(JSON.stringify({ data: result }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          errors: [{ message: error.message }] 
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // 保持原有的REST API兼容性
    if (url.pathname === '/api/chat') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const body = await request.json();
        
        // 调用DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: body.messages,
            max_tokens: 1000,
          }),
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: '服务器错误' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};