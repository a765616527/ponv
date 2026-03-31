# Changelog

本文件记录项目的重要变更。

## 2026-03-29

### Security

- 修复评估详情接口越权访问问题：评估员仅可访问本人评估单。
- 收紧评估更新权限：仅麻醉医生和管理员可更新评估状态与备注。
- 强化接口参数校验，避免非法 `id`、`status`、`notes` 和空请求体直接触发 500。
- 调整 `proxy` 行为，放行 `/api/*`，由 API 统一返回 JSON 错误，避免鉴权失败时返回 HTML 重定向响应。
- 移除仓库中的真实环境凭据，改为占位值；新增 `.env.example` 作为模板。

### Changed

- 风险判定逻辑改为“核心评分 + 附加风险项”共同决定，`EXTREME` 风险等级可达。
- 评估创建接口改为服务端重算 `coreScore`、`riskLevel`、`recommendation`，不再信任前端上送值。
- 更新推荐预防措施文案，与现有分级逻辑保持一致。
- 新增评估列表 Excel 导出功能（按当前用户权限范围导出，评估员仅导出本人数据）。

### Fixed

- 修复 Docker 启动脚本中数据库地址解析错误（`host/port` 解构问题）。
- 去除 `docker-entrypoint.sh` 中迁移与 seed 失败时的 `|| true`，初始化失败将显式中止启动。
- 修复前端多个页面对 API 异常缺少处理导致的“加载中卡住”问题（仪表盘、评估列表、评估详情、用户管理）。
- 修复评估详情页面检查类型文案乱码（`无痛肠镜`）。
- 修复 `prisma/seed.js` 触发的 ESLint 报错。
- 修复容器启动 `npx prisma db push` 报错 `ENOENT ... prisma_schema_build_bg.wasm` 与 Prisma CLI 运行时依赖缺失问题（通过运行层完整生产依赖提供 Prisma CLI 所需模块）。
- 修复 HTTP 部署登录后 `session` 始终为 `null` 的问题：认证 Cookie 的 `secure` 属性改为可通过 `AUTH_COOKIE_SECURE` 显式配置（HTTP 设为 `false`，HTTPS 建议 `true`）。
- 修复容器重复初始化默认账号的问题：移除启动阶段自动 `seed`，避免管理员账号被重复创建。

### Docs

- 更新 `README.md`：同步最新风险分级规则、权限策略、环境变量配置流程和生产安全建议。
- 新增一键部署脚本教程，补充 `5700` 端口、MySQL 内网访问与数据落盘目录说明。
- 补充管理员初始化说明：部署脚本在无管理员时会交互式输入账号密码并初始化。

### Ops

- `docker-compose.yml` 改为使用 DockerHub 镜像 `arxuan123/ponv-depoly:latest`。
- 应用公网端口调整为 `5700`，移除 MySQL 对宿主机端口映射。
- MySQL 数据卷改为宿主机目录 `/root/ponv_data/mysql`。
- 新增 `watchtower` 服务（`nickfedor/watchtower`）自动监控并更新应用镜像。
- 新增 `deploy.sh` 一键部署脚本：
  - 部署前自动从 GitHub 拉取最新 `docker-compose.yml` 到 `/root/ponv_data/docker-compose.yml`
  - 自动创建 `/root/ponv_data/mysql`
  - 首次生成随机 `AUTH_SECRET`
  - 将 `AUTH_SECRET` 持久化到 `/root/ponv_data/auth_secret`
  - 自动回写 `docker-compose.yml`，避免更新后密钥丢失
  - 在数据库无管理员账号时，交互式创建首个管理员账号（幂等，后续不会重复创建）
