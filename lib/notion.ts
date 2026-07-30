import { Client } from "@notionhq/client";

export const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export type WeekPage = {
  id: string;
  week: string; // 「週」タイトルプロパティ
  date: string | null; // 「日付」
  status: string | null; // 「ステータス」
  prep: string | null; // 「準備資料」
  summary: string | null; // 「要約」
  actionItems: string | null; // 「アクションアイテム」
  url: string;
};

function richTextToPlain(prop: any): string | null {
  if (!prop) return null;
  const arr = prop.rich_text ?? prop.title ?? [];
  if (!arr.length) return null;
  return arr.map((t: any) => t.plain_text).join("");
}

function pageToWeekPage(page: any): WeekPage {
  const props = page.properties;
  return {
    id: page.id,
    week: richTextToPlain(props["週"]) ?? "",
    date: props["日付"]?.date?.start ?? null,
    status: props["ステータス"]?.status?.name ?? props["ステータス"]?.select?.name ?? null,
    prep: richTextToPlain(props["準備資料"]),
    summary: richTextToPlain(props["要約"]),
    actionItems: richTextToPlain(props["アクションアイテム"]),
    url: page.url,
  };
}

/** 直近N件の週ページを新しい順で取得する（ダッシュボード表示用） */
export async function listRecentWeeks(limit = 12): Promise<WeekPage[]> {
  const res = await notion.databases.query({
    database_id: DATABASE_ID,
    sorts: [{ property: "日付", direction: "descending" }],
    page_size: limit,
  });
  return res.results.map(pageToWeekPage);
}

/** 日付(YYYY-MM-DD)に一致する週ページを1件取得する */
export async function getWeekByDate(dateISO: string): Promise<WeekPage | null> {
  const res = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: "日付", date: { equals: dateISO } },
    page_size: 1,
  });
  if (!res.results.length) return null;
  return pageToWeekPage(res.results[0]);
}

/** 一番直近の週ページを1件取得する（Webhook等から「今週のページ」を引き当てる用途） */
export async function getLatestWeek(): Promise<WeekPage | null> {
  const weeks = await listRecentWeeks(1);
  return weeks[0] ?? null;
}

export async function updateWeekProperties(
  pageId: string,
  fields: Partial<Pick<WeekPage, "prep" | "summary" | "actionItems" | "status">>
) {
  const properties: Record<string, any> = {};
  if (fields.prep !== undefined) {
    properties["準備資料"] = { rich_text: [{ text: { content: fields.prep ?? "" } }] };
  }
  if (fields.summary !== undefined) {
    properties["要約"] = { rich_text: [{ text: { content: fields.summary ?? "" } }] };
  }
  if (fields.actionItems !== undefined) {
    properties["アクションアイテム"] = {
      rich_text: [{ text: { content: fields.actionItems ?? "" } }],
    };
  }
  if (fields.status !== undefined) {
    properties["ステータス"] = { status: { name: fields.status } };
  }
  await notion.pages.update({ page_id: pageId, properties });
}

/** 新しい週のページを作成する（例: 前回会議の翌週分を先に用意しておく） */
export async function createWeekPage(params: {
  week: string;
  dateISO: string;
  prep?: string;
}) {
  return notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      "週": { title: [{ text: { content: params.week } }] },
      "日付": { date: { start: params.dateISO } },
      "ステータス": { status: { name: "未対応" } },
      ...(params.prep
        ? { "準備資料": { rich_text: [{ text: { content: params.prep } }] } }
        : {}),
    },
  });
}
