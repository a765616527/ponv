#!/bin/sh
set -e

echo "Waiting for MySQL to be ready..."
ready=0
for i in $(seq 1 60); do
  if node -e "
    const net = require('net');
    const rawUrl = process.env.DATABASE_URL || '';
    let host = 'mysql';
    let port = 3306;

    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname) host = parsed.hostname;
      if (parsed.port) port = Number(parsed.port);
    } catch {}

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      port = 3306;
    }

    const socket = net.connect({ host, port });
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.end();
      process.exit(0);
    });
    socket.on('timeout', () => {
      socket.destroy();
      process.exit(1);
    });
    socket.on('error', () => process.exit(1));
  " 2>/dev/null; then
    ready=1
    break
  fi
  echo "  MySQL not ready yet, retrying ($i/60)..."
  sleep 2
done

if [ "$ready" -ne 1 ]; then
  echo "MySQL was not reachable after 60 retries, exiting."
  exit 1
fi

echo "Running database migrations..."
npx prisma db push --skip-generate

echo "Seeding default data..."
node prisma/seed.js

echo "Starting application..."
exec "$@"
