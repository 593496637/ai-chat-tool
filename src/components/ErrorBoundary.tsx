// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // 这里可以添加错误报告服务
    // reportErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env?.DEV || false;
      
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-header">
              <h1>😵 应用出现错误</h1>
              <p>抱歉，应用遇到了意外错误。请尝试刷新页面或联系技术支持。</p>
            </div>

            <div className="error-actions">
              <button 
                onClick={this.handleReset}
                className="btn btn-primary"
              >
                🔄 重试
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="btn btn-secondary"
              >
                🌐 刷新页面
              </button>
            </div>

            {isDevelopment && (
              <details className="error-details">
                <summary>📋 错误详情（开发模式）</summary>
                <div className="error-stack">
                  <h3>错误信息:</h3>
                  <pre>{this.state.error?.toString()}</pre>
                  
                  <h3>组件堆栈:</h3>
                  <pre>{this.state.errorInfo?.componentStack}</pre>
                  
                  <h3>错误堆栈:</h3>
                  <pre>{this.state.error?.stack}</pre>
                </div>
              </details>
            )}

            <div className="error-tips">
              <h3>💡 常见解决方法</h3>
              <ul>
                <li>检查网络连接是否正常</li>
                <li>清除浏览器缓存和Cookie</li>
                <li>尝试使用隐私/无痕模式</li>
                <li>确保浏览器版本是最新的</li>
                <li>如果问题持续存在，请联系技术支持</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
