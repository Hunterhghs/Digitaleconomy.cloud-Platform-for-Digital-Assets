import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { dismissReport, restoreAsset, takedownAsset } from "./_actions";

export const metadata = { title: "Moderator queue" };
export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  asset_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  asset: {
    id: string;
    title: string;
    slug: string;
    status: string;
    owner: { handle: string; display_name: string | null } | null;
  } | null;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "moderator" && profile.role !== "admin")) {
    redirect("/");
  }

  const { data: openRaw } = await supabase
    .from("reports")
    .select(
      "id, asset_id, reason, details, status, created_at, asset:assets(id, title, slug, status, owner:profiles!assets_owner_id_fkey(handle, display_name))",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const reports = ((openRaw ?? []) as unknown as Array<Omit<ReportRow, "asset"> & {
    asset: ReportRow["asset"] | ReportRow["asset"][];
  }>).map((r) => ({
    ...r,
    asset: Array.isArray(r.asset) ? r.asset[0] ?? null : r.asset,
  })) as ReportRow[];

  const open = reports.filter((r) => r.status === "open");
  const closed = reports.filter((r) => r.status !== "open");

  return (
    <div className="container-page py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Moderator queue</h1>
        <p className="text-sm text-muted-foreground">
          {open.length} open · {closed.length} resolved (last 100)
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Open reports
        </h2>
        {open.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nothing to review. Nice work.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {open.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </section>

      {closed.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recently resolved
          </h2>
          <div className="grid gap-3">
            {closed.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ReportCard({ report }: { report: ReportRow }) {
  const a = report.asset;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {a ? (
            <Link className="hover:underline" href={`/a/${a.owner?.handle ?? "unknown"}/${a.slug}`}>
              {a.title}
            </Link>
          ) : (
            <span className="text-muted-foreground">[asset deleted]</span>
          )}
          <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
          {a?.status ? <Badge variant="outline">asset: {a.status}</Badge> : null}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Reason: <span className="font-medium text-foreground">{report.reason}</span> · filed{" "}
          {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {report.details ? <p className="whitespace-pre-wrap text-sm">{report.details}</p> : null}
        {report.status === "open" && a ? (
          <div className="flex flex-wrap items-center gap-2">
            <form action={takedownAsset} className="flex flex-1 items-center gap-2">
              <input type="hidden" name="id" value={a.id} />
              <input
                name="note"
                placeholder="Resolution note (optional)"
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              />
              <Button type="submit" variant="destructive" size="sm">
                Take down
              </Button>
            </form>
            <form action={dismissReport}>
              <input type="hidden" name="id" value={report.id} />
              <Button type="submit" variant="outline" size="sm">
                Dismiss
              </Button>
            </form>
          </div>
        ) : a?.status === "removed" ? (
          <form action={restoreAsset}>
            <input type="hidden" name="id" value={a.id} />
            <Button type="submit" variant="outline" size="sm">
              Restore asset
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function statusVariant(s: string): "default" | "warning" | "success" | "destructive" {
  if (s === "open") return "warning";
  if (s === "actioned") return "destructive";
  return "success";
}
