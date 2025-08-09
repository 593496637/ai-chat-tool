# AI聊天工具 (支持GraphQL + Markdown渲染)

简单的React+TypeScript聊天界面，支持GraphQL和REST API两种方式调用DeepSeek API，并支持Markdown格式渲染。

## ✨ 功能特色

- ✅ **React + TypeScript** - 现代化前端技术栈
- ✅ **GraphQL + REST API** - 双API支持，可切换使用
- ✅ **Markdown渲染** - 支持富文本格式显示
- ✅ **DeepSeek AI** - 集成DeepSeek聊天模型
- ✅ **Cloudflare部署** - Workers + Pages无服务器架构
- ✅ **实时切换** - 界面可实时切换API方式和渲染模式
- ✅ **响应式设计** - 完美适配桌面和移动端

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

## 🚀 API支持

### GraphQL API
- 端点：`/api/graphql`
- 支持查询：`hello` - 测试连接
- 支持变更：`chat` - AI对话

### REST API  
- 端点：`/api/chat`
- 传统REST接口，兼容原有调用方式

## 📦 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 🌐 在线访问

**网站地址**: https://bestvip.life

## 🔧 部署步骤

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
├── src/
│   ├── App.tsx          # 主聊天组件（GraphQL+REST+Markdown）
│   ├── graphql.ts       # GraphQL客户端工具
│   ├── main.tsx         # React应用入口
│   └── index.css        # 样式文件（包含Markdown样式）
├── worker.js            # Cloudflare Workers（GraphQL+REST服务）
├── wrangler.toml        # Workers配置
├── package.json         # 项目依赖
└── README.md           # 项目文档
```

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **Markdown**: react-markdown + remark-gfm
- **API**: GraphQL + REST API
- **AI模型**: DeepSeek Chat
- **部署**: Cloudflare Workers + Pages
- **域名**: bestvip.life

## 🎯 特色体验

1. **智能对话** - 与DeepSeek AI进行自然语言交流
2. **格式渲染** - AI回复的Markdown内容自动渲染
3. **双API模式** - 可切换GraphQL/REST方式
4. **实时预览** - 开关Markdown渲染看效果
5. **清爽界面** - 简洁现代的聊天体验

---

**立即体验**: https://bestvip.life