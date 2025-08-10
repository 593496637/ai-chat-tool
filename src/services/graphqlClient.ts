// 完整的 GraphQL 客户端 - 与 Worker 端点保持一致

export interface Message {
  role: string;
  content: string;
}

export interface ChatResponse {
  choices: Array<{
    message: Message;
  }>;
}

// 与Worker中的实现完全一致的GraphQL查询
const HELLO_QUERY = `query { hello }`;

// 使用 'chat' mutation，与Worker保持一致
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

// 获取完整的API端点
function getApiUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://ai-chat-api.593496637.workers.dev/api/graphql'; // SSR fallback
  }
  
  const host = window.location.hostname;
  
  // 生产环境
  if (host === 'bestvip.life') {
    return 'https://bestvip.life/api/graphql';
  }
  
  // Cloudflare Pages预览环境
  if (host.includes('pages.dev')) {
    return 'https://ai-chat-api.593496637.workers.dev/api/graphql';
  }
  
  // 本地开发环境
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8787/api/graphql'; // Wrangler默认端口
  }
  
  // 默认回退到Worker端点
  return 'https://ai-chat-api.593496637.workers.dev/api/graphql';
}

// 获取健康检查端点
function getHealthUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://ai-chat-api.593496637.workers.dev/api/health'; // SSR fallback
  }
  
  const host = window.location.hostname;
  
  // 生产环境
  if (host === 'bestvip.life') {
    return 'https://bestvip.life/api/health';
  }
  
  // Cloudflare Pages预览环境
  if (host.includes('pages.dev')) {
    return 'https://ai-chat-api.593496637.workers.dev/api/health';
  }
  
  // 本地开发环境
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8787/api/health'; // Wrangler默认端口
  }
  
  // 默认回退到Worker端点
  return 'https://ai-chat-api.593496637.workers.dev/api/health';
}

// 获取REST API端点（作为GraphQL的备份）
function getRestUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://ai-chat-api.593496637.workers.dev/api/chat'; // SSR fallback
  }
  
  const host = window.location.hostname;
  
  // 生产环境
  if (host === 'bestvip.life') {
    return 'https://bestvip.life/api/chat';
  }
  
  // Cloudflare Pages预览环境
  if (host.includes('pages.dev')) {
    return 'https://ai-chat-api.593496637.workers.dev/api/chat';
  }
  
  // 本地开发环境
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8787/api/chat'; // Wrangler默认端口
  }
  
  // 默认回退到Worker端点
  return 'https://ai-chat-api.593496637.workers.dev/api/chat';
}

