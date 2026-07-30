import { NextRequest, NextResponse } from "next/server";
import { listNewOpsMeetingMessages } from "@/lib/gmail";
import { getLatestWeek, updateWeekProperties } from "@/lib/notion";
import { mergeNewMailIntoPrepDoc } from "@/lib/claude";

// Pub/Subのpushサブスクリプションが叩くエンドポイント。
// Body形式: { message: { data: base64(JSON), messageId, publishTime }, subscription }
export async function POST(req: NextRequest) {
  const body = await req.json();

  const dataB64 = body?.message?.data;
  if (!dataB64) {
    return NextResponse.json({ ok: true, note: "no data, ignored" });
  }

  const decoded = JSON.parse(Buffer.from(dataB64, "base64").toString("utf-8"));
  // decoded = { emailAddress, historyId }
  const historyId = String(decoded.historyId);

  try {
    const newMessages = await listNewOpsMeetingMessages(historyId);
    if (!newMessages.length) {
      return NextResponse.json({ ok: true, note: "no OpsMeeting-labeled messages" });
    }

    const week = await getLatestWeek();
    if (!week) {
      return NextResponse.json({ ok: true, note: "no active week page in Notion" });
    }

    let prep = week.prep ?? "";
    for (const msg of newMessages) {
      prep = await mergeNewMailIntoPrepDoc({
        existingPrep: prep,
        newMailSubject: msg.subject,
        newMailBody: msg.body,
        meetingDateLabel: week.week,
      });
    }

    await updateWeekProperties(week.id, { prep });

    return NextResponse.json({ ok: true, updated: newMessages.length });
  } catch (err: any) {
    console.error("gmail webhook error", err);
    // Pub/Subは非2xxをリトライする。恒久的エラーはログのみに留め200を返す運用でもよい。
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
