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

// 调用DeepSeek API的函数
async function callDeepSeekAPI(messages, env) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

  try {
    console.log('Calling DeepSeek API...');
    const startTime = Date.now();
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    console.log(`DeepSeek API response time: ${duration}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API Error:', response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('DeepSeek API success');
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('DeepSeek API timeout after 15 seconds');
      throw new Error('请求超时，请稍后再试');
    }
    console.error('DeepSeek API Error:', error);
    throw error;
  }
}

// 简单的GraphQL解析器
const resolvers = {
  Query: {
    hello: () => "Hello from GraphQL API!"
  },
  Mutation: {
    chat: async (parent, args, context) => {
      const { messages } = args.input;
      return await callDeepSeekAPI(messages, context.env);
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
    const startTime = Date.now();
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

    try {
      // GraphQL端点
      if (url.pathname === '/api/graphql') {
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }

        console.log('Processing GraphQL request...');
        const body = await request.json();
        const { query, variables } = body;
        
        const context = { env };
        const result = await executeGraphQL(query, variables, context);
        
        const duration = Date.now() - startTime;
        console.log(`Total GraphQL request time: ${duration}ms`);
        
        return new Response(JSON.stringify({ data: result }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Response-Time': `${duration}ms`,
          },
        });
      }

      // 保持原有的REST API兼容性
      if (url.pathname === '/api/chat') {
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }

        console.log('Processing REST request...');
        const body = await request.json();
        const data = await callDeepSeekAPI(body.messages, env);

        const duration = Date.now() - startTime;
        console.log(`Total REST request time: ${duration}ms`);

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Response-Time': `${duration}ms`,
          },
        });
      }

      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Worker Error:', error);
      
      return new Response(JSON.stringify({ 
        error: error.message || '服务器内部错误，请稍后再试',
        details: '请检查网络连接或稍后重试'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Response-Time': `${duration}ms`,
        },
      });
    }
  },
};