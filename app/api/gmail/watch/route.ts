import { NextRequest, NextResponse } from "next/server";
import { renewWatch } from "@/lib/gmail";

// Vercel Cron（vercel.json参照）が定期的に呼び出す。
// Gmail watchは7日で失効するため、6日おきに再登録することで無人運用にする。
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await renewWatch();
    return NextResponse.json({ ok: true, expiration: result.expiration });
  } catch (err: any) {
    console.error("watch renewal failed", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
