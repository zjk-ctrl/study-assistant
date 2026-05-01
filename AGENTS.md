# 学习助手应用 - 开发规范

## 项目概览

这是一个基于 Next.js 的学习辅助应用，提供番茄钟计时、学习计划管理、好友系统和背景音乐功能。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由
│   │   ├── auth/           # 认证页面
│   │   │   ├── page.tsx    # 登录/注册页面
│   │   │   └── callback/    # OAuth 回调
│   │   ├── page.tsx        # 主页面
│   │   └── layout.tsx      # 根布局
│   ├── components/
│   │   ├── ui/             # shadcn/ui 组件
│   │   └── auth-provider.tsx  # 认证上下文
│   └── storage/
│       └── database/       # Supabase 客户端
├── .env.local              # 环境变量（包含 Supabase 凭据）
└── package.json
```

## 环境变量

应用需要以下环境变量（已在 .env.local 中配置）：

```
NEXT_PUBLIC_SUPABASE_URL=<Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase Anon Key>
```

## 数据库表

- `user_profiles` - 用户资料
- `timer_settings` - 计时器设置
- `study_records` - 学习记录
- `user_plans` - 学习计划
- `friendships` - 好友关系

## 开发命令

```bash
pnpm install     # 安装依赖
pnpm dev         # 启动开发服务器
pnpm build       # 构建生产版本
pnpm lint        # 代码检查
pnpm ts-check    # TypeScript 检查
```

## 核心功能

1. **番茄钟计时器** - 专注/休息时间管理
2. **学习计划** - 创建、追踪学习目标
3. **好友系统** - 搜索、添加好友，好友请求处理
4. **学习统计** - 累计番茄数、连续天数等
5. **背景音乐** - 内置播放列表
6. **浏览器通知** - 计时结束提醒

## 注意事项

- 所有数据库操作使用 Supabase SDK（`@supabase/supabase-js`）
- 字段名使用 snake_case
- 客户端组件使用 `'use client'` 指令
- 敏感环境变量（如 `COZE_SUPABASE_SERVICE_ROLE_KEY`）仅在服务端使用
