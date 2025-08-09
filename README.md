# AI聊天工具 (支持GraphQL + Markdown渲染 + CI/CD)

![Deploy Status](https://github.com/593496637/ai-chat-tool/workflows/Deploy%20to%20Cloudflare/badge.svg)

简单的React+TypeScript聊天界面，支持GraphQL和REST API两种方式调用DeepSeek API，支持Markdown格式渲染，配备完整的CI/CD自动部署流水线。

## ✨ 功能特色

- ✅ **React + TypeScript** - 现代化前端技术栈
- ✅ **GraphQL + REST API** - 双API支持，可切换使用
- ✅ **Markdown渲染** - 支持富文本格式显示
- ✅ **DeepSeek AI** - 集成DeepSeek聊天模型
- ✅ **Cloudflare部署** - Workers + Pages无服务器架构
- ✅ **实时切换** - 界面可实时切换API方式和渲染模式
- ✅ **响应式设计** - 完美适配桌面和移动端
- ✅ **CI/CD自动部署** - GitHub Actions自动化流水线 🚀
- ✅ **性能优化** - 15秒超时控制，响应时间监控

## 🚀 CI/CD 自动部署

### 部署流程
每次推送到main分支会自动触发：
1. **代码检查** - TypeScript类型检查
2. **构建测试** - 确保代码可正常构建
3. **Workers部署** - 自动部署后端API
4. **Pages部署** - 自动部署前端应用
5. **Bundle分析** - 显示构建产物大小

### 部署状态
- 🔄 **自动部署**: 推送代码即部署
- ⏱️ **部署时间**: 约3-5分钟
- 📊 **实时监控**: GitHub Actions界面查看

**配置说明**: 查看 [CI/CD配置指南](./docs/CICD.md)

## 🎨 界面功能

### 控制选项
- **使用GraphQL** - 切换GraphQL/REST API模式
- **Markdown渲染** - 开启/关闭Markdown格式渲染
- **测试GraphQL** - 测试GraphQL连接
- **清空对话** - 清除所有聊天记录

### Markdown支持
支持以下Markdown格式：
- **粗体文本** 和 *斜体文本*
- # 标题 (H1-H6)
- - 无序列表
- 1. 有序列表
- `行内代码`
- ```代码块```
- > 引用块
- 表格
- 链接
- ✅ Emoji 表情

## 🌐 在线访问

**网站地址**: https://bestvip.life

## 📦 本地开发

```bash
# 克隆仓库
git clone https://github.com/593496637/ai-chat-tool.git
cd ai-chat-tool

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build
```

## 🔧 手动部署（可选）

如果需要手动部署：

### 1. 部署Cloudflare Workers
```bash
# 安装Wrangler CLI
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 设置DeepSeek API密钥
wrangler secret put DEEPSEEK_API_KEY
# 输入: sk-d8cc6edb8d5f4256b87774c526376e84

# 部署Workers
wrangler deploy
```

### 2. 部署到Cloudflare Pages
通过GitHub集成自动部署，或手动上传dist文件夹。

## 🚀 API支持

### GraphQL API
- 端点：`/api/graphql`
- 支持查询：`hello` - 测试连接
- 支持变更：`chat` - AI对话

### REST API  
- 端点：`/api/chat`
- 传统REST接口，兼容原有调用方式

## 📊 GraphQL Schema

```graphql
type Query {
  hello: String
}

type Mutation {
  chat(input: ChatInput!): ChatResponse!
}

input ChatInput {
  messages: [MessageInput!]!
}

input MessageInput {
  role: String!
  content: String!
}

type ChatResponse {
  choices: [Choice!]!
}

type Choice {
  message: Message!
}

type Message {
  role: String!
  content: String!
}
```

## 💡 使用示例

### GraphQL查询示例
```javascript
// 测试连接
query {
  hello
}

// AI对话
mutation {
  chat(input: {
    messages: [
      { role: "user", content: "请用Markdown格式介绍React" }
    ]
  }) {
    choices {
      message {
        role
        content
      }
    }
  }
}
```

### REST API示例
```javascript
// POST /api/chat
{
  "messages": [
    { "role": "user", "content": "请用Markdown格式介绍GraphQL" }
  ]
}
```

## 📁 项目结构

```
ai-chat-tool/
├── .github/workflows/       # GitHub Actions CI/CD配置
│   └── deploy.yml
├── docs/                    # 项目文档
│   └── CICD.md             # CI/CD配置指南
├── src/
│   ├── App.tsx             # 主聊天组件（GraphQL+REST+Markdown）
│   ├── graphql.ts          # GraphQL客户端工具
│   ├── main.tsx            # React应用入口
│   └── index.css           # 样式文件（包含Markdown样式）
├── worker.js               # Cloudflare Workers（GraphQL+REST服务）
├── wrangler.toml           # Workers配置
├── package.json            # 项目依赖
└── README.md              # 项目文档
```

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **Markdown**: react-markdown + remark-gfm
- **API**: GraphQL + REST API
- **AI模型**: DeepSeek Chat
- **部署**: Cloudflare Workers + Pages
- **CI/CD**: GitHub Actions
- **域名**: bestvip.life

## ⚡ 性能优化

- **15秒超时控制** - 避免长时间等待
- **响应时间监控** - 实时记录API耗时
- **错误处理优化** - 用户友好的错误提示
- **Bundle优化** - 自动分析构建产物大小

## 🎯 开发流程

1. **Fork仓库** → **开发功能** → **提交PR** → **自动测试** → **合并部署**
2. **本地测试** → **推送main分支** → **自动部署** → **生产验证**

## 🔍 监控和日志

- **GitHub Actions**: 查看部署状态和日志
- **Cloudflare Dashboard**: 实时监控API性能
- **浏览器控制台**: 查看前端性能数据

---

**立即体验**: https://bestvip.life

**CI/CD配置**: [查看详细指南](./docs/CICD.md)

**🎉 CI/CD已启用！每次推送代码都会自动部署！**