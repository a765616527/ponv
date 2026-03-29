"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  calculateCoreScore, determineRiskLevel,
  calculateAdditionalRiskCount, getRecommendation, riskLevelLabel, riskLevelColor,
  type CoreFactors,
} from "@/lib/risk";

// 检查类型选项（单选）
const EXAM_OPTIONS = [
  { value: "GASTROSCOPY", label: "无痛胃镜" },
  { value: "COLONOSCOPY", label: "无痛肠镜" },
  { value: "COMBINED", label: "胃肠镜联合" },
];

function PickButton({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${selected ? "border-primary bg-primary/5" : "border-input bg-background hover:bg-muted"}`}
    >
      <span className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary border-primary" : "border-input"}`}>
        {selected && (
          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

export default function NewAssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [age, setAge] = useState("");
  const [medicalRecordNo, setMedicalRecordNo] = useState("");
  const [weight, setWeight] = useState("");
  const [examType, setExamType] = useState<string>("");
  const [examDate, setExamDate] = useState("");
  const [durationOver60Min, setDurationOver60Min] = useState(false);
  const [preOpAnxiety, setPreOpAnxiety] = useState(false);

  const [core, setCore] = useState<CoreFactors>({
    isFemale: false, hasMotionSicknessHistory: false,
    isNonSmoker: false, usedOpioids: false,
  });

  const coreScore = calculateCoreScore(core);
  const additionalRiskCount = calculateAdditionalRiskCount({
    durationOver60Min,
    preOpAnxiety,
  });
  const riskLevel = determineRiskLevel(coreScore, additionalRiskCount);
  const recommendation = getRecommendation(riskLevel);

  useEffect(() => {
    setCore((prev) => ({ ...prev, isFemale: gender === "FEMALE" }));
  }, [gender]);

  const handleSubmit = async () => {
    if (!patientName || !gender || !age || !medicalRecordNo || !weight || !examType || !examDate) {
      toast.error("请填写完整的患者信息");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName, gender, age, medicalRecordNo, weight,
          examType,
          examDate,
          durationOver60Min,
          preOpAnxiety,
          ...core, coreScore, riskLevel, recommendation,
        }),
      });
      if (!res.ok) throw new Error("创建失败");
      toast.success("评估单创建成功");
      router.push("/assessments");
    } catch {
      toast.error("创建失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">术后恶心呕吐（PONV）风险评估单</h2>

      {/* 患者基本信息 */}
      <Card>
        <CardHeader><CardTitle>患者基本信息</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>姓名</Label>
            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="患者姓名" />
          </div>
          <div className="space-y-2">
            <Label>性别</Label>
            <div className="flex gap-2">
              {[{ value: "MALE", label: "男" }, { value: "FEMALE", label: "女" }].map((opt) => (
                <PickButton key={opt.value} selected={gender === opt.value} onClick={() => setGender(opt.value)} label={opt.label} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>年龄</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="岁" />
          </div>
          <div className="space-y-2">
            <Label>病历号</Label>
            <Input value={medicalRecordNo} onChange={(e) => setMedicalRecordNo(e.target.value)} placeholder="病历号" />
          </div>
          <div className="space-y-2">
            <Label>体重(kg)</Label>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg" />
          </div>
          <div className="space-y-2">
            <Label>检查日期</Label>
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2 md:col-span-3">
            <Label>检查类型</Label>
            <div className="flex gap-2">
              {EXAM_OPTIONS.map((opt) => (
                <PickButton
                  key={opt.value}
                  selected={examType === opt.value}
                  onClick={() => setExamType(opt.value)}
                  label={opt.label}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2 md:col-span-3">
            <Label>其他情况</Label>
            <div className="flex gap-2">
              <PickButton selected={durationOver60Min} onClick={() => setDurationOver60Min(!durationOver60Min)} label="预计操作时长≥60分钟" />
              <PickButton selected={preOpAnxiety} onClick={() => setPreOpAnxiety(!preOpAnxiety)} label="术前焦虑" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 核心风险因素 */}
      <Card>
        <CardHeader><CardTitle>一、核心风险因素</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox checked={core.isFemale} onCheckedChange={(v) => setCore({ ...core, isFemale: !!v })} disabled={!!gender} />
            <Label>1. 女性（根据性别自动判定）</Label>
            <span className="ml-auto text-sm font-medium">{core.isFemale ? "1分" : "0分"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={core.hasMotionSicknessHistory} onCheckedChange={(v) => setCore({ ...core, hasMotionSicknessHistory: !!v })} />
            <Label>2. 晕动症/既往PONV病史</Label>
            <span className="ml-auto text-sm font-medium">{core.hasMotionSicknessHistory ? "1分" : "0分"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={core.isNonSmoker} onCheckedChange={(v) => setCore({ ...core, isNonSmoker: !!v })} />
            <Label>3. 非吸烟状态</Label>
            <span className="ml-auto text-sm font-medium">{core.isNonSmoker ? "1分" : "0分"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={core.usedOpioids} onCheckedChange={(v) => setCore({ ...core, usedOpioids: !!v })} />
            <Label>4. 术中使用阿片类药物</Label>
            <span className="ml-auto text-sm font-medium">{core.usedOpioids ? "1分" : "0分"}</span>
          </div>
          <Separator />
          <div className="text-right font-bold">核心评分合计：{coreScore} 分</div>
        </CardContent>
      </Card>

      {/* 风险等级判定 */}
      <Card>
        <CardHeader><CardTitle>二、风险等级判定</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className={`text-lg px-4 py-2 ${riskLevelColor[riskLevel]}`}>
              {riskLevelLabel[riskLevel]}
            </Badge>
            <span className="text-sm text-muted-foreground">核心评分 {coreScore} 分</span>
          </div>
        </CardContent>
      </Card>

      {/* 推荐预防措施 */}
      <Card>
        <CardHeader><CardTitle>三、推荐预防措施</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed bg-muted p-4 rounded-md">{recommendation}</p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>取消</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "提交中..." : "提交评估"}
        </Button>
      </div>
    </div>
  );
}
