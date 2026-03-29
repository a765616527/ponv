import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateAdditionalRiskCount,
  calculateCoreScore,
  determineRiskLevel,
  getRecommendation,
} from "@/lib/risk";

const ALLOWED_GENDERS = new Set(["MALE", "FEMALE"]);
const ALLOWED_EXAM_TYPES = new Set(["GASTROSCOPY", "COLONOSCOPY", "COMBINED"]);
type GenderValue = "MALE" | "FEMALE";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asPositiveInteger(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function asPositiveNumber(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const role = session.role;
  const userId = parseInt(session.id);

  const where = role === "ASSESSOR" ? { assessorId: userId } : {};

  const assessments = await prisma.assessment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assessor: { select: { name: true } },
      anesthetist: { select: { name: true } },
    },
  });

  return NextResponse.json(assessments);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });
  if (session.role === "ADMIN") {
    return NextResponse.json({ error: "管理员请通过用户管理操作" }, { status: 403 });
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

  const patientName = asNonEmptyString(payload.patientName);
  const medicalRecordNo = asNonEmptyString(payload.medicalRecordNo);
  const gender = asNonEmptyString(payload.gender);
  const examType = asNonEmptyString(payload.examType);
  const examDateText = asNonEmptyString(payload.examDate);
  const age = asPositiveInteger(payload.age);
  const weight = asPositiveNumber(payload.weight);

  if (!patientName || !medicalRecordNo || !gender || !examType || !examDateText || age === null || weight === null) {
    return NextResponse.json({ error: "请填写完整且合法的患者信息" }, { status: 400 });
  }

  if (!ALLOWED_GENDERS.has(gender)) {
    return NextResponse.json({ error: "性别参数非法" }, { status: 400 });
  }
  if (!ALLOWED_EXAM_TYPES.has(examType)) {
    return NextResponse.json({ error: "检查类型参数非法" }, { status: 400 });
  }

  const examDate = new Date(examDateText);
  if (Number.isNaN(examDate.getTime())) {
    return NextResponse.json({ error: "检查日期格式错误" }, { status: 400 });
  }

  const normalizedGender = gender as GenderValue;
  const isFemale = normalizedGender === "FEMALE";
  const hasMotionSicknessHistory = payload.hasMotionSicknessHistory === true;
  const isNonSmoker = payload.isNonSmoker === true;
  const usedOpioids = payload.usedOpioids === true;
  const durationOver60Min = payload.durationOver60Min === true;
  const preOpAnxiety = payload.preOpAnxiety === true;

  const coreScore = calculateCoreScore({
    isFemale,
    hasMotionSicknessHistory,
    isNonSmoker,
    usedOpioids,
  });
  const additionalRiskCount = calculateAdditionalRiskCount({
    durationOver60Min,
    preOpAnxiety,
  });
  const riskLevel = determineRiskLevel(coreScore, additionalRiskCount);
  const recommendation = getRecommendation(riskLevel);

  try {
    const assessment = await prisma.assessment.create({
      data: {
        patientName,
        gender: normalizedGender,
        age,
        medicalRecordNo,
        weight,
        examType,
        examDate,
        isFemale,
        hasMotionSicknessHistory,
        isNonSmoker,
        usedOpioids,
        coreScore,
        durationOver60Min,
        preOpAnxiety,
        riskLevel,
        recommendation,
        assessorId: parseInt(session.id, 10),
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建评估单失败" }, { status: 500 });
  }
}
