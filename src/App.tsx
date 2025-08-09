import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMarkdown, setUseMarkdown] = useState(true);

  // REST API方式发送消息
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: input,
      role: 'user'
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
        role: 'assistant'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        content: '抱歉，发生了错误，请稍后再试。错误详情请查看控制台。',
        role: 'assistant'
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
    if (e.key === 'Enter') {
      sendMessage();
    }
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
        <h1>AI聊天助手</h1>
        <div className="api-controls">
          <label>
            <input
              type="checkbox"
              checked={useMarkdown}
              onChange={(e) => setUseMarkdown(e.target.checked)}
            />
            Markdown渲染
          </label>
          <button onClick={clearChat} className="test-btn clear-btn">
            清空对话
          </button>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-content">
              <h3>👋 欢迎使用AI聊天助手</h3>
              <p>基于DeepSeek API</p>
              <p>支持Markdown格式渲染</p>
              <p>请输入您的问题开始对话...</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-content">
                {renderMessageContent(message)}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message assistant">
            <div className="message-content loading">
              正在思考中...
            </div>
          </div>
        )}
      </div>
      
      <div className="chat-input">
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;