import { listRecentWeeks } from "@/lib/notion";

// ビルド時にNotionへ接続しようとして環境変数不足で失敗するのを防ぐため、
// このページは常にリクエスト時に描画する（ビルド時の静的生成をしない）。
export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string | null }) {
  const color = status === "完了" ? "#639922" : "#D85A30";
  const bg = status === "完了" ? "#EAF3DE" : "#FAECE7";
  return (
    <span
      style={{
        color,
        background: bg,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {status ?? "未設定"}
    </span>
  );
}

export default async function DashboardPage() {
  let weeks: Awaited<ReturnType<typeof listRecentWeeks>> = [];
  let loadError: string | null = null;

  try {
    weeks = await listRecentWeeks(12);
  } catch (err: any) {
    loadError = err?.message ?? "不明なエラー";
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Ops会議ダッシュボード</h1>
      <p style={{ color: "#5F5E5A", fontSize: 14, marginBottom: 28 }}>
        Notionの「Ops Meeting Log」を自動取得しています。更新はGmail/Notionのイベントを受けて裏側で行われます。
      </p>

      {loadError && (
        <section
          style={{
            background: "#FAECE7",
            border: "1px solid #F0997B",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            color: "#712B13",
            fontSize: 13,
          }}
        >
          Notionからの取得に失敗しました: {loadError}
          <br />
          Vercelの Project Settings → Environment Variables に
          `NOTION_API_KEY` / `NOTION_DATABASE_ID` が正しく設定されているか、
          Notion側で「Ops Assistant」インテグレーションがこのデータベースに
          接続(Connections)されているかを確認してください。
        </section>
      )}

      {weeks.map((w) => (
        <section
          key={w.id}
          style={{
            background: "#fff",
            border: "1px solid #E5E4DD",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{w.week}</h2>
            <StatusBadge status={w.status} />
          </div>

          {w.prep && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 500 }}>準備資料</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#3D3D3A" }}>{w.prep}</pre>
            </details>
          )}
          {w.summary && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 500 }}>要約</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#3D3D3A" }}>{w.summary}</pre>
            </details>
          )}
          {w.actionItems && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                アクションアイテム
              </summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#3D3D3A" }}>
                {w.actionItems}
              </pre>
            </details>
          )}

          
            href={w.url}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-block", marginTop: 12, fontSize: 13, color: "#185FA5" }}
          >
            Notionで開く ↗
          </a>
        </section>
      ))}

      {!loadError && weeks.length === 0 && (
        <p style={{ color: "#888780", fontSize: 14 }}>まだ週のページがありません。</p>
      )}
    </main>
  );
}