import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage, Message as GraphQLMessage } from './graphql';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    try {
      const response = await sendChatMessage(graphqlMessages);
      return response.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
    } catch (error) {
      // GraphQL 失败时自动切换到 REST
      console.log('GraphQL请求失败，切换到REST API');
      setUseGraphQL(false);
      return await sendMessageREST(messageHistory);
    }
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

  // 发送消息
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
      let responseContent: string;
      
      if (useGraphQL) {
        responseContent = await sendMessageGraphQL(newMessages);
      } else {
        responseContent = await sendMessageREST(newMessages);
      }
      
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
        content: `发生错误：${error instanceof Error ? error.message : '未知错误'}`,
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

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    if (message.role === 'assistant' && useMarkdown) {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      );
    }
    return <div>{message.content}</div>;
  };

  return (
    <div className="app">
      {/* 头部 */}
      <div className="header">
        <h1>AI 聊天助手</h1>
        <div className="controls">
          <label>
            <input
              type="checkbox"
              checked={useMarkdown}
              onChange={(e) => setUseMarkdown(e.target.checked)}
            />
            Markdown
          </label>
          <label>
            <input
              type="checkbox"
              checked={useGraphQL}
              onChange={(e) => setUseGraphQL(e.target.checked)}
            />
            GraphQL
          </label>
          <button onClick={clearChat}>清空</button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="messages">
        {messages.length === 0 ? (
          <div className="empty">
            <h2>欢迎使用 AI 聊天助手</h2>
            <p>当前模式: {useGraphQL ? 'GraphQL' : 'REST API'}</p>
            <p>请输入您的问题开始对话</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="avatar">
                {message.role === 'user' ? '用户' : 'AI'}
              </div>
              <div className="content">
                {renderMessageContent(message)}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message assistant">
            <div className="avatar">AI</div>
            <div className="content">正在思考...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          disabled={loading}
        />
        <button 
          onClick={sendMessage} 
          disabled={!input.trim() || loading}
        >
          发送
        </button>
      </div>
    </div>
  );
}

export default App;