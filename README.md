<div align="center">
  <img src="./static/logo.svg" alt="Magic Cube Logo" width="200" height="200">
  
  # Magic Cube App
  
  **🎯 一款基于本地 AI（Ollama）与 Elasticsearch 的智能开发辅助工具**
</div>  

## ✨ 特性

- 🤖 **本地 AI 集成**: 基于 Ollama 的本地大语言模型支持
- 🔍 **Elasticsearch 集成**: 强大的搜索和数据分析能力
- 💻 **跨平台桌面应用**: 基于 Electron 构建，支持 Windows、macOS、Linux
- ⚡ **现代化界面**: 使用 React + TypeScript + Tailwind CSS 构建
- 🎨 **美观的 UI**: 基于 Radix UI 组件库的现代化设计
- 🌙 **主题支持**: 内置明暗主题切换
- 📊 **数据可视化**: 集成图表和数据展示组件

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
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

## 📖 使用说明

### AI 聊天功能

1. 确保 Ollama 已安装并运行
2. 在应用中选择合适的 AI 模型
3. 开始与 AI 进行对话

### Elasticsearch 集成

1. 配置 Elasticsearch 连接信息
2. 选择要操作的集群和索引
3. 使用搜索和分析功能

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **桌面应用**: Electron
- **样式**: Tailwind CSS
- **UI 组件**: Radix UI
- **状态管理**: Zustand
- **构建工具**: Vite
- **代码规范**: ESLint + Prettier

## 📁 项目结构

```
magic-cube-app/
├── electron/           # Electron 主进程代码
│   ├── main.ts        # 主进程入口
│   ├── preload.ts     # 预加载脚本
│   └── utils.ts       # 工具函数
├── src/               # 渲染进程代码
│   ├── components/    # React 组件
│   │   ├── layout/    # 布局组件
│   │   ├── pages/     # 页面组件
│   │   └── ui/        # UI 组件
│   ├── hooks/         # 自定义 Hooks
│   ├── lib/           # 工具库
│   ├── stores/        # 状态管理
│   └── types/         # 类型定义
├── static/            # 静态资源
└── dist/              # 构建输出
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

