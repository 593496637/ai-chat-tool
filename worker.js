// Cloudflare Workers - 支持 /api/graphql 路径

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

// GraphQL处理函数
async function handleGraphQL(request, env, startTime) {
  console.log('*** 进入GraphQL处理逻辑 ***');
  
  if (request.method !== 'POST') {
    console.log(`*** GraphQL错误: 方法 ${request.method} 不被允许 ***`);
    const errorResponse = {
      errors: [{ 
        message: `Method ${request.method} not allowed for GraphQL endpoint`,
        code: 'METHOD_NOT_ALLOWED',
        details: {
          received_method: request.method,
          allowed_methods: ['POST'],
          timestamp: new Date().toISOString()
        }
      }]
    };
    
    return new Response(JSON.stringify(errorResponse, null, 2), { 
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Allow': 'POST, OPTIONS',
        'X-Error-Type': 'METHOD_NOT_ALLOWED'
      }
    });
  }

  console.log('*** GraphQL方法验证通过 ***');

  let requestBody;
  try {
    const bodyText = await request.text();
    console.log('*** 原始请求体 ***', bodyText);
    requestBody = JSON.parse(bodyText);
    console.log('*** 解析后的请求体 ***', JSON.stringify(requestBody, null, 2));
  } catch (error) {
    console.error('*** JSON解析错误 ***', error);
    return new Response(JSON.stringify({ 
      errors: [{ 
        message: 'Invalid JSON in request body',
        details: error.message 
      }] 
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  
  if (!requestBody || !requestBody.query) {
    console.log('*** 缺少GraphQL查询 ***');
    return new Response(JSON.stringify({ 
      errors: [{ message: 'GraphQL query is required' }] 
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const query = requestBody.query.trim();
  const variables = requestBody.variables || {};
  
  console.log('*** GraphQL查询 ***', query);
  console.log('*** GraphQL变量 ***', JSON.stringify(variables));

  // 处理 hello 查询
  if (query.toLowerCase().includes('hello')) {
    console.log('*** 执行hello查询 ***');
    const duration = Date.now() - startTime;
    const response = {
      data: { hello: 'Hello from GraphQL API!' }
    };
    console.log('*** hello查询响应 ***', response);
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Response-Time': `${duration}ms` 
      },
    });
  }

  // 处理 sendMessage mutation
  if (query.toLowerCase().includes('sendmessage') && query.toLowerCase().includes('mutation')) {
    console.log('*** 执行sendMessage变更 ***');
    const messages = variables.input?.messages || [];
    
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('*** sendMessage变更参数无效 ***');
      return new Response(JSON.stringify({
        errors: [{ message: 'Messages array is required and cannot be empty' }]
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    console.log(`*** 处理 ${messages.length} 条消息 ***`);
    const data = await callDeepSeekAPI(messages, env);
    
    const result = {
      data: {
        sendMessage: data
      }
    };

    const duration = Date.now() - startTime;
    console.log(`*** sendMessage完成，耗时 ${duration}ms ***`);
    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Response-Time': `${duration}ms` 
      },
    });
  }

  // 未知GraphQL操作
  console.log('*** 未知GraphQL操作 ***');
  return new Response(JSON.stringify({
    errors: [{ 
      message: 'Unknown GraphQL operation',
      received_query: query,
      supported_operations: ['hello query', 'sendMessage mutation']
    }]
  }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default {
  async fetch(request, env) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;
    
    // 详细的请求日志
    console.log('=== 请求详细信息 ===');
    console.log(`时间: ${new Date().toISOString()}`);
    console.log(`方法: ${method}`);
    console.log(`URL: ${request.url}`);
    console.log(`路径: ${pathname}`);
    console.log('========================');
    
    // 处理CORS预检请求
    if (method === 'OPTIONS') {
      console.log('处理CORS预检请求');
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
      'X-Worker-Version': '1.0.0',
      'X-Request-ID': `req-${Date.now()}`,
    };

    try {
      // GraphQL端点处理 - 支持两个路径
      if (pathname === '/graphql' || pathname === '/api/graphql') {
        return await handleGraphQL(request, env, startTime);
      }

      // REST API端点
      if (pathname === '/api/chat') {
        console.log('*** 处理REST聊天请求 ***');
        
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
        
        console.log(`*** REST聊天完成，耗时 ${duration}ms ***`);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'X-Response-Time': `${duration}ms` },
        });
      }

      // 健康检查端点
      if (pathname === '/health' || pathname === '/api/health') {
        const duration = Date.now() - startTime;
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          worker_version: '1.0.0',
          environment: env.ENVIRONMENT || 'unknown',
          endpoints: {
            graphql: ['/graphql', '/api/graphql'],
            chat: '/api/chat',
            health: ['/health', '/api/health']
          },
          response_time: `${duration}ms`
        }), {
          headers: { ...corsHeaders, 'X-Response-Time': `${duration}ms` },
        });
      }

      // 调试端点
      if (pathname === '/debug' || pathname === '/api/debug') {
        const duration = Date.now() - startTime;
        return new Response(JSON.stringify({
          message: 'Worker调试信息',
          request: {
            method,
            url: request.url,
            pathname,
            headers: Object.fromEntries(request.headers),
          },
          worker: {
            version: '1.0.0',
            environment: env.ENVIRONMENT || 'unknown',
            timestamp: new Date().toISOString()
          },
          response_time: `${duration}ms`
        }, null, 2), {
          headers: corsHeaders,
        });
      }

      // 根路径
      if (pathname === '/' || pathname === '/api') {
        return new Response(JSON.stringify({
          message: 'AI Chat Tool API',
          status: 'running',
          worker_version: '1.0.0',
          endpoints: {
            graphql: ['/graphql', '/api/graphql'],
            chat: '/api/chat', 
            health: ['/health', '/api/health'],
            debug: ['/debug', '/api/debug']
          }
        }), {
          headers: corsHeaders,
        });
      }

      // 404 - 未知路径
      console.log(`*** 404: 未知路径 ${pathname} ***`);
      return new Response(JSON.stringify({
        error: 'Not Found',
        path: pathname,
        message: `Path ${pathname} not found`,
        available_endpoints: ['/graphql', '/api/graphql', '/api/chat', '/health', '/debug']
      }), { 
        status: 404,
        headers: corsHeaders,
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('*** Worker严重错误 ***', error);
      
      return new Response(JSON.stringify({ 
        errors: [{ 
          message: error.message || '服务器内部错误，请稍后再试',
          type: 'internal_error',
          details: error.stack
        }]
      }), {
        status: 500,
        headers: { ...corsHeaders, 'X-Response-Time': `${duration}ms` },
      });
    }
  },
};