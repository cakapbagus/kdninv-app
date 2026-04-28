import { NextResponse } from "next/server";
import { sql } from '@/lib/db'

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  await sql`SELECT 1`;
  const ms = Date.now() - start;

  return NextResponse.json({ ok: true, db_ms: ms, ts: new Date().toISOString() });
}
