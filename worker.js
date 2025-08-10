// Cloudflare Workers - AI聊天API (GraphQL + REST) - 最终修复版

// DeepSeek API调用函数
async function callDeepSeekAPI(messages, env) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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

export default {
  async fetch(request, env) {
    const startTime = Date.now();
    const url = new URL(request.url);
    
    console.log(`${request.method} ${url.pathname} - User-Agent: ${request.headers.get('User-Agent')?.substring(0, 50)}...`);
    
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      console.log('Handling CORS preflight request');
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // 统一的GraphQL端点处理 - 只使用 /graphql
      if (url.pathname === '/graphql') {
        if (request.method !== 'POST') {
          console.log(`GraphQL endpoint received ${request.method}, returning 405`);
          return new Response(JSON.stringify({
            error: 'Method not allowed',
            message: 'GraphQL endpoint only accepts POST requests',
            allowed_methods: ['POST', 'OPTIONS']
          }), { 
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Allow': 'POST, OPTIONS'
            }
          });
        }

        console.log('Processing GraphQL request...');
        let body;
        try {
          body = await request.json();
        } catch (error) {
          console.error('Invalid JSON in request body:', error);
          return new Response(JSON.stringify({ 
            errors: [{ message: 'Invalid JSON in request body' }] 
          }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
          });
        }
        
        if (!body.query) {
          console.log('Missing query in GraphQL request');
          return new Response(JSON.stringify({ 
            errors: [{ message: 'Query is required' }] 
          }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
          });
        }

        // 规范化查询字符串，处理大小写和空格问题
        const queryString = body.query.replace(/\s+/g, ' ').trim().toLowerCase();
        console.log('Normalized query:', queryString);

        // 处理hello query - 简单的连接测试
        if (queryString.includes('hello')) {
          console.log('Executing hello query');
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            data: { hello: 'Hello from GraphQL API!' }
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'X-Response-Time': `${duration}ms`,
            },
          });
        }

        // 处理sendMessage mutation
        if (queryString.includes('sendmessage') && queryString.includes('mutation')) {
          const variables = body.variables || {};
          const messages = variables.input?.messages || [];
          
          if (!Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({
              errors: [{ message: 'Messages array is required and cannot be empty' }]
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
            });
          }
          
          console.log('Executing sendMessage mutation with', messages.length, 'messages');
          const data = await callDeepSeekAPI(messages, env);
          
          const result = {
            data: {
              sendMessage: data
            }
          };

          const duration = Date.now() - startTime;
          console.log(`GraphQL sendMessage completed in ${duration}ms`);

          return new Response(JSON.stringify(result), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'X-Response-Time': `${duration}ms`,
            },
          });
        }

        // 未知的GraphQL操作
        console.log('Unknown GraphQL operation:', queryString);
        return new Response(JSON.stringify({
          errors: [{ 
            message: 'Unknown GraphQL operation',
            received_query: body.query.substring(0, 100) + '...'
          }]
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
        });
      }

      // REST API端点
      if (url.pathname === '/api/chat') {
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({
            error: 'Method not allowed',
            message: 'Chat API only accepts POST requests',
            allowed_methods: ['POST', 'OPTIONS']
          }), { 
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Allow': 'POST, OPTIONS'
            }
          });
        }

        console.log('Processing REST chat request...');
        const body = await request.json();
        
        if (!body.messages || !Array.isArray(body.messages)) {
          return new Response(JSON.stringify({ 
            error: 'Invalid request format',
            message: 'Messages array is required'
          }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
          });
        }

        const data = await callDeepSeekAPI(body.messages, env);

        const duration = Date.now() - startTime;
        console.log(`REST chat completed in ${duration}ms`);

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Response-Time': `${duration}ms`,
          },
        });
      }

      // 健康检查端点
      if (url.pathname === '/health') {
        const duration = Date.now() - startTime;
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          endpoints: {
            graphql: '/graphql',
            chat: '/api/chat',
            health: '/health'
          },
          response_time: `${duration}ms`
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Response-Time': `${duration}ms`,
          },
        });
      }

      // 根路径重定向到健康检查
      if (url.pathname === '/') {
        return new Response(JSON.stringify({
          message: 'AI Chat Tool API',
          status: 'running',
          endpoints: {
            graphql: '/graphql',
            chat: '/api/chat', 
            health: '/health'
          }
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // 其他路径返回404
      console.log(`404 - Unknown path: ${url.pathname}`);
      return new Response(JSON.stringify({
        error: 'Not Found',
        path: url.pathname,
        message: `Path ${url.pathname} not found`,
        available_endpoints: ['/graphql', '/api/chat', '/health']
      }), { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Worker Error:', error);
      
      return new Response(JSON.stringify({ 
        errors: [{ 
          message: error.message || '服务器内部错误，请稍后再试',
          type: 'internal_error'
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