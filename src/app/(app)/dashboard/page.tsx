"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { riskLevelColor } from "@/lib/risk";
import type { RiskLevel } from "@/lib/risk";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface DashboardData {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  riskStats: { level: RiskLevel; count: number }[];
  trend: { date: string; count: number }[];
  recent: {
    id: number;
    patientName: string;
    riskLevel: RiskLevel;
    status: string;
    createdAt: string;
    assessor: { name: string };
  }[];
}

const statusLabel: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "处理中",
  COMPLETED: "已完成",
};

const PIE_COLORS: Record<RiskLevel, string> = {
  LOW: "#86efac",
  MEDIUM: "#fde047",
  HIGH: "#fb923c",
  EXTREME: "#f87171",
};

const SHORT_LABEL: Record<RiskLevel, string> = {
  LOW: "低风险",
  MEDIUM: "中风险",
  HIGH: "高风险",
  EXTREME: "极高危",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("加载仪表盘失败");
        const payload = (await res.json()) as DashboardData;
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载仪表盘失败");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="text-destructive">{error}</div>;
  if (!data) return <div className="text-muted-foreground">加载中...</div>;

  const today = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
  const pieData = data.riskStats.map((s) => ({ name: SHORT_LABEL[s.level], value: s.count, level: s.level }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">仪表盘</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">总评估数</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{data.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">待处理</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-yellow-600">{data.pending}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">处理中</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-blue-600">{data.inProgress}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">已完成</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-600">{data.completed}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 今日风险等级分布饼图 */}
        <Card>
          <CardHeader><CardTitle>今日风险等级分布（{today}）</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">今日暂无检查数据</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} ${value}`} labelLine={false}>
                      {pieData.map((entry) => (
                        <Cell key={entry.level} fill={PIE_COLORS[entry.level]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} 例`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((s) => (
                    <div key={s.level} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[s.level] }} />
                      <span>{SHORT_LABEL[s.level]}</span>
                      <span className="font-semibold ml-1">{s.value} 例</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 近7天趋势柱状图 */}
        <Card>
          <CardHeader><CardTitle>近7天每日评估量</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} 例`, "评估数"]} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 最近评估 */}
      <Card>
        <CardHeader><CardTitle>最近评估</CardTitle></CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {data.recent.map((a) => (
                <Link key={a.id} href={`/assessments/${a.id}`} className="flex items-center justify-between hover:bg-muted p-2 rounded-md transition-colors">
                  <div>
                    <span className="font-medium">{a.patientName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{a.assessor.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={riskLevelColor[a.riskLevel]}>{SHORT_LABEL[a.riskLevel]}</Badge>
                    <span className="text-xs text-muted-foreground">{statusLabel[a.status]}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
