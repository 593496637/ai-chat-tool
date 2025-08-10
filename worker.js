// Cloudflare Workers - AI聊天API (GraphQL + REST) - 简化健壮版

// DeepSeek API调用函数
async function callDeepSeekAPI(messages, env) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    console.log('Calling DeepSeek API with', messages.length, 'messages...');
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
    console.log(`DeepSeek API response: ${response.status} in ${duration}ms`);

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
    const method = request.method;
    const pathname = url.pathname;
    
    console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);
    
    // 处理CORS预检请求
    if (method === 'OPTIONS') {
      console.log('CORS preflight request');
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

    // 通用CORS头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      // GraphQL端点处理
      if (pathname === '/graphql') {
        console.log('Processing GraphQL request...');
        
        if (method !== 'POST') {
          console.log(`GraphQL: Method ${method} not allowed`);
          return new Response(JSON.stringify({
            errors: [{ message: `Method ${method} not allowed. Use POST.` }]
          }), { 
            status: 405,
            headers: { ...corsHeaders, 'Allow': 'POST, OPTIONS' }
          });
        }

        let requestBody;
        try {
          requestBody = await request.json();
          console.log('GraphQL request body:', JSON.stringify(requestBody, null, 2));
        } catch (error) {
          console.error('Invalid JSON in GraphQL request:', error);
          return new Response(JSON.stringify({ 
            errors: [{ message: 'Invalid JSON in request body' }] 
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        if (!requestBody || !requestBody.query) {
          console.log('Missing query in GraphQL request');
          return new Response(JSON.stringify({ 
            errors: [{ message: 'GraphQL query is required' }] 
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const query = requestBody.query.trim();
        const variables = requestBody.variables || {};
        
        console.log('GraphQL Query:', query);
        console.log('GraphQL Variables:', JSON.stringify(variables));

        // 处理 hello 查询 - 连接测试
        if (query.toLowerCase().includes('hello')) {
          console.log('Executing hello query');
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({
            data: { hello: 'Hello from GraphQL API!' }
          }), {
            headers: { ...corsHeaders, 'X-Response-Time': `${duration}ms` },
          });
        }

        // 处理 sendMessage mutation
        if (query.toLowerCase().includes('sendmessage') && query.toLowerCase().includes('mutation')) {
          console.log('Executing sendMessage mutation');
          const messages = variables.input?.messages || [];
          
          if (!Array.isArray(messages) || messages.length === 0) {
            console.log('Invalid messages in sendMessage mutation');
            return new Response(JSON.stringify({
              errors: [{ message: 'Messages array is required and cannot be empty' }]
            }), {
              status: 400,
              headers: corsHeaders,
            });
          }
          
          console.log(`Processing ${messages.length} messages`);
          const data = await callDeepSeekAPI(messages, env);
          
          const result = {
            data: {
              sendMessage: data
            }
          };

          const duration = Date.now() - startTime;
          console.log(`sendMessage completed in ${duration}ms`);
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'X-Response-Time': `${duration}ms` },
          });
        }

        // 未知GraphQL操作
        console.log('Unknown GraphQL operation');
        return new Response(JSON.stringify({
          errors: [{ 
            message: 'Unknown GraphQL operation',
            query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
          }]
        }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // REST API端点
      if (pathname === '/api/chat') {
        console.log('Processing REST chat request...');
        
        if (method !== 'POST') {
          return new Response(JSON.stringify({
            error: 'Method not allowed',
            message: 'Chat API only accepts POST requests'
          }), { 
            status: 405,
            headers: { ...corsHeaders, 'Allow': 'POST, OPTIONS' }
          });
        }

        const body = await request.json();
        
        if (!body.messages || !Array.isArray(body.messages)) {
          return new Response(JSON.stringify({ 
            error: 'Invalid request format',
            message: 'Messages array is required'
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const data = await callDeepSeekAPI(body.messages, env);
        const duration = Date.now() - startTime;
        
        console.log(`REST chat completed in ${duration}ms`);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'X-Response-Time': `${duration}ms` },
        });
      }

      // 健康检查端点
      if (pathname === '/health') {
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
          headers: { ...corsHeaders, 'X-Response-Time': `${duration}ms` },
        });
      }

      // 根路径
      if (pathname === '/') {
        return new Response(JSON.stringify({
          message: 'AI Chat Tool API',
          status: 'running',
          endpoints: {
            graphql: '/graphql (POST)',
            chat: '/api/chat (POST)', 
            health: '/health (GET)'
          }
        }), {
          headers: corsHeaders,
        });
      }

      // 404 - 未知路径
      console.log(`404: Unknown path ${pathname}`);
      return new Response(JSON.stringify({
        error: 'Not Found',
        path: pathname,
        message: `Path ${pathname} not found`,
        available_endpoints: ['/graphql', '/api/chat', '/health']
      }), { 
        status: 404,
        headers: corsHeaders,
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
        headers: { ...corsHeaders, 'X-Response-Time': `${duration}ms` },
      });
    }
  },
};