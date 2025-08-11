// 简化的 Cloudflare Workers - 只保留REST API

// 环境变量验证
function validateEnvironment(env) {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY环境变量未设置');
  }
  return true;
}

// GraphQL处理函数
async function handleGraphQL(request, env, startTime) {
  console.log('=== 处理GraphQL请求 ===');
  
  if (request.method !== 'POST') {
    return createErrorResponse(
      `GraphQL端点仅支持POST方法，收到: ${request.method}`,
      405,
      {
        'Allow': 'POST, OPTIONS',
        'X-Error-Type': 'METHOD_NOT_ALLOWED'
      }
    );
  }

  let requestBody;
  try {
    const bodyText = await request.text();
    console.log('GraphQL请求体:', bodyText);
    requestBody = JSON.parse(bodyText);
  } catch (error) {
    return createErrorResponse(
      'JSON解析失败: 请求体格式无效',
      400,
      { 'X-Error-Type': 'INVALID_JSON' }
    );
  }
  
  if (!requestBody || !requestBody.query) {
    return createErrorResponse(
      'GraphQL查询是必需的',
      400,
      { 'X-Error-Type': 'MISSING_QUERY' }
    );
  }

  const query = requestBody.query.trim();
  const variables = requestBody.variables || {};
  
  console.log('GraphQL查询:', query);
  console.log('GraphQL变量:', JSON.stringify(variables));

  try {
    // 处理hello查询
    if (query.includes('query') && query.includes('hello')) {
      const duration = Date.now() - startTime;
      return createSuccessResponse({
        data: { hello: 'Hello from GraphQL API!' }
      }, duration);
    }

    // 处理chat mutation
    if (query.includes('mutation') && query.includes('chat')) {
      console.log('执行chat mutation');
      
      const messages = variables.input?.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        return createErrorResponse(
          'chat mutation需要有效的messages数组',
          400,
          { 'X-Error-Type': 'INVALID_MESSAGES' }
        );
      }
      
      console.log(`处理 ${messages.length} 条聊天消息`);
      const data = await callDeepSeekAPI(messages, env);
      
      const duration = Date.now() - startTime;
      return createSuccessResponse({
        data: { chat: data }
      }, duration);
    }

    // 未知的GraphQL操作
    return createErrorResponse(
      '未知的GraphQL操作',
      400,
      {
        'X-Error-Type': 'UNKNOWN_OPERATION',
        'X-Supported-Operations': 'hello query, chat mutation'
      }
    );

  } catch (error) {
    console.error('GraphQL处理错误:', error);
    return createErrorResponse(
      error.message || '内部服务器错误',
      500,
      { 'X-Error-Type': 'INTERNAL_ERROR' }
    );
  }
}

// DeepSeek API调用函数
async function callDeepSeekAPI(messages, env) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    console.log('调用DeepSeek API，消息数量:', messages.length);
    
    // 验证消息格式
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('消息数组无效或为空');
    }

    messages.forEach((msg, index) => {
      if (!msg.role || !msg.content) {
        throw new Error(`消息 ${index} 格式无效`);
      }
    });
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        'User-Agent': 'AI-Chat-Tool/2.0.0',
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API错误:', response.status, errorText);
      throw new Error(`DeepSeek API错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // 验证响应格式
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('DeepSeek API返回数据格式无效');
    }

    console.log('DeepSeek API调用成功');
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('DeepSeek API超时（15秒）');
      throw new Error('请求超时，请稍后再试');
    }
    console.error('DeepSeek API错误:', error);
    throw error;
  }
}

// 统一的响应创建函数
function createSuccessResponse(data, duration = 0) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Response-Time': `${duration}ms`,
      'X-Worker-Version': '2.0.0',
    },
  });
}

function createErrorResponse(message, status = 400, additionalHeaders = {}) {
  const errorResponse = {
    errors: [{
      message,
      timestamp: new Date().toISOString(),
      code: additionalHeaders['X-Error-Type'] || 'UNKNOWN_ERROR'
    }]
  };

  return new Response(JSON.stringify(errorResponse, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Worker-Version': '2.0.0',
      ...additionalHeaders
    },
  });
}

// CORS预检处理
function handleCORS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      'Access-Control-Max-Age': '86400',
      'X-Worker-Version': '2.0.0',
    },
  });
}

// 主要的Worker导出
export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;
    
    // 请求日志
    console.log('=== 新请求 ===');
    console.log(`时间: ${new Date().toISOString()}`);
    console.log(`方法: ${method}`);
    console.log(`路径: ${pathname}`);
    console.log(`User-Agent: ${request.headers.get('User-Agent') || 'Unknown'}`);
    console.log('===============');

    try {
      // 验证环境变量
      validateEnvironment(env);

      // 处理CORS预检请求
      if (method === 'OPTIONS') {
        console.log('处理CORS预检请求');
        return handleCORS();
      }

      // GraphQL端点 - 主要通信方式
      if (pathname === '/graphql' || pathname === '/api/graphql') {
        return await handleGraphQL(request, env, startTime);
      }

      // REST API端点 - 备用方案
      if (pathname === '/api/chat') {
        console.log('处理聊天请求');
        
        if (method !== 'POST') {
          return createErrorResponse(
            `聊天API仅支持POST方法，收到: ${method}`,
            405,
            { 'Allow': 'POST, OPTIONS' }
          );
        }

        const body = await request.json();
        
        if (!body.messages || !Array.isArray(body.messages)) {
          return createErrorResponse(
            '请求格式无效：需要messages数组',
            400
          );
        }

        const data = await callDeepSeekAPI(body.messages, env);
        const duration = Date.now() - startTime;
        
        console.log(`聊天完成，耗时 ${duration}ms`);
        return createSuccessResponse(data, duration);
      }

      // 健康检查端点
      if (pathname === '/health') {
        const duration = Date.now() - startTime;
        return createSuccessResponse({
          status: 'ok',
          timestamp: new Date().toISOString(),
          worker_version: '2.1.0',
          environment: env.ENVIRONMENT || 'production',
          endpoints: {
            graphql: ['/graphql', '/api/graphql'],
            chat: '/api/chat',
            health: '/health'
          },
          response_time: `${duration}ms`
        }, duration);
      }

      // API根路径
      if (pathname === '/' || pathname === '/api') {
        return createSuccessResponse({
          message: 'AI Chat Tool API v2.1 (GraphQL + REST)',
          status: 'running',
          worker_version: '2.1.0',
          endpoints: {
            graphql: ['/graphql', '/api/graphql'],
            chat: '/api/chat',
            health: '/health'
          },
          documentation: 'https://github.com/593496637/ai-chat-tool'
        });
      }

      // 404 - 未找到
      return createErrorResponse(
        `路径 ${pathname} 未找到`,
        404,
        {
          'X-Available-Endpoints': '/graphql, /api/graphql, /api/chat, /health'
        }
      );
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Worker严重错误:', error);
      
      return createErrorResponse(
        error.message || '服务器内部错误',
        500,
        { 'X-Response-Time': `${duration}ms` }
      );
    }
  },
};