import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EXAM_TYPE_LABEL: Record<string, string> = {
  GASTROSCOPY: "无痛胃镜",
  COLONOSCOPY: "无痛肠镜",
  COMBINED: "胃肠镜联合",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "处理中",
  COMPLETED: "已完成",
};

const RISK_LEVEL_LABEL: Record<string, string> = {
  LOW: "低危",
  MEDIUM: "中危",
  HIGH: "高危",
  EXTREME: "极高危",
};

const GENDER_LABEL: Record<string, string> = {
  MALE: "男",
  FEMALE: "女",
};

function xmlEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const userId = Number.parseInt(session.id, 10);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "无效用户" }, { status: 401 });
  }

  const where = session.role === "ASSESSOR" ? { assessorId: userId } : {};

  const assessments = await prisma.assessment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assessor: { select: { name: true } },
      anesthetist: { select: { name: true } },
    },
  });

  const rows: string[][] = [
    [
      "ID",
      "患者姓名",
      "性别",
      "年龄",
      "病历号",
      "体重(kg)",
      "检查类型",
      "风险等级",
      "状态",
      "评估人",
      "处理医生",
      "检查日期",
      "创建时间",
      "推荐措施",
      "备注",
    ],
  ];

  for (const item of assessments) {
    rows.push([
      String(item.id),
      item.patientName,
      GENDER_LABEL[item.gender] ?? item.gender,
      String(item.age),
      item.medicalRecordNo,
      String(item.weight),
      EXAM_TYPE_LABEL[item.examType] ?? item.examType,
      RISK_LEVEL_LABEL[item.riskLevel] ?? item.riskLevel,
      STATUS_LABEL[item.status] ?? item.status,
      item.assessor.name,
      item.anesthetist?.name ?? "",
      formatDate(item.examDate),
      formatDateTime(item.createdAt),
      item.recommendation,
      item.notes ?? "",
    ]);
  }

  const tableRows = rows
    .map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`).join("")}</Row>`)
    .join("");

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="评估列表">
    <Table>
      ${tableRows}
    </Table>
  </Worksheet>
</Workbook>`;
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `assessments-${dateTag}.xls`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
