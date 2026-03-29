# PONV 术后恶心呕吐风险评估系统

麻醉科术后恶心呕吐（PONV）风险评估管理系统。术前评估人员填写风险评估单，系统自动计算风险等级和推荐预防措施，麻醉医生在术中可查看评估结果并做好预防。

## 技术栈

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4 + shadcn/ui
- Sonner（消息提示）
- Prisma ORM + MySQL
- JWT 认证（jose + httpOnly cookie）

## 功能

- 用户登录认证，三种角色：管理员、评估人员、麻醉医生
- PONV 风险评估表单，自动计算核心评分、附加风险、风险等级和推荐预防措施
- 后端服务端重算核心评分、风险等级与推荐措施（不信任前端上送风险结果）
- 评估列表，支持按角色过滤（评估人员只看自己的，麻醉医生和管理员看全部）
- 评估详情页，麻醉医生/管理员可标记处理状态、添加备注
- 仪表盘统计概览
- 用户管理（管理员）
- 移动端适配

## 风险等级判定规则

| 等级 | 条件 | 推荐措施 |
|------|------|----------|
| 低危 | 不满足下述中危/高危/极高危条件 | 建议优先采用丙泊酚麻醉，无需常规止吐药 |
| 中危 | 核心评分 = 2，或核心评分 = 1 且附加风险项≥1 | 建议采用丙泊酚麻醉，并加用 5-HT₃ 受体拮抗剂 |
| 高危 | 核心评分≥3 且附加风险项 = 0 | 建议采用丙泊酚麻醉 + 5-HT₃ 受体拮抗剂 + 地塞米松联合止吐 |
| 极高危 | 核心评分 3-4 分，伴≥1 项附加风险 | 多模式联合止吐 + 优化麻醉方案 + 非药物干预 |

附加风险项包括：
- 预计操作时长 ≥ 60 分钟
- 术前焦虑

## 权限与安全策略

- 所有业务 API 均要求登录态（JWT + httpOnly cookie）。
- 评估员仅可查看自己创建的评估单。
- 仅麻醉医生和管理员可更新评估状态或备注。
- 用户管理接口仅管理员可访问。
- 生产环境必须使用强随机 `AUTH_SECRET`，并避免提交真实 `.env`。

## 本地开发

### 环境要求

- Node.js 18+
- MySQL 8.0+

### 安装步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
# 复制模板并编辑 .env
cp .env.example .env
DATABASE_URL="mysql://用户名:密码@localhost:3306/数据库名"
AUTH_SECRET="随机密钥字符串"

# 3. 创建数据库（在 MySQL 中执行）
# CREATE DATABASE ponv_system;

# 4. 推送表结构到数据库
npx prisma db push

# 5. 创建默认用户
node prisma/seed.js

# 6. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 默认账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | 123456 | 管理员 | 全部权限 |
| assessor1 | 123456 | 评估人员 | 创建评估、查看本人评估单 |
| doctor1 | 123456 | 麻醉医生 | 查看评估、标记处理状态、维护备注 |

## 生产部署

生产建议：
- 使用独立的生产数据库与最小权限账号。
- 通过环境变量注入 `DATABASE_URL` 与 `AUTH_SECRET`。
- 首次上线后请立即修改默认账号密码。
- 若曾泄露密钥，请立即轮换数据库密码和 `AUTH_SECRET`。
- 镜像发布约定见 `DOCKER_RELEASE_POLICY.md`（必须同时推送 `latest` + `YYYYMMDD`，且推送后删除本地镜像）。

### 方式一：直接部署

```bash
# 1. 安装依赖
npm install

# 2. 配置 .env 环境变量
AUTH_SECRET="生产环境请使用强随机密钥"

# 3. 初始化数据库
npx prisma db push
node prisma/seed.js

# 4. 构建
npm run build

# 5. 启动（默认端口 3000）
npm start

# 指定端口
PORT=8080 npm start
```

### 方式二：使用 PM2 守护进程

```bash
npm install -g pm2

npm run build
pm2 start npm --name "ponv" -- start
pm2 save
pm2 startup  # 设置开机自启
```

### 方式三：Docker Compose 部署（推荐）

包含 MySQL 8.0 + 应用，一键启动，无需额外安装数据库。  
默认仅暴露应用端口 `5700`，MySQL 仅在 Docker 内部网络访问。

#### 快速启动

```bash
# 启动所有服务（MySQL + 应用）
docker compose up -d

# 查看日志
docker compose logs -f app

# 停止服务
docker compose down

# 停止并删除数据（包括数据库数据）
docker compose down -v
```

启动后访问 http://localhost:5700，应用会自动完成数据库初始化和默认用户创建。

#### 自定义配置

编辑 `docker-compose.yml` 中的环境变量：

```yaml
services:
  mysql:
    environment:
      MYSQL_ROOT_PASSWORD: 你的root密码
      MYSQL_DATABASE: ponv_system
      MYSQL_USER: ponv
      MYSQL_PASSWORD: 你的数据库密码
    # MySQL 数据落盘目录（宿主机）
    volumes:
      - /root/ponv_data/mysql:/var/lib/mysql

  app:
    environment:
      DATABASE_URL: "mysql://ponv:你的数据库密码@mysql:3306/ponv_system"
      AUTH_SECRET: "修改为随机密钥"
```

### 方式四：一键部署脚本（推荐）

项目根目录提供 `deploy.sh`，用于单机一键部署与更新。

脚本会自动执行：
- 从 GitHub 拉取最新 `docker-compose.yml` 到 `/root/ponv_data/docker-compose.yml`
- 创建数据目录 `/root/ponv_data/mysql`
- 生成随机 `AUTH_SECRET`（首次），并持久化到 `/root/ponv_data/auth_secret`
- 将 `AUTH_SECRET` 回写到 `docker-compose.yml`，避免后续更新时丢失
- 拉取镜像并启动服务（`docker compose pull && docker compose up -d`）

使用方法：

```bash
wget -O deploy.sh https://raw.githubusercontent.com/a765616527/ponv/refs/heads/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

部署完成后访问：

```text
http://<服务器IP>:5700
```

#### 仅构建应用镜像（已有 MySQL）

```bash
# 构建镜像
docker build -t ponv-system .

# 运行（连接已有的 MySQL）
docker run -d -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@host:3306/dbname" \
  -e AUTH_SECRET="your-secret" \
  ponv-system
```

## 项目结构

```
src/
├── app/
│   ├── (app)/                # 需要登录的页面
│   │   ├── dashboard/        # 仪表盘
│   │   ├── assessments/      # 评估列表、新建、详情
│   │   └── admin/users/      # 用户管理
│   ├── api/                  # API 路由
│   ├── login/                # 登录页
│   └── layout.tsx            # 根布局
├── components/
│   ├── ui/                   # shadcn/ui 组件
│   ├── app-sidebar.tsx       # 侧边栏导航
│   └── providers.tsx         # Session Provider
├── lib/
│   ├── auth.ts               # JWT 签发/校验与 session 获取
│   ├── prisma.ts             # Prisma 客户端
│   └── risk.ts               # 风险评估计算逻辑
└── types/                    # 类型定义
prisma/
├── schema.prisma             # 数据模型
└── seed.js                   # 种子数据
```
