"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/sonner";
import { fileReport } from "@/app/(app)/_actions/engagement";

const REASONS = [
  { id: "copyright", label: "Copyright infringement" },
  { id: "spam", label: "Spam or junk" },
  { id: "harmful", label: "Harmful or hateful content" },
  { id: "illegal", label: "Illegal content" },
  { id: "csam", label: "Child sexual abuse material" },
  { id: "personal_info", label: "Personal information" },
  { id: "other", label: "Other" },
];

export function ReportDialog({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();
  const { toast } = useToast();

  function submit() {
    if (!reason) return;
    const fd = new FormData();
    fd.set("asset_id", assetId);
    fd.set("reason", reason);
    fd.set("details", details);
    start(async () => {
      const res = await fileReport(fd);
      toast({
        title: res.ok ? "Report sent" : "Couldn't send report",
        description: res.message,
        variant: res.ok ? "success" : "error",
      });
      if (res.ok) {
        setOpen(false);
        setReason("");
        setDetails("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Flag className="h-4 w-4" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this asset</DialogTitle>
          <DialogDescription>
            Reports go to our moderation team. Provide details to help us act faster.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Details (optional)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything that helps us act on this report..."
              maxLength={2000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !reason}>
            {pending ? "Sending..." : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
