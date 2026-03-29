#!/usr/bin/env bash
set -euo pipefail

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

prompt_admin_credentials() {
  while true; do
    read -r -p "请输入管理员账号: " ADMIN_USERNAME
    if [[ -n "${ADMIN_USERNAME}" ]]; then
      break
    fi
    echo "管理员账号不能为空，请重新输入。"
  done

  while true; do
    read -r -s -p "请输入管理员密码（至少 6 位）: " ADMIN_PASSWORD
    echo
    read -r -s -p "请再次输入管理员密码: " ADMIN_PASSWORD_CONFIRM
    echo

    if [[ -z "${ADMIN_PASSWORD}" ]]; then
      echo "管理员密码不能为空，请重新输入。"
      continue
    fi

    if [[ "${#ADMIN_PASSWORD}" -lt 6 ]]; then
      echo "管理员密码长度不能少于 6 位，请重新输入。"
      continue
    fi

    if [[ "${ADMIN_PASSWORD}" != "${ADMIN_PASSWORD_CONFIRM}" ]]; then
      echo "两次输入的管理员密码不一致，请重新输入。"
      continue
    fi

    break
  done

  read -r -p "请输入管理员姓名（默认：系统管理员）: " ADMIN_NAME
  ADMIN_NAME="${ADMIN_NAME:-系统管理员}"
}

run_init_admin() {
  local init_username="${1:-}"
  local init_password="${2:-}"
  local init_name="${3:-}"
  local -a exec_args
  exec_args=(docker compose -f "${COMPOSE_FILE}" exec -T)

  if [[ -n "${init_username}" ]]; then
    exec_args+=(
      -e "INIT_ADMIN_USERNAME=${init_username}"
      -e "INIT_ADMIN_PASSWORD=${init_password}"
      -e "INIT_ADMIN_NAME=${init_name}"
    )
  fi

  exec_args+=(app node prisma/init-admin.js)
  "${exec_args[@]}"
}

wait_for_app_exec() {
  echo "等待应用容器就绪..."
  for i in $(seq 1 60); do
    if docker compose -f "${COMPOSE_FILE}" exec -T app node -e "process.exit(0)" >/dev/null 2>&1; then
      return 0
    fi
    echo "  应用容器未就绪，重试 ($i/60)..."
    sleep 2
  done

  echo "应用容器长时间未就绪，请检查日志。"
  docker compose -f "${COMPOSE_FILE}" logs --tail=80 app || true
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

wait_for_app_exec

set +e
run_init_admin
init_exit_code=$?
set -e

case "${init_exit_code}" in
  0)
    echo "管理员初始化检查完成（已存在管理员则自动跳过）。"
    ;;
  2)
    echo "未检测到管理员账号，开始交互式初始化管理员。"
    prompt_admin_credentials
    run_init_admin "${ADMIN_USERNAME}" "${ADMIN_PASSWORD}" "${ADMIN_NAME}"
    echo "管理员初始化完成。"
    unset ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM
    ;;
  *)
    echo "管理员初始化失败，请检查容器日志。"
    exit "${init_exit_code}"
    ;;
esac

echo "部署完成。应用访问端口: 5700"
