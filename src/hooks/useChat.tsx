import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Message } from '../types';
import { sendChatMessage } from '../services/apiClient';

interface ChatState {
  messages: Message[];
  loading: boolean;
  lastError: string;
}

type ChatAction = 
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_MESSAGES' };

const initialState: ChatState = {
  messages: [],
  loading: false,
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
} | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || state.loading) return;

    // 生成唯一ID
    const timestamp = Date.now();
    const userMessage: Message = {
      id: timestamp,
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: '' });

    try {
      const messages = [...state.messages, userMessage];
      const apiMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await sendChatMessage(apiMessages);
      const responseContent = response.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';

      const assistantMessage: Message = {
        id: timestamp + 1,
        content: responseContent,
        role: 'assistant',
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络连接失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      const errorResponse: Message = {
        id: timestamp + 1,
        content: `抱歉，发生了错误：${errorMessage}`,
        role: 'assistant',
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: errorResponse });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.messages, state.loading]);

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const value = {
    state,
    dispatch,
    sendMessage,
    clearChat,
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

// useChat Hook 已加载
