<div align="center">
  <img src="./static/logo.svg" alt="Magic Cube Logo" width="200" height="200">
  
  # Magic Cube App
  
  **🎯 让 Elasticsearch 操作更轻松的智能助手**
  
  *基于本地 Ollama AI，为 Elasticsearch 用户提供直观、智能的数据操作体验*
</div>  

## 🌟 为什么选择 Magic Cube？

**传统 Elasticsearch 操作的痛点：**
- 复杂的 DSL 查询语法难以掌握
- 命令行操作不够直观
- 数据分析结果难以可视化
- 缺乏智能化的操作建议

**Magic Cube 的解决方案：**
- 🤖 **AI 智能助手**: 基于本地 Ollama，用自然语言描述需求，自动生成 ES 查询
- 🎯 **简化操作流程**: 将复杂的 Elasticsearch 操作转化为简单的对话
- 🔒 **本地化部署**: 数据不出本地，保障安全性
- ⚡ **即时响应**: 本地 AI 模型，无需网络依赖

## ✨ 核心特性

- 🤖 **智能查询生成**: 通过自然语言对话，自动生成 Elasticsearch DSL 查询
- 🔍 **多集群管理**: 轻松连接和切换多个 Elasticsearch 集群
- 📈 **数据可视化**: 查询结果自动转换为表格等可视化形式
- 💬 **对话式操作**: 像聊天一样操作 Elasticsearch，降低学习成本
- 🛡️ **本地 AI**: 基于 Ollama 的完全本地化 AI，保护数据隐私
- 💻 **跨平台支持**: 支持 Windows、macOS、Linux 桌面环境
- 🎨 **现代化界面**: 基于 React + Tailwind CSS 的美观界面

## 🚀 快速开始

### 环境要求

- Node.js 22+
- npm
- Ollama（用于本地 AI 功能）
- Elasticsearch（用于搜索功能）

### 安装

1. 克隆项目
```bash
git clone https://github.com/your-username/magic-cube-app.git
cd magic-cube-app
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 启动 Electron 应用
```bash
npm run dev:electron
```

### 构建

```bash
# 构建 Web 版本
npm run build:web

# 构建 Electron 应用
npm run build

# 仅打包（不构建安装包）
npm run electron:pack
```

## 📖 使用指南

### 🚀 首次使用

1. **安装 Ollama**
   ```bash
   # macOS
   brew install ollama
   
   # 启动 Ollama 服务
   ollama serve
   
   # 下载推荐模型（如 qwen3:14b 或 deepseek-r1:14b）
   ollama pull qwen3:14b
   ```

2. **配置 Elasticsearch 连接**
   - 打开应用，点击「集群配置」
   - 输入 Elasticsearch 地址（如：http://localhost:9200）
   - 配置认证信息（如需要）
   - 测试连接

### 💬 智能对话操作

**示例对话：**

```
用户："查询最近7天的错误日志"
AI：我来帮你生成查询语句...

生成的查询：
{
  "query": {
    "bool": {
      "must": [
        {"match": {"level": "error"}},
        {"range": {"@timestamp": {"gte": "now-7d"}}}
      ]
    }
  }
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 作者

- **xiaobeicn** - *初始开发* - [GitHub](https://github.com/xiaobeicn)

## 🙏 致谢

- [Ollama](https://ollama.ai/) - 本地 AI 模型运行时
- [Elasticsearch](https://www.elastic.co/) - 搜索和分析引擎
- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Radix UI](https://www.radix-ui.com/) - 无障碍 UI 组件
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

