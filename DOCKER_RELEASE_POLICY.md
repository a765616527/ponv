# Docker 镜像发布约定

本文档用于约束 `arxuan123/ponv-depoly` 的发布流程。

## 发布硬规则

每次发布镜像必须同时推送 2 个 Tag：

1. 日期备份 Tag：`YYYYMMDD`（例如：`20260305`）
2. 最新 Tag：`latest`

不允许只推送单个 Tag。

推送完成后，必须删除本地镜像以节省磁盘空间。

## 标准发布命令

在项目根目录执行：

```bash
DATE_TAG=$(date +%Y%m%d)

# 构建（同时打两个标签）
docker build \
  -t arxuan123/ponv-depoly:latest \
  -t arxuan123/ponv-depoly:${DATE_TAG} \
  .

# 推送两个标签（必须都推送）
docker push arxuan123/ponv-depoly:latest
docker push arxuan123/ponv-depoly:${DATE_TAG}

# 清理本地镜像（必须执行）
docker rmi arxuan123/ponv-depoly:latest arxuan123/ponv-depoly:${DATE_TAG}
```

## 验证项

发布后至少检查：

1. DockerHub 仓库存在 `latest` 与当日 `YYYYMMDD` 两个 Tag
2. 本地 `docker images` 不再保留上述两个 Tag
