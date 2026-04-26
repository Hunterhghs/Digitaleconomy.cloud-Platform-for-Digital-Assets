import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RATE_PER_MINUTE = 30;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (b.count >= RATE_PER_MINUTE) return false;
  b.count += 1;
  return true;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse("Bad id", { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip)) {
    return new NextResponse("Too many downloads, slow down.", { status: 429 });
  }

  const supabase = await createClient();
  const { data: asset, error } = await supabase
    .from("assets")
    .select("id, file_path, mime_type, status, title")
    .eq("id", id)
    .maybeSingle();

  if (error || !asset) return new NextResponse("Not found", { status: 404 });
  if (asset.status !== "published") return new NextResponse("Not available", { status: 403 });

  const { data: signed, error: signErr } = await supabase.storage
    .from("assets-original")
    .createSignedUrl(asset.file_path, 60, {
      download:
        asset.title.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80) +
        "." +
        (asset.file_path.split(".").pop() ?? "bin"),
    });
  if (signErr || !signed?.signedUrl) {
    return new NextResponse("Could not sign download URL", { status: 500 });
  }

  await supabase.rpc("increment_download_count", { p_asset_id: id });

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
