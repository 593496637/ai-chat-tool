// 简化的 GraphQL 客户端 - 专注于学习和使用
import { ApiMessage, ChatResponse, ApiConfig } from '../types';

// GraphQL Mutation 定义
const CHAT_MUTATION = `
  mutation chat($input: ChatInput!) {
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

// 获取 GraphQL 端点配置
function getGraphQLConfig(): ApiConfig {
  // 优先使用环境变量配置
  const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || getDefaultEndpoint();
  const timeout = import.meta.env.VITE_API_TIMEOUT ? 
    parseInt(import.meta.env.VITE_API_TIMEOUT, 10) : 30000;
  
  return {
    graphqlEndpoint: endpoint,
    timeout,
  };
}

// 获取默认端点 (向后兼容)
function getDefaultEndpoint(): string {
  // 如果没有设置环境变量，使用原有的自动检测逻辑
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  const isProd = typeof window !== 'undefined' && 
    window.location.hostname === 'sunnyday.pw';
  
  if (isLocal) {
    return 'http://localhost:8787/api/graphql';
  } else if (isProd) {
    return 'https://sunnyday.pw/api/graphql';
  } else {
    // 默认使用 Worker 端点
    return 'https://ai-chat-api.593496637.workers.dev/api/graphql';
  }
}

// GraphQL 请求执行函数
async function executeGraphQL(query: string, variables?: any): Promise<any> {
  const config = getGraphQLConfig();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);
  
  try {
    const response = await fetch(config.graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // 检查 GraphQL 错误
    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].message || 'GraphQL 查询失败');
    }
    
    return result.data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    
    throw error;
  }
}

// 发送聊天消息的主要函数
export async function sendChatMessage(messages: ApiMessage[]): Promise<ChatResponse> {
  // 输入验证
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('消息数组不能为空');
  }
  
  // 验证消息格式
  for (const message of messages) {
    if (!message.role || !message.content) {
      throw new Error('消息格式无效：缺少 role 或 content 字段');
    }
  }
  
  const isDebugEnabled = import.meta.env.VITE_DEBUG === 'true';
  
  if (isDebugEnabled) {
    console.log('发送 GraphQL 聊天请求:', { messageCount: messages.length });
  }
  
  try {
    const data = await executeGraphQL(CHAT_MUTATION, {
      input: { messages }
    });
    
    if (isDebugEnabled) {
      console.log('GraphQL 请求成功');
    }
    return data.chat;
  } catch (error) {
    if (isDebugEnabled) {
      console.error('GraphQL 请求失败:', error);
    }
    throw error;
  }
}

// 获取当前配置信息（用于调试）
export function getApiConfig(): ApiConfig {
  return getGraphQLConfig();
}

// 健康检查函数
export async function checkHealth(): Promise<boolean> {
  try {
    const config = getGraphQLConfig();
    const healthUrl = config.graphqlEndpoint.replace('/api/graphql', '/health');
    
    const response = await fetch(healthUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5秒超时
    });
    
    return response.ok;
  } catch (error) {
    const isDebugEnabled = import.meta.env.VITE_DEBUG === 'true';
    if (isDebugEnabled) {
      console.error('健康检查失败:', error);
    }
    return false;
  }
}

// 调试信息
if (typeof window !== 'undefined' && import.meta.env.VITE_DEBUG === 'true') {
  console.log('GraphQL 客户端已加载');
  console.log('配置:', getGraphQLConfig());
  console.log('环境变量:', {
    endpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT,
    timeout: import.meta.env.VITE_API_TIMEOUT,
    debug: import.meta.env.VITE_DEBUG,
  });
}