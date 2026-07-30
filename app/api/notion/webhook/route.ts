import { NextRequest, NextResponse } from "next/server";

// NotionのWebhookサブスクリプションは、登録時に検証チャレンジを送ってくる。
// {"verification_token": "..."} がbodyに来たら、Notionの管理画面にそのまま
// 貼り付けて有効化する（自動化したい場合はメール通知をパースする必要あり）。
// 通常運用時のbody例: { type: "page.updated", entity: { id, type: "page" }, ... }
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.verification_token) {
    console.log("Notion webhook verification token:", body.verification_token);
    return NextResponse.json({ ok: true });
  }

  // page.updated / page.content_updated 等のイベントをここで処理する。
  // 現状のNotion Webhookはページ「プロパティ」変更を主に通知し、
  // 本文ブロックの編集までは拾わない点に注意（README参照）。
  console.log("Notion webhook event:", JSON.stringify(body));

  // 例: ステータスが「完了」に変わったら、ダッシュボードのキャッシュを再検証する等。
  // 現状は受信ログのみ。必要に応じて実装を追加してください。

  return NextResponse.json({ ok: true });
}
