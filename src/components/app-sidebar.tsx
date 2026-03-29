"use client";

import { useAuth } from "@/components/providers";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = {
  ADMIN: [
    { href: "/dashboard", label: "仪表盘" },
    { href: "/assessments", label: "评估列表" },
    { href: "/assessments/new", label: "新建评估" },
    { href: "/admin/users", label: "用户管理" },
  ],
  ASSESSOR: [
    { href: "/dashboard", label: "仪表盘" },
    { href: "/assessments", label: "评估列表" },
    { href: "/assessments/new", label: "新建评估" },
  ],
  ANESTHETIST: [
    { href: "/dashboard", label: "仪表盘" },
    { href: "/assessments", label: "评估列表" },
    { href: "/assessments/new", label: "新建评估" },
  ],
};

const roleLabel: Record<string, string> = {
  ADMIN: "管理员",
  ASSESSOR: "评估人员",
  ANESTHETIST: "麻醉医生",
};

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const role = (user?.role || "ASSESSOR") as keyof typeof navItems;
  const items = navItems[role] || navItems.ASSESSOR;

  return (
    <aside className="w-56 shrink-0 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg">PONV评估系统</h1>
        <p className="text-xs text-muted-foreground mt-1">术后恶心呕吐风险评估</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "block px-3 py-2 rounded-md text-sm transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {user && (
        <div className="p-4 border-t space-y-2">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-muted-foreground">{roleLabel[user.role]}</div>
          <button
            onClick={logout}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            退出登录
          </button>
        </div>
      )}
    </aside>
  );
}
