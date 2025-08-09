// Cloudflare Workers - AI聊天API (GraphQL + REST)

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
    
    console.log(`${request.method} ${url.pathname}`);
    
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
          console.log('GraphQL endpoint only accepts POST');
          return new Response('Method not allowed', { 
            status: 405,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Allow': 'POST, OPTIONS'
            }
          });
        }

        console.log('Processing GraphQL request...');
        const body = await request.json();
        
        if (!body.query) {
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

        // 处理sendMessage mutation
        if (body.query.includes('sendMessage')) {
          const variables = body.variables || {};
          const messages = variables.input?.messages || [];
          
          console.log('Executing sendMessage mutation');
          const data = await callDeepSeekAPI(messages, env);
          
          const result = {
            data: {
              sendMessage: data
            }
          };

          const duration = Date.now() - startTime;
          console.log(`GraphQL request completed in ${duration}ms`);

          return new Response(JSON.stringify(result), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'X-Response-Time': `${duration}ms`,
            },
          });
        }

        // 处理hello query
        if (body.query.includes('hello')) {
          console.log('Executing hello query');
          return new Response(JSON.stringify({
            data: { hello: 'Hello from GraphQL API!' }
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        return new Response(JSON.stringify({
          errors: [{ message: 'Unknown GraphQL operation' }]
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
          return new Response('Method not allowed', { 
            status: 405,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Allow': 'POST, OPTIONS'
            }
          });
        }

        console.log('Processing REST request...');
        const body = await request.json();
        
        if (!body.messages || !Array.isArray(body.messages)) {
          return new Response(JSON.stringify({ error: 'Invalid request format' }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
          });
        }

        const data = await callDeepSeekAPI(body.messages, env);

        const duration = Date.now() - startTime;
        console.log(`REST request completed in ${duration}ms`);

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Response-Time': `${duration}ms`,
          },
        });
      }

      // 其他路径返回404
      console.log(`Unknown path: ${url.pathname}`);
      return new Response(`Not Found: ${url.pathname}`, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
      
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