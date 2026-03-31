"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { riskLevelLabel, riskLevelColor, type RiskLevel } from "@/lib/risk";

interface AssessmentDetail {
  id: number;
  patientName: string;
  gender: string;
  age: number;
  medicalRecordNo: string;
  weight: number;
  examType: string;
  examDate: string;
  isFemale: boolean;
  hasMotionSicknessHistory: boolean;
  isNonSmoker: boolean;
  usedOpioids: boolean;
  coreScore: number;
  durationOver60Min: boolean;
  preOpAnxiety: boolean;
  riskLevel: RiskLevel;
  recommendation: string;
  status: string;
  notes: string | null;
  assessor: { name: string };
  anesthetist: { name: string } | null;
  createdAt: string;
}

interface AssessmentListItem {
  id: number;
  status: string;
}

const statusLabel: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "处理中",
  COMPLETED: "已完成",
};

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoJumpTimerRef = useRef<number | null>(null);

  const parseCurrentId = () => {
    const raw = params.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const num = Number.parseInt(String(value), 10);
    return Number.isNaN(num) ? null : num;
  };

  const jumpToNextAssessment = async () => {
    const currentId = parseCurrentId();
    if (!currentId) return;

    try {
      const res = await fetch("/api/assessments", { cache: "no-store" });
      if (!res.ok) throw new Error("获取评估列表失败");
      const payload = (await res.json()) as unknown;
      const list = Array.isArray(payload) ? (payload as AssessmentListItem[]) : [];
      const pendingList = list.filter((item) => item.status !== "COMPLETED");

      if (pendingList.length === 0) {
        toast.success("当前没有待处理评估，已返回评估列表");
        router.push("/assessments");
        return;
      }

      const next = pendingList.find((item) => item.id !== currentId);
      if (!next) {
        toast.success("当前没有其他待处理评估，已返回评估列表");
        router.push("/assessments");
        return;
      }

      router.push(`/assessments/${next.id}`);
    } catch {
      toast.error("自动跳转下一位失败");
    }
  };

  const scheduleNextAssessmentJump = () => {
    if (autoJumpTimerRef.current) {
      window.clearTimeout(autoJumpTimerRef.current);
    }
    autoJumpTimerRef.current = window.setTimeout(() => {
      void jumpToNextAssessment();
    }, 3000);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/assessments/${params.id}`);
        const payload = (await res.json()) as AssessmentDetail & { error?: string };
        if (!res.ok) throw new Error(payload.error || "获取评估详情失败");
        if (!cancelled) {
          setData(payload);
          setNotes(payload.notes || "");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "获取评估详情失败");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    return () => {
      if (autoJumpTimerRef.current) {
        window.clearTimeout(autoJumpTimerRef.current);
      }
    };
  }, []);

  const updateStatus = async (status: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/assessments/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setData(updated);
      if (status === "COMPLETED") {
        toast.success("已标记完成，3秒后自动跳转下一位");
        scheduleNextAssessmentJump();
      } else {
        toast.success("已开始处理");
      }
    } catch {
      toast.error("操作失败");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/assessments/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as AssessmentDetail;
      setData(updated);
      setNotes(updated.notes || "");
      toast.success("备注已保存");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="text-destructive">{error}</div>;
  if (!data) return <div className="text-muted-foreground">加载中...</div>;

  const isDoctor = user?.role === "ANESTHETIST" || user?.role === "ADMIN";

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">评估详情</h2>
        <Button variant="outline" onClick={() => router.back()}>返回</Button>
      </div>

      {/* 患者信息 */}
      <Card>
        <CardHeader><CardTitle>患者信息</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">姓名：</span>{data.patientName}</div>
          <div><span className="text-muted-foreground">性别：</span>{data.gender === "MALE" ? "男" : "女"}</div>
          <div><span className="text-muted-foreground">年龄：</span>{data.age} 岁</div>
          <div><span className="text-muted-foreground">病历号：</span>{data.medicalRecordNo}</div>
          <div><span className="text-muted-foreground">体重：</span>{data.weight} kg</div>
          <div><span className="text-muted-foreground">检查类型：</span>{data.examType.split(",").map((t) => ({ GASTROSCOPY: "无痛胃镜", COLONOSCOPY: "无痛肠镜", COMBINED: "胃肠镜联合检查" }[t] || t)).join("、")}</div>
          <div><span className="text-muted-foreground">检查日期：</span>{new Date(data.examDate).toLocaleDateString("zh-CN")}</div>
          <div><span className="text-muted-foreground">评估人：</span>{data.assessor.name}</div>
          <div><span className="text-muted-foreground">状态：</span>{statusLabel[data.status]}</div>
        </CardContent>
      </Card>

      {/* 风险评估结果 */}
      <Card>
        <CardHeader><CardTitle>风险评估结果</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">核心风险因素（{data.coreScore}分）</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className={data.isFemale ? "font-medium" : "text-muted-foreground"}>
                {data.isFemale ? "✓" : "✗"} 女性
              </div>
              <div className={data.hasMotionSicknessHistory ? "font-medium" : "text-muted-foreground"}>
                {data.hasMotionSicknessHistory ? "✓" : "✗"} 晕动症/既往PONV病史
              </div>
              <div className={data.isNonSmoker ? "font-medium" : "text-muted-foreground"}>
                {data.isNonSmoker ? "✓" : "✗"} 非吸烟状态
              </div>
              <div className={data.usedOpioids ? "font-medium" : "text-muted-foreground"}>
                {data.usedOpioids ? "✓" : "✗"} 术中使用阿片类药物
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">其他信息</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className={data.durationOver60Min ? "font-medium" : "text-muted-foreground"}>
                {data.durationOver60Min ? "✓" : "✗"} 预计操作时长≥60分钟
              </div>
              <div className={data.preOpAnxiety ? "font-medium" : "text-muted-foreground"}>
                {data.preOpAnxiety ? "✓" : "✗"} 术前焦虑
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">风险等级：</span>
            <Badge className={`text-base px-4 py-1 ${riskLevelColor[data.riskLevel]}`}>
              {riskLevelLabel[data.riskLevel]}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">推荐预防措施</p>
            <p className="text-sm bg-muted p-4 rounded-md leading-relaxed">{data.recommendation}</p>
          </div>
        </CardContent>
      </Card>

      {/* 麻醉医生操作区 */}
      {isDoctor && (
        <Card>
          <CardHeader><CardTitle>麻醉医生操作</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data.anesthetist && (
              <p className="text-sm text-muted-foreground">处理医生：{data.anesthetist.name}</p>
            )}
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="添加处理备注..." rows={3} />
              <Button variant="outline" size="sm" onClick={saveNotes} disabled={saving}>保存备注</Button>
            </div>
            <div className="flex gap-2">
              {data.status === "PENDING" && (
                <Button onClick={() => updateStatus("IN_PROGRESS")} disabled={saving}>开始处理</Button>
              )}
              {data.status === "IN_PROGRESS" && (
                <Button onClick={() => updateStatus("COMPLETED")} disabled={saving}>标记完成</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
