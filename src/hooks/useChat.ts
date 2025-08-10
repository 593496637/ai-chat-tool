import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Message, AppConfig, ConnectionStatus } from '@/types';
import { sendChatMessage, testGraphQLConnection, getHealthStatus } from '@/services/graphqlClient';

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

    try {
      const messages = [...state.messages, userMessage];
      const graphqlMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      let responseContent: string;

      if (state.config.useGraphQL) {
        try {
          const response = await sendChatMessage(graphqlMessages);
          responseContent = response.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
        } catch (error) {
          console.warn('GraphQL失败，切换到REST:', error);
          dispatch({ type: 'UPDATE_CONFIG', payload: { useGraphQL: false } });
          
          // 使用REST API作为备选
          const restResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: graphqlMessages }),
          });
          
          if (!restResponse.ok) {
            throw new Error(`REST API错误: ${restResponse.status}`);
          }
          
          const restData = await restResponse.json();
          responseContent = restData.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
        }
      } else {
        // 直接使用REST API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: graphqlMessages }),
        });

        if (!response.ok) {
          throw new Error(`REST API错误: ${response.status}`);
        }

        const data = await response.json();
        responseContent = data.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        content: responseContent,
        role: 'assistant',
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });
    } catch (error) {
      console.error('发送消息错误:', error);
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
  }, [state.messages, state.loading, state.config.useGraphQL]);

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const [healthOk, graphqlOk] = await Promise.all([
        getHealthStatus(),
        testGraphQLConnection(),
      ]);

      const status: ConnectionStatus = {
        status: healthOk && graphqlOk ? 'connected' : 'failed',
        endpoint: '', // 这里可以从graphqlClient获取
        lastChecked: new Date(),
        error: !healthOk ? '健康检查失败' : !graphqlOk ? 'GraphQL连接失败' : undefined,
      };

      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
    } catch (error) {
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

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat必须在ChatProvider内部使用');
  }
  return context;
}