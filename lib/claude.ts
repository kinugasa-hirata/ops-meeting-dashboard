import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

/**
 * 新着メール本文（OpsMeetingラベル）を、既存の準備資料に追記する形で整形する。
 * トークン量を抑えるため、既存の準備資料と新着メールの要点のみを渡す設計。
 */
export async function mergeNewMailIntoPrepDoc(params: {
  existingPrep: string;
  newMailSubject: string;
  newMailBody: string;
  meetingDateLabel: string; // 例: "2026年8月17日の週"
}): Promise<string> {
  const { existingPrep, newMailSubject, newMailBody, meetingDateLabel } = params;

  const system = [
    "あなたは製造業の調達/オペレーション部門とマーケティング/営業チームの週次定例会議を支援するアシスタントです。",
    "出力は日本語のMarkdownのみ。前置きや確認の言葉は書かないこと。",
    "既存の準備資料の構成（見出し、箇条書き）は維持しつつ、新着メールの内容を「前回以降の新着情報」セクションに追記してください。",
    "新着メールに既存の未対応アクションアイテムを解決する情報があれば、該当箇所に⇒で回答結果を追記してください。",
    "推測や新しい数値の創作はせず、メール本文に書かれている事実のみを使うこと。",
  ].join("\n");

  const user = [
    `## 会議: ${meetingDateLabel}`,
    "### 既存の準備資料",
    existingPrep || "(まだ準備資料なし)",
    "### 新着メール",
    `件名: ${newMailSubject}`,
    newMailBody,
  ].join("\n\n");

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: user }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : existingPrep;
}
