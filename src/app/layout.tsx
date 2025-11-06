import type { Metadata } from "next";
import { AuthProvider } from '@/context/AuthContext';
import "./globals.css";

export const metadata: Metadata = {
  title: "図面確認アプリ",
  description: "建設現場向け図面計測アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <div className="min-h-screen">
              <main>
                  {children}
              </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
