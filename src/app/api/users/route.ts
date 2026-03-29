import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ALLOWED_ROLES = new Set(["ADMIN", "ASSESSOR", "ANESTHETIST"]);
type RoleValue = "ADMIN" | "ASSESSOR" | "ANESTHETIST";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const username = asNonEmptyString(payload.username);
  const password = asNonEmptyString(payload.password);
  const name = asNonEmptyString(payload.name);
  const role = asNonEmptyString(payload.role);

  if (!username || !password || !name || !role) {
    return NextResponse.json({ error: "请填写完整信息" }, { status: 400 });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "角色参数非法" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedRole = role as RoleValue;

  const user = await prisma.user.create({
    data: {
      username,
      password: passwordHash,
      name,
      role: normalizedRole,
    },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}
