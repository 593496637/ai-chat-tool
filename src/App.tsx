
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
          <div className="chat-container">
            <MessageList />
            <MessageInput />
          </div>
        </div>
      </ChatProvider>
    </ErrorBoundary>
  );
}

export default App;
