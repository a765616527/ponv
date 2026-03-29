import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "PONV风险评估系统",
  description: "术后恶心呕吐风险评估管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full bg-background text-foreground antialiased font-sans">
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
