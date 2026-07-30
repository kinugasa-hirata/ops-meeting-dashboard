# Ops会議ダッシュボード

Notion「Ops Meeting Log」を正データとして、Gmail(OpsMeetingラベル)とNotionの更新イベントを
自動で取り込み、Claude APIで整形し、ダッシュボードで閲覧できるようにする最小構成です。

コードはすべて用意済みです。**以下は「実際に外部サービスに登録する」作業で、これはご自身で行っていただく必要があります**
（このチャット上のClaudeはサーバーの起動やGCP/Vercelへの実登録はできません）。

## 全体構成

```
Gmail(OpsMeetingラベル) --Pub/Sub push--> /api/gmail/webhook --> Claude API --> Notion更新
Notion(ページ更新)      --Webhook------->  /api/notion/webhook -----------------> ログ出力
Vercel Cron(6日毎)      ---------------->  /api/gmail/watch  --> Gmail watch再登録
ダッシュボード(/dashboard) <--60秒キャッシュ-- Notion DB
```

## 事前準備チェックリスト

### 1. Notion側
1. https://www.notion.so/my-integrations で Internal Integration を作成し、トークン(`secret_...`)を取得
2. 「Ops Meeting Log」データベースの「Connections」からこのIntegrationを接続
3. データベースURLから `NOTION_DATABASE_ID` を取得（URL中の32桁のハイフンなしID）
4. （任意・ベータ機能）Notion管理画面の「Webhooks」からこのデータベースの `page.updated` イベントを
   `https://<your-domain>/api/notion/webhook` に向けて登録。登録時に届く `verification_token` を
   ログで確認し、Notion側の画面に貼り付けて有効化

### 2. Google Cloud / Gmail側
1. GCPプロジェクトを新規作成
2. Gmail API と Cloud Pub/Sub API を有効化
3. Pub/Subトピックを作成（例: `gmail-ops-meeting`）
4. そのトピックに対して、Gmail用のサービスアカウント
   (`gmail-api-push@system.gserviceaccount.com`) に **Pub/Sub Publisher** 権限を付与
   （Googleの手順: https://developers.google.com/gmail/api/guides/push が最新の一次情報です）
5. Pub/Subの「Push」サブスクリプションを作成し、エンドポイントを
   `https://<your-domain>/api/gmail/webhook` に設定
6. サービスアカウント（アプリ用）を作成し、Gmailユーザーへの**ドメイン全体委任(DWD)**を設定
   （Google Workspace管理コンソールでの設定が必要。個人Gmailの場合はOAuthユーザーフローに変更してください）
7. 秘密鍵(JSON)から `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` を `.env` に設定

### 3. Anthropic側
1. https://console.anthropic.com で APIキーを発行 → `ANTHROPIC_API_KEY`
2. コストを抑えたい場合は `.env` の `ANTHROPIC_MODEL` を Haiku系のモデルのままにしておく

### 4. Vercelへのデプロイ
```bash
npm install
vercel link
vercel env add NOTION_API_KEY
vercel env add NOTION_DATABASE_ID
vercel env add GOOGLE_CLIENT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel env add GMAIL_USER
vercel env add GOOGLE_PUBSUB_TOPIC
vercel env add ANTHROPIC_API_KEY
vercel env add CRON_SECRET
vercel deploy --prod
```
デプロイ後、初回だけ手動で `/api/gmail/watch` を1回呼び出して watch を開始してください
（以降は `vercel.json` の cron が6日おきに自動更新します）。

## 既知の制約

- **Notion Webhookはページ本文のブロック編集までは検知しません**（プロパティ変更のみ）。
  本文の変更まで拾いたい場合は、ダッシュボード側で定期ポーリング（`revalidate`の値を短くする）を
  組み合わせてください。
- Gmailの `users.watch` は **7日で失効**します。`vercel.json` のcronで6日おきに再登録していますが、
  Vercelのcronは分単位の厳密な保証はないため、余裕を持たせています。
- OAuth同意画面が「テスト」状態のままだと、認可できるアカウント数が100件に制限されます。
  社内の特定ユーザーのみが対象であれば実務上問題になりにくいですが、対象を広げる場合は
  Googleの本番審査が必要です。
- サンプルの `lib/gmail.ts` はプレーンテキストメール本文のみを想定しています。
  HTMLメールや添付ファイル本文の抽出は別途実装が必要です。

## ローカル動作確認

```bash
cp .env.example .env.local  # 値を埋める
npm install
npm run dev
# http://localhost:3000/dashboard でNotionの内容が表示されれば連携成功
```
