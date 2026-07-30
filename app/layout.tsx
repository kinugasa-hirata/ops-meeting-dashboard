export const metadata = {
  title: "Ops会議ダッシュボード",
  description: "工場オペレーション×マーケティング/営業 週次定例会議アシスタント",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "'Hiragino Sans', sans-serif", background: "#F7F7F5" }}>
        {children}
      </body>
    </html>
  );
}
