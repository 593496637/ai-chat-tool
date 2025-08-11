# AI聊天工具 v2.1 (优化版本)

![Deploy Status](https://github.com/593496637/ai-chat-tool/workflows/Deploy%20to%20Cloudflare/badge.svg)
![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-blue.svg)

基于React + TypeScript的现代化AI聊天应用，使用GraphQL API，支持环境变量配置，代码精简易懂。

## 🚀 v2.1 最新特性

### 🎯 核心功能
- ✅ **智能对话** - 基于DeepSeek AI的智能聊天
- ✅ **GraphQL API** - 现代化的API查询语言
- ✅ **环境变量配置** - 灵活的多环境配置支持
- ✅ **Markdown支持** - 富文本格式渲染
- ✅ **错误处理** - 智能的错误处理和重试机制
- ✅ **响应式设计** - 适配各种屏幕尺寸
- ✅ **TypeScript** - 完整的类型安全

### 🔧 技术优化
- ⚡ **精简代码** - 移除冗余逻辑，保持核心功能
- 🏗️ **清晰架构** - 易于理解和维护的代码结构
- 📦 **环境配置** - 支持开发、测试、生产多环境
- 🎨 **组件优化** - 精简的React组件设计

## 🌐 在线访问

**网站地址**: https://sunnyday.pw

## 📁 项目结构

```
ai-chat-tool/
├── .github/workflows/       # GitHub Actions CI/CD配置
├── src/
│   ├── components/          # React组件
│   │   ├── Header.tsx       # 头部组件
│   │   ├── MessageList.tsx  # 消息列表（含欢迎信息）
│   │   ├── ChatMessage.tsx  # 单条消息组件
│   │   ├── MessageInput.tsx # 输入组件
│   │   └── ErrorBoundary.tsx # 错误边界
│   ├── hooks/
│   │   └── useChat.tsx      # 聊天状态管理Hook
│   ├── services/
│   │   └── apiClient.ts     # GraphQL API客户端
│   ├── types/
│   │   └── index.ts         # TypeScript类型定义
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 应用入口
│   ├── vite-env.d.ts        # Vite环境变量类型声明
│   └── index.css            # 样式文件
├── .env.example             # 环境变量配置示例
├── worker.js                # Cloudflare Workers API（GraphQL + REST）
├── wrangler.toml            # Workers配置
├── package.json             # 项目依赖
├── tsconfig.json            # TypeScript配置
├── vite.config.ts           # Vite构建配置
└── README.md               # 项目文档
```

## 🛠️ 技术栈

### 前端技术
- **React 18.3.1** - 现代化UI框架
- **TypeScript 5.5.3** - 类型安全的JavaScript
- **Vite 5.3.4** - 快速构建工具
- **React Markdown** - Markdown渲染
- **Remark GFM** - GitHub风格Markdown支持

### 后端技术
- **Cloudflare Workers** - 无服务器运行时
- **GraphQL API** - 现代化的查询语言
- **REST API** - 备用HTTP API接口
- **DeepSeek AI** - 智能对话模型

### 开发工具
- **TypeScript** - 类型检查和开发支持
- **GitHub Actions** - CI/CD自动化

## 📦 本地开发

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/593496637/ai-chat-tool.git
cd ai-chat-tool

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置你的API端点

# 启动开发服务器
npm run dev

# 构建项目
npm run build

# 预览构建结果
npm run preview
```



## 🚀 部署指南

### 自动部署（推荐）

项目配置了GitHub Actions自动部署：

1. **推送代码到main分支**自动触发部署
2. **Workers API**自动部署到Cloudflare
3. **前端应用**自动部署到Cloudflare Pages
4. **构建状态**实时显示在README徽章中

### 手动部署

#### 1. 部署Cloudflare Workers

```bash
# 安装Wrangler CLI
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 设置环境变量
wrangler secret put DEEPSEEK_API_KEY
# 输入您的DeepSeek API密钥

# 部署Workers
wrangler deploy
```

#### 2. 部署到Cloudflare Pages

1. 在Cloudflare面板中创建Pages项目
2. 连接GitHub仓库
3. 设置构建命令：`npm run build`
4. 设置输出目录：`dist`
5. 部署完成

## 🔧 配置说明

### 前端环境变量

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
# GraphQL API 端点
VITE_GRAPHQL_ENDPOINT=http://localhost:8787/api/graphql

# API 请求超时时间 (毫秒)
VITE_API_TIMEOUT=30000

# 是否启用调试日志
VITE_DEBUG=true
```

### 后端环境变量

```bash
# Cloudflare Workers环境变量
DEEPSEEK_API_KEY=your_deepseek_api_key
ENVIRONMENT=production
```

### 不同环境配置

- **开发环境**: 使用 `.env` 文件
- **生产环境**: 使用 `.env.production` 或部署时环境变量
- **本地个人配置**: 使用 `.env.local` (会被git忽略)

## 📊 API使用示例

### GraphQL API

```graphql
# 聊天 Mutation
mutation chat($input: ChatInput!) {
  chat(input: $input) {
    choices {
      message {
        role
        content
      }
    }
  }
}

# 变量
{
  "input": {
    "messages": [
      { "role": "user", "content": "请用Markdown格式介绍React" }
    ]
  }
}
```

### REST API (备用)

```javascript
// POST /api/chat
{
  "messages": [
    { "role": "user", "content": "请用Markdown格式介绍React" }
  ]
}

// 响应格式
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "React是一个用于构建用户界面的JavaScript库..."
      }
    }
  ]
}
```

## 🔍 故障排除

### 常见问题

1. **API连接失败**
   - 检查网络连接
   - 验证API端点配置
   - 查看浏览器控制台错误

2. **构建失败**
   - 确保Node.js版本 >= 18
   - 清除node_modules重新安装
   - 检查TypeScript错误

3. **部署问题**
   - 验证环境变量设置
   - 检查Cloudflare配置
   - 查看GitHub Actions日志

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. **Fork项目**
2. **创建特性分支** (`git checkout -b feature/amazing-feature`)
3. **提交更改** (`git commit -m 'Add amazing feature'`)
4. **推送分支** (`git push origin feature/amazing-feature`)
5. **创建Pull Request**

### 代码规范

- 使用TypeScript严格模式
- 遵循ESLint规则
- 编写单元测试
- 更新相关文档

## 📝 更新日志

### v2.1.0 (2025-01-XX) - 代码优化
- 🔧 **环境变量配置**: 支持灵活的多环境配置
- ⚡ **代码精简**: 优化组件逻辑，移除冗余代码
- 🎯 **GraphQL优化**: 精简的GraphQL客户端实现
- 🏗️ **架构清晰**: 更容易理解和维护的代码结构
- 📝 **文档更新**: 反映最新的技术架构
- 🐛 **错误处理**: 改进的错误处理和用户体验

### v2.0.1 (2025-08-11)
- 🌐 **域名迁移**: 从 bestvip.life 迁移到 sunnyday.pw
- 🔧 **修复路由**: 添加完整域名路由支持
- 📝 **文档更新**: 更新所有文档和示例

### v2.0.0 (2025-01-XX)
- 🏗️ 完全重构项目架构
- 🔧 修复GraphQL Schema不一致问题
- ⚡ 升级所有依赖到最新版本
- 🎨 改进UI设计和用户体验

### v1.0.0 (2024-XX-XX)
- 🎉 初始版本发布
- ✅ 基础聊天功能
- ✅ Markdown渲染
- ✅ Cloudflare部署

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [DeepSeek](https://deepseek.com/) - 提供AI模型支持
- [Cloudflare](https://cloudflare.com/) - 提供边缘计算平台
- [React](https://reactjs.org/) - 优秀的UI框架
- [TypeScript](https://typescriptlang.org/) - 类型安全的JavaScript
- [Vite](https://vitejs.dev/) - 快速的构建工具

---

**🎉 立即体验**: https://sunnyday.pw

**📧 问题反馈**: 通过GitHub Issues提交

**⭐ 如果这个项目对你有帮助，请给个Star支持！**