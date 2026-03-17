# 脱水雪球 📊

> 雪球大V观点脱水工具，核心投资信息一键获取

[![Angular](https://img.shields.io/badge/Angular-17-DD0031?style=flat&logo=angular)](https://angular.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## ✨ 功能特性

### 🎯 核心功能
- **智能脱水** - AI 分析大V观点，提取核心投资逻辑
- **情绪分析** - 自动判断看多/看空/中性态度
- **标的识别** - 识别提及的股票代码和态度
- **风险提示** - 自动提取风险预警信息

### 📱 页面功能
- **📅 时间线** - 查看关注大V的最新动态，含AI脱水解读
- **📊 今日摘要** - 每日观点汇总，情绪分布一目了然
- **👥 大V管理** - 添加/编辑/删除关注的大V

### 🎨 设计特点
- **移动端优先** - 完美适配手机竖屏浏览
- **统一导航** - 底部Tab栏 + 顶部导航Tab
- **情绪可视化** - 红色看多、绿色看空、灰色中性
- **卡片化布局** - 信息层级清晰，阅读体验佳

## 🛠️ 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端 | Angular 17 + Tailwind CSS | 响应式移动端优先设计 |
| 后端 | FastAPI + SQLAlchemy | 异步API，高性能 |
| 数据库 | SQLite | 轻量级，零配置 |
| AI分析 | 通义千问 / DeepSeek | 可选多种AI模型 |

## 📦 快速开始

### 方式一：一键部署

```bash
# 克隆项目
git clone https://github.com/nomospace/xueqiu-vip-tracker.git
cd xueqiu-vip-tracker

# 一键部署
./scripts/deploy.sh
```

部署完成后访问：http://your-server:3007

### 方式二：手动启动

#### 1. 配置环境变量

```bash
# AI API Key（二选一）
export DASHSCOPE_API_KEY="your-dashscope-key"  # 通义千问
export DEEPSEEK_API_KEY="your-deepseek-key"    # DeepSeek
```

#### 2. 启动后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 3. 启动前端

```bash
cd frontend
npm install
npm run build -- --configuration production
```

#### 4. 配置 Nginx

```bash
sudo cp -r frontend/dist/snowball-vip/browser/* /var/www/snowball-vip-monitor/
# 配置 Nginx 指向该目录
```

## 📁 项目结构

```
xueqiu-vip-tracker/
├── frontend/                    # Angular 前端
│   └── src/app/
│       └── pages/
│           ├── dashboard/       # 首页（时间线）
│           ├── daily-summary/   # 今日摘要
│           └── vip-list/        # 大V管理
├── backend/                     # FastAPI 后端
│   └── app/
│       ├── api/
│       │   └── vip.py          # 核心API
│       ├── models/
│       │   └── models.py       # 数据模型
│       └── services/
│           └── xueqiu_service.py # 雪球API封装
├── scripts/
│   └── deploy.sh               # 一键部署脚本
└── README.md
```

## 🔧 Cookie 配置

由于雪球 WAF 限制，需要配置 Cookie 才能爬取数据：

### PC端获取步骤

1. 登录 [雪球网页版](https://xueqiu.com)
2. 按 `F12` 打开开发者工具
3. 切换到 `Network` 标签
4. 刷新页面，点击任意请求
5. 在 `Headers` 中找到 `Cookie`
6. 复制完整 Cookie 值
7. 在「脱水雪球」首页粘贴保存

> ⚠️ Cookie 必须包含 `xq_a_token` 字段才有效

## 📊 API 文档

启动后端后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 核心接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/vip` | GET | 获取大V列表 |
| `/api/vip` | POST | 添加大V |
| `/api/vip/{id}` | PATCH | 更新大V昵称 |
| `/api/vip/{id}` | DELETE | 取关大V |
| `/api/vip/fetch-all-timeline` | POST | 抓取大V动态 |
| `/api/vip/daily-summary` | GET | 获取每日摘要 |

## 🎨 页面预览

### 首页 - 时间线
- 统计卡片：Cookie状态、关注大V数、今日新帖
- 核心入口：查看今日脱水摘要
- 时间线：大V动态 + AI脱水解读

### 今日摘要
- 横向滚动数据卡片：新帖/活跃大V/看多/看空/中性
- 情绪筛选：全部/看多/看空/中性
- 大V观点卡片：情绪轨迹、关键发现、相关标的

### 大V管理
- 统计卡片：已关注/今日新增
- 大V卡片：头像、昵称、操作按钮
- 支持：编辑昵称、跳转雪球主页、取关

## 🔒 安全说明

- Cookie 存储在用户浏览器本地（localStorage）
- 后端 Cookie 存储在服务器本地文件（不提交Git）
- 敏感配置使用环境变量
- `.gitignore` 已排除敏感文件

## ⚠️ 免责声明

本项目仅供个人学习研究使用，不用于任何商业目的。
使用本工具需遵守雪球《用户协议》，数据版权归雪球所有。
投资有风险，决策需谨慎，本工具观点仅供参考。

## 📜 License

MIT

---

<p align="center">
  Made with 🦞 by <a href="https://github.com/nomospace">nomospace</a>
</p>