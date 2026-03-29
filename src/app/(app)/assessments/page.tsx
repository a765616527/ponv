"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { riskLevelLabel, riskLevelColor, type RiskLevel } from "@/lib/risk";

interface Assessment {
  id: number;
  patientName: string;
  gender: string;
  age: number;
  examType: string;
  riskLevel: RiskLevel;
  status: string;
  createdAt: string;
  assessor: { name: string };
  anesthetist: { name: string } | null;
}

const examTypeLabel: Record<string, string> = {
  GASTROSCOPY: "无痛胃镜",
  COLONOSCOPY: "无痛肠镜",
  COMBINED: "胃肠镜联合",
};

const statusLabel: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "处理中",
  COMPLETED: "已完成",
};

const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default function AssessmentsPage() {
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/assessments");
        if (!res.ok) throw new Error("获取评估列表失败");
        const data = (await res.json()) as unknown;
        if (!cancelled) {
          setList(Array.isArray(data) ? (data as Assessment[]) : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "获取评估列表失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="text-muted-foreground">加载中...</div>;
  if (error) return <div className="text-destructive">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">评估列表</h2>
        <span className="text-sm text-muted-foreground">共 {list.length} 条</span>
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground">暂无评估记录</p>
      ) : (
        <>
          {/* 移动端卡片列表 */}
          <div className="md:hidden space-y-3">
            {list.map((a) => (
              <Link key={a.id} href={`/assessments/${a.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{a.patientName}</span>
                      <Badge className={riskLevelColor[a.riskLevel]}>{riskLevelLabel[a.riskLevel]}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{a.gender === "MALE" ? "男" : "女"}</span>
                      <span>{a.age}岁</span>
                      <span>{examTypeLabel[a.examType]}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <Badge className={statusColor[a.status]}>{statusLabel[a.status]}</Badge>
                      <span className="text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* 桌面端表格 */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>患者姓名</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>年龄</TableHead>
                  <TableHead>检查类型</TableHead>
                  <TableHead>风险等级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>评估人</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{a.patientName}</TableCell>
                    <TableCell>{a.gender === "MALE" ? "男" : "女"}</TableCell>
                    <TableCell>{a.age}</TableCell>
                    <TableCell>{examTypeLabel[a.examType]}</TableCell>
                    <TableCell><Badge className={riskLevelColor[a.riskLevel]}>{riskLevelLabel[a.riskLevel]}</Badge></TableCell>
                    <TableCell><Badge className={statusColor[a.status]}>{statusLabel[a.status]}</Badge></TableCell>
                    <TableCell>{a.assessor.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/assessments/${a.id}`}>
                        <Button variant="outline" size="sm">查看详情</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
