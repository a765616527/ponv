"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

const roleLabel: Record<string, string> = {
  ADMIN: "管理员",
  ASSESSOR: "评估人员",
  ANESTHETIST: "麻醉医生",
};

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "ASSESSOR" });
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setUsersLoading(false);
      return;
    }

    if (currentUser && currentUser.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    void fetchUsers();
  }, [authLoading, currentUser, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = (await res.json()) as User[] & { error?: string };
      if (!res.ok) throw new Error(data.error || "加载用户列表失败");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setUsers([]);
      toast.error(e instanceof Error ? e.message : "加载用户列表失败");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.name) {
      toast.error("请填写完整信息");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("用户创建成功");
      setOpen(false);
      setForm({ username: "", password: "", name: "", role: "ASSESSOR" });
      await fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || usersLoading) {
    return <div className="text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">用户管理</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            新建用户
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新建用户</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>用户名</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>密码</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? "ASSESSOR" })}>
                  <SelectTrigger><SelectValue>{(v: string) => ({ ASSESSOR: "评估人员", ANESTHETIST: "麻醉医生", ADMIN: "管理员" }[v] || "")}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSESSOR">评估人员</SelectItem>
                    <SelectItem value="ANESTHETIST">麻醉医生</SelectItem>
                    <SelectItem value="ADMIN">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={loading} className="w-full">
                {loading ? "创建中..." : "创建"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 移动端卡片 */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-sm text-muted-foreground">{u.username}</div>
              </div>
              <Badge variant="outline">{roleLabel[u.role]}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 桌面端列表 */}
      <div className="hidden md:block space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
            <div className="flex items-center gap-6">
              <span className="font-medium w-24">{u.username}</span>
              <span>{u.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">{roleLabel[u.role]}</Badge>
              <span className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("zh-CN")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
