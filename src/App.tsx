import React from 'react';
import { ChatProvider } from './hooks/useChat';
import Header from './components/Header';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <ChatProvider>
        <div className="app">
          <Header />
          <MessageList />
          <MessageInput />
        </div>
      </ChatProvider>
    </ErrorBoundary>
  );
}

export default App;
