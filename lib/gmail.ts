import { google } from "googleapis";

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    subject: process.env.GMAIL_USER, // ドメイン全体委任(DWD)でこのユーザーになりすます
  });
}

function gmailClient() {
  return google.gmail({ version: "v1", auth: getAuth() });
}

/**
 * Gmail Push通知(watch)を(再)登録する。7日で失効するため、
 * Vercel Cronから6日おきに呼び出す想定。
 */
export async function renewWatch() {
  const gmail = gmailClient();
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: process.env.GOOGLE_PUBSUB_TOPIC,
      labelIds: [], // 全メール監視。ラベルIDで絞ることも可能（下記参照）
      labelFilterAction: "include",
    },
  });
  return res.data; // { historyId, expiration }
}

/** ラベル名からラベルIDを引く（初回セットアップ時に使用） */
export async function findLabelId(labelName: string): Promise<string | null> {
  const gmail = gmailClient();
  const res = await gmail.users.labels.list({ userId: "me" });
  const label = res.data.labels?.find((l) => l.name === labelName);
  return label?.id ?? null;
}

/**
 * Pub/Sub通知で受け取ったhistoryIdから、新着メッセージの差分を取得し、
 * OpsMeetingラベル付きのものだけ返す。
 */
export async function listNewOpsMeetingMessages(sinceHistoryId: string) {
  const gmail = gmailClient();
  const labelId = await findLabelId(process.env.GMAIL_LABEL_NAME || "OpsMeeting");
  if (!labelId) return [];

  const history = await gmail.users.history.list({
    userId: "me",
    startHistoryId: sinceHistoryId,
    labelId,
    historyTypes: ["messageAdded"],
  });

  const messageIds = new Set<string>();
  for (const h of history.data.history ?? []) {
    for (const m of h.messagesAdded ?? []) {
      if (m.message?.id) messageIds.add(m.message.id);
    }
  }

  const messages = await Promise.all(
    Array.from(messageIds).map((id) =>
      gmail.users.messages.get({ userId: "me", id, format: "full" })
    )
  );

  return messages.map((m) => {
    const headers = m.data.payload?.headers ?? [];
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "(件名なし)";
    const bodyPart = m.data.payload?.parts?.find((p) => p.mimeType === "text/plain");
    const bodyData = bodyPart?.body?.data || m.data.payload?.body?.data || "";
    const body = Buffer.from(bodyData, "base64").toString("utf-8");
    return { id: m.data.id!, subject, body };
  });
}
