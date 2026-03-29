#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="/root/ponv_data"
MYSQL_DATA_DIR="${DATA_DIR}/mysql"
SECRET_FILE="${DATA_DIR}/auth_secret"
COMPOSE_FILE="${DATA_DIR}/docker-compose.yml"
RAW_BASE_URL="https://raw.githubusercontent.com/a765616527/ponv/refs/heads/main"
COMPOSE_URL="${RAW_BASE_URL}/docker-compose.yml"

download_file() {
  local url="$1"
  local output="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "${url}" -o "${output}"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO "${output}" "${url}"
    return
  fi
  echo "缺少 curl 或 wget，无法下载 ${url}"
  exit 1
}

if ! command -v docker >/dev/null 2>&1; then
  echo "docker 未安装，请先安装 Docker。"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose 不可用，请安装 Docker Compose v2。"
  exit 1
fi

echo "拉取部署配置文件..."
mkdir -p "${MYSQL_DATA_DIR}"
chmod 700 "${DATA_DIR}" "${MYSQL_DATA_DIR}" || true
download_file "${COMPOSE_URL}" "${COMPOSE_FILE}"

if [[ -f "${SECRET_FILE}" ]]; then
  AUTH_SECRET="$(tr -d '\r\n' < "${SECRET_FILE}")"
else
  if command -v openssl >/dev/null 2>&1; then
    AUTH_SECRET="$(openssl rand -hex 32)"
  else
    AUTH_SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  printf "%s\n" "${AUTH_SECRET}" > "${SECRET_FILE}"
  chmod 600 "${SECRET_FILE}"
fi

if ! grep -qE '^[[:space:]]*AUTH_SECRET:' "${COMPOSE_FILE}"; then
  echo "未在 ${COMPOSE_FILE} 中找到 AUTH_SECRET 配置。"
  exit 1
fi

sed -i -E "s#^([[:space:]]*AUTH_SECRET:).*\$#\1 \"${AUTH_SECRET}\"#" "${COMPOSE_FILE}"

echo "使用配置文件: ${COMPOSE_FILE}"
echo "MySQL 数据目录: ${MYSQL_DATA_DIR}"
echo "已回写 AUTH_SECRET 到 docker-compose.yml"

docker compose -f "${COMPOSE_FILE}" pull
docker compose -f "${COMPOSE_FILE}" up -d

echo "部署完成。应用访问端口: 5700"
