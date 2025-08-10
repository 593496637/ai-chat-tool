// src/components/MessageInput.tsx
import React, { useState, useRef, useCallback } from 'react';
import { useChat } from '../hooks/useChat';

const MessageInput: React.FC = () => {
  const { state, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = !input.trim() || state.loading;

  // 自动调整textarea高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (isDisabled) return;

    const messageContent = input.trim();
    setInput('');
    
    // 重置textarea高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(messageContent);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 延迟调整高度，确保粘贴内容已插入
    setTimeout(adjustTextareaHeight, 0);
  };

  return (
    <div className="input-area">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          disabled={state.loading}
          className="message-textarea"
          rows={1}
          style={{
            resize: 'none',
            overflow: 'hidden',
            minHeight: '40px',
            maxHeight: '120px'
          }}
        />
        
        <button 
          onClick={handleSend}
          disabled={isDisabled}
          className={`send-button ${isDisabled ? 'disabled' : ''}`}
          title={isDisabled ? '请输入消息' : '发送消息'}
        >
          {state.loading ? (
            <>
              <span className="loading-spinner"></span>
              发送中...
            </>
          ) : (
            <>
              <span>📤</span>
              发送
            </>
          )}
        </button>
      </div>
      
      <div className="input-hints">
        <span className="hint">
          💡 支持Markdown格式 | 当前模式: {state.config.useGraphQL ? 'GraphQL' : 'REST API'}
        </span>
      </div>
    </div>
  );
};

export default React.memo(MessageInput);
