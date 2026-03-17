# AI 小说生成器（Vercel + Python API 版）

这是一个已经完成模块化拆分的版本：

- `index.html`：页面结构
- `style.css`：样式
- `app.js`：前端交互逻辑
- `api/chat.py`：Python 后端接口，负责转发到 DeepSeek
- `vercel.json`：Vercel 配置
- `requirements.txt`：Python 依赖

## 一、为什么这样拆

原始单文件里把 HTML、CSS、JavaScript、API 请求全部混在一起，不适合部署和维护。

现在拆完以后：

1. 前端只负责收集用户输入、展示结果
2. 后端负责安全地保存和使用 API Key
3. 项目可以直接上传到 GitHub，再导入 Vercel

## 二、本地项目结构

```text
xiaoshuo-ai/
├─ api/
│  └─ chat.py
├─ public/
├─ index.html
├─ style.css
├─ app.js
├─ vercel.json
├─ requirements.txt
├─ .gitignore
└─ README.md
```

## 三、推到 GitHub

先在项目目录打开终端：

```bash
git init
git add .
git commit -m "init novel generator"
```

如果你还没配置 Git 身份：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

然后去 GitHub 新建仓库，再执行：

```bash
git remote add origin 你的仓库地址
git branch -M main
git push -u origin main
```

## 四、部署到 Vercel

### 方式 1：网页上导入 GitHub 仓库

1. 登录 Vercel
2. 点击 New Project
3. 选择你的 GitHub 仓库
4. 点击 Import
5. 部署前，在项目设置里添加环境变量：

变量名：

```text
DEEPSEEK_API_KEY
```

变量值：

```text
你的 DeepSeek API Key
```

然后点击 Deploy。

---

### 方式 2：用 Vercel CLI

先安装：

```bash
npm i -g vercel
```

登录：

```bash
vercel login
```

在项目目录执行：

```bash
vercel
```

根据提示完成绑定。

再去 Vercel 项目后台添加环境变量 `DEEPSEEK_API_KEY`。

## 五、本地联调用什么方式

如果你想本地同时跑静态页面和 Python 接口，最方便的是：

```bash
vercel dev
```

它会把静态页面和 `api/chat.py` 一起跑起来。

## 六、前端如何请求后端

现在前端不再直接请求 DeepSeek，而是请求你自己的后端：

```javascript
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, temperature })
})
```

后端再去请求 DeepSeek。

## 七、上线后要记住的事

不要把 API Key 写到前端里，也不要再存到浏览器 localStorage。

上线版必须：

- 前端不显示 API Key 输入框
- API Key 只放在 Vercel 环境变量
- 所有 AI 请求都走 `/api/chat`

## 八、后续你可以继续加什么

- 历史记录
- 用户登录
- Prompt 模板管理
- 支持流式输出
- 数据库存储作品
- 多模型切换
