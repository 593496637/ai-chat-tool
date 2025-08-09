import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage, testGraphQLConnection, getHealthStatus, Message as GraphQLMessage } from './graphql';

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
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [lastError, setLastError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 检查连接状态
  const checkConnection = async () => {
    try {
      const health = await getHealthStatus();
      const graphqlTest = await testGraphQLConnection();
      
      if (health && graphqlTest) {
        setConnectionStatus('connected');
        setLastError('');
      } else {
        setConnectionStatus('failed');
        setLastError('无法连接到GraphQL服务');
      }
    } catch (error) {
      setConnectionStatus('failed');
      setLastError(error instanceof Error ? error.message : '连接测试失败');
    }
  };

  // 组件加载时测试连接
  useEffect(() => {
    checkConnection();
  }, []);

  // GraphQL 方式发送消息 - 增强错误处理
  const sendMessageGraphQL = async (messageHistory: Message[]) => {
    const graphqlMessages: GraphQLMessage[] = messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const response = await sendChatMessage(graphqlMessages);
      setLastError(''); // 清除之前的错误
      return response.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
    } catch (error) {
      console.error('GraphQL请求失败:', error);
      setLastError(`GraphQL错误: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // GraphQL 失败时自动切换到 REST
      console.log('GraphQL请求失败，切换到REST API');
      setUseGraphQL(false);
      return await sendMessageREST(messageHistory);
    }
  };

  // REST API 方式发送消息 - 增强错误处理
  const sendMessageREST = async (messageHistory: Message[]) => {
    try {
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
      setLastError(''); // 清除之前的错误
      return data.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
    } catch (error) {
      setLastError(`REST API错误: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
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
    setLastError('');
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

  // 连接状态指示器
  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return <span style={{color: 'green'}}>🟢 已连接</span>;
      case 'failed':
        return <span style={{color: 'red'}}>🔴 连接失败</span>;
      default:
        return <span style={{color: 'orange'}}>🟡 检查中...</span>;
    }
  };

  return (
    <div className="app">
      {/* 头部 */}
      <div className="header">
        <h1>AI 聊天助手</h1>
        <div className="status">
          {getStatusIndicator()}
        </div>
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
          <button onClick={checkConnection}>测试连接</button>
          <button onClick={clearChat}>清空</button>
        </div>
      </div>

      {/* 错误提示 */}
      {lastError && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '10px',
          margin: '10px',
          borderRadius: '4px',
          border: '1px solid #ffcdd2'
        }}>
          ⚠️ {lastError}
        </div>
      )}

      {/* 消息区域 */}
      <div className="messages">
        {messages.length === 0 ? (
          <div className="empty">
            <h2>欢迎使用 AI 聊天助手</h2>
            <p>当前模式: {useGraphQL ? 'GraphQL' : 'REST API'}</p>
            <p>连接状态: {getStatusIndicator()}</p>
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
                <div className="timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message assistant">
            <div className="avatar">AI</div>
            <div className="content">
              正在思考...
              <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                使用 {useGraphQL ? 'GraphQL' : 'REST API'} 模式
              </div>
            </div>
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