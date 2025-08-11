// src/components/ChatMessage.tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "../types";

interface ChatMessageProps {
  message: Message;
  useMarkdown: boolean;
}

/**
 * 格式化时间显示
 * @param date 要格式化的日期
 * @returns 格式化后的时间字符串 (HH:MM)
 */
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Markdown 渲染组件配置
 */
const markdownComponents = {
  // 代码块渲染配置
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !className;
    
    if (isInline) {
      return (
        <code className="inline-code" {...props}>
          {children}
        </code>
      );
    }
    
    return (
      <div className="code-block-wrapper">
        <pre className={`code-block ${match ? `language-${match[1]}` : ""}`}>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  
  // 链接渲染配置
  a({ children, href, ...props }: any) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="markdown-link"
        {...props}
      >
        {children}
      </a>
    );
  },
  
  // 表格渲染配置
  table({ children, ...props }: any) {
    return (
      <div className="table-wrapper">
        <table className="markdown-table" {...props}>
          {children}
        </table>
      </div>
    );
  },
  
  // 标题渲染配置
  h1: ({ children, ...props }: any) => (
    <h1 className="markdown-h1" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="markdown-h2" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="markdown-h3" {...props}>{children}</h3>
  ),
  
  // 段落渲染配置
  p: ({ children, ...props }: any) => (
    <p className="markdown-paragraph" {...props}>{children}</p>
  ),
  
  // 列表渲染配置
  ul: ({ children, ...props }: any) => (
    <ul className="markdown-list" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="markdown-ordered-list" {...props}>{children}</ol>
  ),
};

/**
 * 渲染消息内容
 * @param message 消息对象
 * @param useMarkdown 是否使用 Markdown 渲染
 * @returns 渲染的内容元素
 */
const renderMessageContent = (message: Message, useMarkdown: boolean): React.ReactElement => {
  if (message.role === "assistant" && useMarkdown) {
    return (
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="text-content">
      {message.content}
    </div>
  );
};

/**
 * 获取用户角色的显示文本
 * @param role 用户角色
 * @returns 角色显示文本
 */
const getRoleText = (role: Message["role"]): string => {
  return role === "assistant" ? "AI助手" : "用户";
};

/**
 * 获取用户头像图标
 * @param role 用户角色
 * @returns 头像图标
 */
const getAvatarIcon = (role: Message["role"]): string => {
  return role === "user" ? "👤" : "🤖";
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, useMarkdown }) => {
  return (
    <div className={`message ${message.role}`}>
      {/* 用户头像 */}
      <div className="message-avatar" title={getRoleText(message.role)}>
        {getAvatarIcon(message.role)}
      </div>

      {/* 消息内容区域 */}
      <div className="message-content">
        {/* 消息主体 */}
        <div className="message-body">
          {renderMessageContent(message, useMarkdown)}
        </div>

        {/* 消息元信息 */}
        <div className="message-meta">
          <span className="message-time" title={message.timestamp.toLocaleString("zh-CN")}>
            {formatTime(message.timestamp)}
          </span>
          
          {message.role === "assistant" && (
            <span className="message-role">{getRoleText(message.role)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
