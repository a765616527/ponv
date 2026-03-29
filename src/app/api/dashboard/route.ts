import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const role = session.role;
  const userId = parseInt(session.id);
  const where = role === "ASSESSOR" ? { assessorId: userId } : {};

  // 今天的日期范围（按 examDate）
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayWhere = { ...where, examDate: { gte: todayStart, lte: todayEnd } };

  // 近7天每天的评估数量（按 examDate）
  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const count = await prisma.assessment.count({
      where: { ...where, examDate: { gte: start, lte: end } },
    });
    days.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, count });
  }

  const [total, pending, inProgress, completed, todayRiskStats] = await Promise.all([
    prisma.assessment.count({ where }),
    prisma.assessment.count({ where: { ...where, status: "PENDING" } }),
    prisma.assessment.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.assessment.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.assessment.groupBy({
      by: ["riskLevel"],
      where: todayWhere,
      _count: true,
    }),
  ]);

  const recent = await prisma.assessment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { assessor: { select: { name: true } } },
  });

  return NextResponse.json({
    total, pending, inProgress, completed,
    riskStats: todayRiskStats.map((r) => ({ level: r.riskLevel, count: r._count })),
    trend: days,
    recent,
  });
}
