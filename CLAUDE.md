# PONV 项目大模型协作说明（CLAUDE）

本文件用于让任何大模型（Claude / GPT / 其他 Agent）快速接手本项目开发与运维工作。

## 1. 项目概览

- 项目：PONV 术后恶心呕吐风险评估系统
- 技术栈：Next.js 16 + React 19 + TypeScript + Prisma + MySQL + JWT Cookie
- 运行端口：公网 `5700`（容器内应用仍为 `3000`）
- 部署方式：Docker Compose（含 `mysql`、`app`、`watchtower`）

关键文件：
- 应用与页面：`src/app/...`
- API：`src/app/api/...`
- 认证：`src/lib/auth.ts`
- 风险计算：`src/lib/risk.ts`
- Docker 编排：`docker-compose.yml`
- 一键部署：`deploy.sh`
- 镜像发布约定：`DOCKER_RELEASE_POLICY.md`

## 2. 必须遵守的规则

### 2.1 Next.js 16 特殊约束

- 本项目不是旧版 Next 用法，改动前必须先看：
  - `AGENTS.md`
  - `node_modules/next/dist/docs/` 下对应文档
- 特别关注 `proxy`、Route Handlers、App Router 的当前版本规则。

### 2.2 权限与安全边界

- 评估员只能查看自己创建的评估单。
- 仅麻醉医生和管理员可更新评估状态/备注。
- 创建评估时，风险分级必须由服务端重算，不信任前端上送分值。
- 禁止把真实密钥、数据库密码提交进仓库。

### 2.3 Docker 发布约束（硬规则）

每次发布镜像必须同时推送 2 个标签：

1. `latest`
2. `YYYYMMDD`（日期备份标签）

并且推送后必须删除本地这两个镜像标签，节省磁盘空间。  
详见 `DOCKER_RELEASE_POLICY.md`。

## 3. 本地开发标准流程

```bash
npm install
npm run lint
npm run build
```

涉及数据库时：

```bash
npm run db:push
INIT_ADMIN_USERNAME="admin" INIT_ADMIN_PASSWORD="请改成强密码" npm run db:init-admin
```

开发调试：

```bash
npm run dev
```

## 4. 一键部署脚本行为（deploy.sh）

`deploy.sh` 当前设计为：

1. 从 GitHub 拉取最新 `docker-compose.yml`
2. 创建 `/root/ponv_data/mysql`
3. 首次生成随机 `AUTH_SECRET`，持久化到 `/root/ponv_data/auth_secret`
4. 将该 `AUTH_SECRET` 回写到 `docker-compose.yml`
5. 执行 `docker compose pull && docker compose up -d`
6. 若数据库中不存在管理员账号，交互式输入管理员账号/密码并初始化

说明：
- 本项目按“单实例”前提运行。
- MySQL 只在容器网络内访问，不做宿主机端口映射。
- `watchtower` 通过容器 label 自动监控并更新应用镜像。
- 容器常规启动仅做迁移，不再自动导入 seed 种子数据。

## 5. 代码改动后的最低交付标准

每次完成改动，至少执行并确认：

1. `npm run lint` 通过
2. `npm run build` 通过
3. 如涉及 Docker，则验证 `docker compose config` 正常
4. 如涉及部署/发布逻辑，则同步更新 `README.md` 与 `CHANGELOG.md`

## 6. 常见任务操作模板

### 6.1 发布 Docker 镜像

```bash
DATE_TAG=$(date +%Y%m%d)
docker build -t arxuan123/ponv-depoly:latest -t arxuan123/ponv-depoly:${DATE_TAG} .
docker push arxuan123/ponv-depoly:latest
docker push arxuan123/ponv-depoly:${DATE_TAG}
docker rmi arxuan123/ponv-depoly:latest arxuan123/ponv-depoly:${DATE_TAG}
```

### 6.2 服务器一键部署

```bash
mkdir -p /root/ponv_data
cd /root/ponv_data
wget -O deploy.sh https://edgeone.gh-proxy.org/https://raw.githubusercontent.com/a765616527/ponv/refs/heads/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

## 7. 协作建议

- 优先做“最小改动可验证修复”，避免无关重构。
- 任何权限相关改动必须同时看前端和后端，不可只改 UI。
- 文档与实现保持一致，避免“代码已改但 README 未更新”。
