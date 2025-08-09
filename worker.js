// Cloudflare Workers - GraphQL API for DeepSeek Chat

// GraphQL Schema Definition
const typeDefs = `
  type Query {
    hello: String
  }

  type Mutation {
    sendMessage(input: ChatInput!): ChatResponse!
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
    usage: Usage
    model: String
  }

  type Choice {
    message: Message!
    index: Int!
    finish_reason: String
  }

  type Message {
    role: String!
    content: String!
  }

  type Usage {
    prompt_tokens: Int
    completion_tokens: Int
    total_tokens: Int
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL API!'
  },
  Mutation: {
    sendMessage: async (parent, { input }, { env }) => {
      const data = await callDeepSeekAPI(input.messages, env);
      return data;
    }
  }
};

// DeepSeek API调用函数
async function callDeepSeekAPI(messages, env) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

  try {
    console.log('Calling DeepSeek API via GraphQL...');
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

// 简单的 GraphQL 执行器
async function executeGraphQL(query, variables, context) {
  try {
    // 解析查询类型
    if (query.includes('sendMessage')) {
      // 这是一个 mutation
      const result = await resolvers.Mutation.sendMessage(null, variables, context);
      return {
        data: {
          sendMessage: result
        }
      };
    } else if (query.includes('hello')) {
      // 这是一个 query
      const result = resolvers.Query.hello();
      return {
        data: {
          hello: result
        }
      };
    } else {
      throw new Error('Unknown operation');
    }
  } catch (error) {
    return {
      errors: [{
        message: error.message
      }]
    };
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
      if (url.pathname === '/graphql') {
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }

        console.log('Processing GraphQL request...');
        const body = await request.json();
        
        // 验证GraphQL请求格式
        if (!body.query) {
          return new Response(JSON.stringify({ 
            errors: [{ message: 'Query is required' }] 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await executeGraphQL(
          body.query, 
          body.variables || {}, 
          { env }
        );

        const duration = Date.now() - startTime;
        console.log(`Total GraphQL request time: ${duration}ms`);

        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Response-Time': `${duration}ms`,
          },
        });
      }

      // REST API端点 (保持兼容性)
      if (url.pathname === '/api/chat') {
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }

        console.log('Processing REST request...');
        const body = await request.json();
        
        // 验证请求格式
        if (!body.messages || !Array.isArray(body.messages)) {
          return new Response(JSON.stringify({ error: 'Invalid request format' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

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
        errors: [{ 
          message: error.message || '服务器内部错误，请稍后再试' 
        }]
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