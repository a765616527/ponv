export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export interface CoreFactors {
  isFemale: boolean;
  hasMotionSicknessHistory: boolean;
  isNonSmoker: boolean;
  usedOpioids: boolean;
}

export interface AdditionalRiskFactors {
  durationOver60Min: boolean;
  preOpAnxiety: boolean;
}

export function calculateCoreScore(factors: CoreFactors): number {
  return (
    (factors.isFemale ? 1 : 0) +
    (factors.hasMotionSicknessHistory ? 1 : 0) +
    (factors.isNonSmoker ? 1 : 0) +
    (factors.usedOpioids ? 1 : 0)
  );
}

export function calculateAdditionalRiskCount(factors: AdditionalRiskFactors): number {
  return (factors.durationOver60Min ? 1 : 0) + (factors.preOpAnxiety ? 1 : 0);
}

export function determineRiskLevel(coreScore: number, additionalRiskCount = 0): RiskLevel {
  if (coreScore >= 3) return additionalRiskCount >= 1 ? "EXTREME" : "HIGH";
  if (coreScore >= 2) return "MEDIUM";
  if (coreScore >= 1 && additionalRiskCount >= 1) return "MEDIUM";
  return "LOW";
}

export function getRecommendation(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    LOW: "建议优先采用丙泊酚麻醉，无需常规止吐药。",
    MEDIUM: "建议采用丙泊酚麻醉，并加用5-HT₃受体拮抗剂。",
    HIGH: "建议采用丙泊酚麻醉 + 5-HT₃受体拮抗剂 + 地塞米松联合止吐。",
    EXTREME: "多模式联合止吐 + 优化麻醉方案 + 非药物干预，全程管控诱发因素",
  };
  return map[level];
}

export const riskLevelLabel: Record<RiskLevel, string> = {
  LOW: "低风险（发生率约10%-20%）",
  MEDIUM: "中风险（发生率约40%）",
  HIGH: "高风险（发生率约60%-80%）",
  EXTREME: "极高危",
};

export const riskLevelColor: Record<RiskLevel, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  EXTREME: "bg-red-100 text-red-800",
};
