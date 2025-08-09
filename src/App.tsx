import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // REST API方式发送消息
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      console.log('Sending message...');
      const startTime = Date.now();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      const duration = Date.now() - startTime;
      console.log(`Request completed in ${duration}ms`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      
      const assistantMessage: Message = {
        id: Date.now() + 1,
        content: data.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。',
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        content: '抱歉，发生了错误，请稍后再试。错误详情请查看控制台。',
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

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <div className="header-title">
            <div className="ai-icon">🤖</div>
            <div>
              <h1>AI聊天助手</h1>
              <p className="subtitle">基于 DeepSeek API • 支持 Markdown</p>
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
                  <span>快速响应</span>
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
                  <span className="thinking-text">AI 正在思考中...</span>
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
            输入消息后按 Enter 发送，Shift+Enter 换行
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;