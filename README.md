# AI聊天工具 (支持GraphQL)

简单的React+TypeScript聊天界面，支持GraphQL和REST API两种方式调用DeepSeek API。

## 功能特色

- ✅ **React + TypeScript** - 现代化前端技术栈
- ✅ **GraphQL + REST API** - 双API支持，可切换使用
- ✅ **DeepSeek AI** - 集成DeepSeek聊天模型
- ✅ **Cloudflare部署** - Workers + Pages无服务器架构
- ✅ **实时切换** - 界面可实时切换API方式

## API支持

### GraphQL API
- 端点：`/api/graphql`
- 支持查询：`hello` - 测试连接
- 支持变更：`chat` - AI对话

### REST API  
- 端点：`/api/chat`
- 传统REST接口，兼容原有调用方式

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 部署步骤

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
1. 在Cloudflare Dashboard中创建Pages项目
2. 连接GitHub仓库: `593496637/ai-chat-tool`
3. 构建配置:
   - Framework: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
4. 设置自定义域名: `bestvip.life`

## GraphQL Schema

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

## 使用示例

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
      { role: "user", content: "你好" }
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
    { "role": "user", "content": "你好" }
  ]
}
```

## 项目结构

```
ai-chat-tool/
├── src/
│   ├── App.tsx          # 主聊天组件（支持GraphQL+REST）
│   ├── graphql.ts       # GraphQL客户端工具
│   ├── main.tsx         # React应用入口
│   └── index.css        # 样式文件
├── worker.js            # Cloudflare Workers（GraphQL+REST服务）
├── wrangler.toml        # Workers配置
├── package.json         # 项目依赖
└── README.md           # 项目文档
```

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **API**: GraphQL + REST API
- **AI模型**: DeepSeek Chat
- **部署**: Cloudflare Workers + Pages
- **域名**: bestvip.life