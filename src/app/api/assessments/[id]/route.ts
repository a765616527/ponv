import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUS = new Set(["PENDING", "IN_PROGRESS", "COMPLETED"]);

function parsePositiveId(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function parseUserId(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const { id } = await params;
  const assessmentId = parsePositiveId(id);
  const requesterId = parseUserId(session.id);
  if (!assessmentId || !requesterId) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      assessor: { select: { name: true } },
      anesthetist: { select: { name: true } },
    },
  });

  if (!assessment) return NextResponse.json({ error: "未找到" }, { status: 404 });
  if (session.role === "ASSESSOR" && assessment.assessorId !== requesterId) {
    return NextResponse.json({ error: "无权限查看该评估单" }, { status: 403 });
  }

  return NextResponse.json(assessment);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });
  if (session.role !== "ANESTHETIST" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "仅麻醉医生或管理员可更新状态" }, { status: 403 });
  }

  const { id } = await params;
  const assessmentId = parsePositiveId(id);
  const requesterId = parseUserId(session.id);
  if (!assessmentId || !requesterId) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
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

  const data: Record<string, unknown> = {};
  if (payload.status !== undefined) {
    if (typeof payload.status !== "string" || !ALLOWED_STATUS.has(payload.status)) {
      return NextResponse.json({ error: "状态参数非法" }, { status: 400 });
    }
    data.status = payload.status;
    if (payload.status === "IN_PROGRESS" || payload.status === "COMPLETED") {
      data.anesthetistId = requesterId;
    }
  }

  if (payload.notes !== undefined) {
    if (payload.notes === null) {
      data.notes = null;
    } else if (typeof payload.notes === "string") {
      const notes = payload.notes.trim();
      data.notes = notes.length > 0 ? notes : null;
    } else {
      return NextResponse.json({ error: "备注格式错误" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  try {
    const assessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data,
      include: {
        assessor: { select: { name: true } },
        anesthetist: { select: { name: true } },
      },
    });

    return NextResponse.json(assessment);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "未找到" }, { status: 404 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
