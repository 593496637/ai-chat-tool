import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage, testGraphQLConnection, Message as GraphQLMessage } from './graphql';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMarkdown, setUseMarkdown] = useState(true);
  const [useGraphQL, setUseGraphQL] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 测试 GraphQL 连接
  useEffect(() => {
    const testConnection = async () => {
      try {
        const isConnected = await testGraphQLConnection();
        setConnectionStatus(isConnected ? 'connected' : 'error');
      } catch (error) {
        console.error('Connection test failed:', error);
        setConnectionStatus('error');
      }
    };

    if (useGraphQL) {
      testConnection();
    }
  }, [useGraphQL]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // GraphQL 方式发送消息
  const sendMessageGraphQL = async (messageHistory: Message[]) => {
    const graphqlMessages: GraphQLMessage[] = messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await sendChatMessage(graphqlMessages);
    return response.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
  };

  // REST API 方式发送消息
  const sendMessageREST = async (messageHistory: Message[]) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messageHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
  };

  // 统一的发送消息方法
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      console.log(`Sending message via ${useGraphQL ? 'GraphQL' : 'REST API'}...`);
      const startTime = Date.now();

      let responseContent: string;
      
      if (useGraphQL) {
        responseContent = await sendMessageGraphQL(newMessages);
      } else {
        responseContent = await sendMessageREST(newMessages);
      }

      const duration = Date.now() - startTime;
      console.log(`Request completed in ${duration}ms`);
      
      const assistantMessage: Message = {
        id: Date.now() + 1,
        content: responseContent,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        content: `抱歉，发生了错误：${error instanceof Error ? error.message : '未知错误'}。请稍后再试。`,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    if (message.role === 'assistant' && useMarkdown) {
      return (
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          className="markdown-content"
        >
          {message.content}
        </ReactMarkdown>
      );
    }
    return <span className="text-content">{message.content}</span>;
  };

  // 获取连接状态显示
  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'error': return '🔴';
      default: return '🟡';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'GraphQL已连接';
      case 'error': return 'GraphQL连接失败';
      default: return '检查连接中...';
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <div className="header-title">
            <div className="ai-icon">🤖</div>
            <div>
              <h1>AI聊天助手</h1>
              <p className="subtitle">
                基于 DeepSeek API • 支持 {useGraphQL ? 'GraphQL' : 'REST'} 
                {useGraphQL && (
                  <span className="connection-status">
                    {getConnectionStatusIcon()} {getConnectionStatusText()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="header-controls">
            <label className="switch">
              <input
                type="checkbox"
                checked={useMarkdown}
                onChange={(e) => setUseMarkdown(e.target.checked)}
              />
              <span className="slider">
                <span className="slider-text">
                  {useMarkdown ? 'MD' : 'TXT'}
                </span>
              </span>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={useGraphQL}
                onChange={(e) => setUseGraphQL(e.target.checked)}
              />
              <span className="slider">
                <span className="slider-text">
                  {useGraphQL ? 'GQL' : 'REST'}
                </span>
              </span>
            </label>
            <button onClick={clearChat} className="clear-btn" title="清空对话">
              🗑️
            </button>
          </div>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-content">
              <div className="welcome-animation">
                <div className="ai-avatar">🤖</div>
                <div className="sparkles">✨</div>
              </div>
              <h3>欢迎使用 AI 聊天助手</h3>
              <div className="features">
                <div className="feature">
                  <span className="feature-icon">💬</span>
                  <span>智能对话</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">📝</span>
                  <span>Markdown 支持</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">⚡</span>
                  <span>{useGraphQL ? 'GraphQL' : 'REST'} API</span>
                </div>
              </div>
              <p className="start-hint">输入您的问题开始智能对话...</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message-wrapper ${message.role}`}>
              <div className="message">
                <div className="message-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-bubble">
                  <div className="message-content">
                    {renderMessageContent(message)}
                  </div>
                  <div className="message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message-wrapper assistant">
            <div className="message">
              <div className="message-avatar">🤖</div>
              <div className="message-bubble loading-bubble">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="thinking-text">
                    AI 正在通过 {useGraphQL ? 'GraphQL' : 'REST API'} 思考中...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input">
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题... (Shift+Enter 换行)"
              disabled={loading}
              rows={1}
              className="message-input"
            />
            <button 
              onClick={sendMessage} 
              disabled={!input.trim() || loading}
              className={`send-btn ${input.trim() && !loading ? 'active' : ''}`}
              title="发送消息"
            >
              {loading ? '⏳' : '🚀'}
            </button>
          </div>
          <div className="input-hint">
            当前使用: {useGraphQL ? 'GraphQL' : 'REST API'} • 输入消息后按 Enter 发送，Shift+Enter 换行
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;