import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Message, AppConfig, ConnectionStatus } from '../types';
import { sendChatMessage, testGraphQLConnection, getHealthStatus } from '../services/graphqlClient';

interface ChatState {
  messages: Message[];
  loading: boolean;
  config: AppConfig;
  connectionStatus: ConnectionStatus;
  lastError: string;
}

type ChatAction = 
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_CONFIG'; payload: Partial<AppConfig> }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_MESSAGES' };

const initialState: ChatState = {
  messages: [],
  loading: false,
  config: {
    useMarkdown: true,
    useGraphQL: true,
    maxRetries: 3,
    retryDelay: 1000,
  },
  connectionStatus: {
    status: 'unknown',
    endpoint: '',
  },
  lastError: '',
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'UPDATE_CONFIG':
      return {
        ...state,
        config: { ...state.config, ...action.payload },
      };
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        lastError: action.payload,
      };
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
        lastError: '',
      };
    default:
      return state;
  }
}

const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  checkConnection: () => Promise<void>;
} | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || state.loading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: '' });

    console.log('开始发送消息，GraphQL Only模式:', {
      messageCount: state.messages.length + 1
    });

    try {
      const messages = [...state.messages, userMessage];
      const graphqlMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // 强制只使用 GraphQL
      console.log('使用GraphQL发送消息...');
      const response = await sendChatMessage(graphqlMessages);
      const responseContent = response.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
      console.log('GraphQL消息发送成功');

      const assistantMessage: Message = {
        id: Date.now() + 1,
        content: responseContent,
        role: 'assistant',
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });
      
      console.log('GraphQL消息发送完成', {
        responseLength: responseContent.length
      });

    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      const errorResponse: Message = {
        id: Date.now() + 1,
        content: `发生错误：${errorMessage}`,
        role: 'assistant',
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: errorResponse });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.messages, state.loading]);

  const clearChat = useCallback(() => {
    console.log('清空聊天记录');
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const checkConnection = useCallback(async () => {
    console.log('开始检查连接状态...');
    
    try {
      const [healthOk, graphqlOk] = await Promise.all([
        getHealthStatus(),
        testGraphQLConnection(),
      ]);

      console.log('连接检查结果:', {
        health: healthOk ? 'OK' : 'FAIL',
        graphql: graphqlOk ? 'OK' : 'FAIL'
      });

      const status: ConnectionStatus = {
        status: healthOk && graphqlOk ? 'connected' : 'failed',
        endpoint: '',
        lastChecked: new Date(),
        error: !healthOk ? '健康检查失败' : !graphqlOk ? 'GraphQL连接失败' : undefined,
      };

      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
    } catch (error) {
      console.error('连接检查异常:', error);
      
      const status: ConnectionStatus = {
        status: 'failed',
        endpoint: '',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : '连接检查失败',
      };

      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
    }
  }, []);

  const value = {
    state,
    dispatch,
    sendMessage,
    clearChat,
    checkConnection,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat必须在ChatProvider内部使用');
  }
  return context;
}

// 导出调试信息
console.log('useChat Hook已加载，默认配置:');
console.log('  - useGraphQL: true (强制优先使用)');
console.log('  - useMarkdown: true');
console.log('  - maxRetries: 3');