// 改进的GraphQL客户端，增加错误处理和重试机制
export class GraphQLClient {
  private endpoint: string;
  private healthEndpoint: string;
  private restEndpoint: string;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.endpoint = getApiUrl();
    this.healthEndpoint = getHealthUrl();
    this.restEndpoint = getRestUrl();
    console.log('🚀 GraphQL客户端初始化:');
    console.log('  - GraphQL端点:', this.endpoint);
    console.log('  - 健康检查端点:', this.healthEndpoint);
    console.log('  - REST备用端点:', this.restEndpoint);
  }

  // 私有方法：延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 私有方法：执行HTTP请求
  private async executeRequest(query: string, variables?: any): Promise<any> {
    console.log('📤 发送GraphQL请求:', { 
      query: query.trim(), 
      variables, 
      endpoint: this.endpoint 
    });
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    console.log('📥 GraphQL响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GraphQL HTTP错误:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ GraphQL响应数据:', result);
    
    if (result.errors && result.errors.length > 0) {
      console.error('❌ GraphQL业务错误:', result.errors);
      throw new Error(result.errors[0].message || '未知GraphQL错误');
    }

    return result.data;
  }

  // 带重试机制的请求方法
  async request<T>(query: string, variables?: any): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 GraphQL请求尝试 ${attempt}/${this.maxRetries}`);
        return await this.executeRequest(query, variables);
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ GraphQL请求失败 (尝试 ${attempt}/${this.maxRetries}):`, error);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.maxRetries) {
          const delayMs = this.retryDelay * attempt;
          console.log(`⏳ 等待 ${delayMs}ms 后重试`);
          await this.delay(delayMs);
        }
      }
    }

    console.error('💥 GraphQL请求最终失败:', lastError);
    throw lastError || new Error('GraphQL请求失败');
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 测试GraphQL连接...');
      const data = await this.request<{ hello: string }>(HELLO_QUERY);
      const isConnected = data.hello === 'Hello from GraphQL API!';
      console.log('🎯 GraphQL连接测试结果:', isConnected ? '✅ 成功' : '❌ 失败', data);
      return isConnected;
    } catch (error) {
      console.error('❌ GraphQL连接测试失败:', error);
      return false;
    }
  }

  // 发送聊天消息 - 使用正确的'chat' mutation
  async sendChatMessage(messages: Message[]): Promise<ChatResponse> {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('消息数组不能为空');
    }

    // 验证消息格式
    messages.forEach((msg, index) => {
      if (!msg.role || !msg.content) {
        throw new Error(`消息 ${index} 格式无效：缺少role或content字段`);
      }
    });

    console.log('💬 发送聊天消息:', messages);

    try {
      const data = await this.request<{ chat: ChatResponse }>(
        CHAT_MUTATION,
        { input: { messages } }
      );
      
      console.log('🎉 聊天响应成功:', data);
      return data.chat;
    } catch (error) {
      console.error('❌ 发送聊天消息失败:', error);
      throw error;
    }
  }

  // 使用REST API作为备用方案
  async sendChatMessageRest(messages: Message[]): Promise<ChatResponse> {
    console.log('🔄 使用REST API备用方案:', this.restEndpoint);
    
    const response = await fetch(this.restEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`REST API错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ REST API响应:', data);
    return data;
  }

  // 获取当前状态信息
  getStatus() {
    return {
      endpoint: this.endpoint,
      healthEndpoint: this.healthEndpoint,
      restEndpoint: this.restEndpoint,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    };
  }

  // 更新配置
  updateConfig(config: { endpoint?: string; maxRetries?: number; retryDelay?: number }) {
    if (config.endpoint) {
      this.endpoint = config.endpoint;
      console.log('🔧 GraphQL端点已更新:', this.endpoint);
    }
    if (config.maxRetries) this.maxRetries = config.maxRetries;
    if (config.retryDelay) this.retryDelay = config.retryDelay;
  }
}

// 单例实例
export const graphqlClient = new GraphQLClient();

// 便捷的导出函数，保持向后兼容
export const sendChatMessage = (messages: Message[]) => 
  graphqlClient.sendChatMessage(messages);

export const testGraphQLConnection = () => 
  graphqlClient.testConnection();

// 修复健康检查函数，使用正确的Worker端点
export const getHealthStatus = async (): Promise<boolean> => {
  try {
    const healthUrl = getHealthUrl();
    console.log('🏥 检查健康状态:', healthUrl);
    
    const response = await fetch(healthUrl);
    const isHealthy = response.ok;
    
    console.log('🏥 健康检查结果:', isHealthy ? '✅ 正常' : '❌ 异常');
    return isHealthy;
  } catch (error) {
    console.error('❌ 健康检查失败:', error);
    return false;
  }
};

export const refreshGraphQLConnection = async (): Promise<boolean> => {
  try {
    console.log('🔄 刷新GraphQL连接...');
    // 重新创建客户端实例
    const newClient = new GraphQLClient();
    const isConnected = await newClient.testConnection();
    if (isConnected) {
      // 更新全局客户端的配置
      graphqlClient.updateConfig({ endpoint: newClient.getStatus().endpoint });
    }
    console.log('🔄 连接刷新结果:', isConnected ? '✅ 成功' : '❌ 失败');
    return isConnected;
  } catch (error) {
    console.error('❌ 刷新连接失败:', error);
    return false;
  }
};

export const getGraphQLStatus = () => graphqlClient.getStatus();

// 导出REST备用方案
export const sendChatMessageRest = (messages: Message[]) => 
  graphqlClient.sendChatMessageRest(messages);

// 调试信息
console.log('🎯 GraphQL客户端模块已加载');
console.log('📍 默认端点配置:');
console.log('  - GraphQL:', getApiUrl());
console.log('  - Health:', getHealthUrl());
console.log('  - REST:', getRestUrl());
