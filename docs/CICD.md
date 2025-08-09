# CI/CD 配置指南

## 🚀 GitHub Actions 自动部署设置

本项目已配置完整的CI/CD流水线，支持自动部署到Cloudflare Workers和Pages。

## 📋 必需的GitHub Secrets

在GitHub仓库设置中添加以下secrets：

### 1. Cloudflare API Token
**名称**: `CLOUDFLARE_API_TOKEN`
**获取方法**:
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "创建令牌"
3. 使用 "自定义令牌" 模板
4. 权限设置：
   - **账户** - Cloudflare Workers:编辑
   - **区域** - Zone:读取
   - **区域** - Page:编辑
5. 账户资源：包含所有账户
6. 区域资源：包含所有区域

### 2. Cloudflare Account ID
**名称**: `CLOUDFLARE_ACCOUNT_ID`
**获取方法**:
1. 在Cloudflare Dashboard右侧栏找到 "账户ID"
2. 复制该ID

### 3. DeepSeek API Key
**名称**: `DEEPSEEK_API_KEY`
**值**: `sk-d8cc6edb8d5f4256b87774c526376e84`

## 🔧 设置步骤

### 1. 添加GitHub Secrets
1. 进入GitHub仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 依次添加上述三个secrets

### 2. 配置Cloudflare Pages项目名
确保你的Cloudflare Pages项目名称是 `ai-chat-tool`，如果不是，请在 `.github/workflows/deploy.yml` 中修改 `projectName`。

## 🔄 CI/CD 流程

### 自动触发条件
- **Push到main分支** - 自动部署到生产环境
- **Pull Request到main** - 运行测试，不部署

### 部署流程
1. **测试阶段** - TypeScript类型检查、构建测试
2. **Workers部署** - 部署后端API
3. **Pages部署** - 部署前端应用
4. **Bundle分析** - 显示构建产物大小

### 部署时间
- **总耗时**: 约3-5分钟
- **Workers部署**: ~1分钟
- **Pages部署**: ~2分钟
- **测试**: ~1分钟

## 📊 监控和日志

### GitHub Actions界面
- 查看部署状态：仓库 → **Actions** 标签
- 实时日志：点击具体的workflow运行

### Cloudflare Dashboard
- **Workers日志**: Cloudflare Dashboard → Workers & Pages → ai-chat-api
- **Pages部署**: Cloudflare Dashboard → Workers & Pages → ai-chat-tool

## 🛠️ 本地开发流程

```bash
# 1. 克隆仓库
git clone https://github.com/593496637/ai-chat-tool.git
cd ai-chat-tool

# 2. 安装依赖
npm install

# 3. 本地开发
npm run dev

# 4. 构建测试
npm run build

# 5. 提交代码（触发自动部署）
git add .
git commit -m "feat: 添加新功能"
git push origin main
```

## 🔍 故障排除

### 常见问题

**1. API Token权限不足**
- 检查Token权限设置
- 确保包含Workers和Pages编辑权限

**2. Account ID错误**
- 重新复制Cloudflare Dashboard中的账户ID
- 确保没有多余的空格

**3. 部署失败**
- 查看GitHub Actions日志
- 检查代码是否有TypeScript错误

**4. Workers路由问题**
- 确保域名配置正确
- 检查wrangler.toml中的路由设置

### 手动部署备选方案

如果CI/CD出现问题，可以手动部署：

```bash
# 部署Workers
wrangler deploy

# 部署Pages（手动上传到Cloudflare Pages）
npm run build
# 然后在Cloudflare Pages控制台上传dist文件夹
```

## 📈 高级功能

### 环境分离
可以配置staging和production环境：

```yaml
# 添加到deploy.yml
- name: Deploy to Staging
  if: github.ref == 'refs/heads/develop'
  # staging部署配置

- name: Deploy to Production  
  if: github.ref == 'refs/heads/main'
  # production部署配置
```

### 部署通知
可以添加Slack/Discord通知：

```yaml
- name: Notify Deployment
  if: success()
  # 发送成功通知
```

## 🎯 最佳实践

1. **分支保护** - 设置main分支保护规则
2. **Code Review** - 通过PR进行代码审查
3. **测试覆盖** - 添加单元测试和E2E测试
4. **版本管理** - 使用语义化版本号
5. **监控告警** - 配置生产环境监控

---

**配置完成后，每次推送代码到main分支都会自动部署！** 🚀