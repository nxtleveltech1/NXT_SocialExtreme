"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Facebook, Instagram } from "lucide-react";

type Candidate =
  | {
      type: "facebook_page";
      pageId: string;
      pageName: string;
    }
  | {
      type: "instagram_business";
      pageId: string;
      pageName: string;
      igId: string;
      igUsername: string | null;
    };

export default function MetaAccountSelectClient(props: {
  channelId: number;
  channelPlatform: string;
  channelName: string;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => props.candidates[selectedIdx], [props.candidates, selectedIdx]);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/meta/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: props.channelId,
          ...selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to finalize Meta connection");

      router.push("/channels");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Select a Meta account</h1>
        <p className="text-muted-foreground">
          Choose which Facebook Page / Instagram Business account to connect for{" "}
          <span className="font-semibold text-foreground">{props.channelName}</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {props.channelPlatform === "Instagram" ? (
              <>
                <Instagram className="text-pink-600" size={18} /> Instagram Business
              </>
            ) : (
              <>
                <Facebook className="text-blue-600" size={18} /> Facebook Page
              </>
            )}
          </CardTitle>
          <CardDescription>We’ll use a Page token (encrypted) for publishing and syncing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {props.candidates.map((c, idx) => {
            const active = idx === selectedIdx;
            return (
              <button
                key={`${c.type}:${c.pageId}:${"igId" in c ? c.igId : ""}`}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={[
                  "w-full text-left rounded-xl border p-4 transition-colors",
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-accent/30",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground truncate">{c.pageName}</p>
                      <Badge variant={active ? "default" : "secondary"}>
                        {c.type === "facebook_page" ? "Facebook Page" : "Instagram Business"}
                      </Badge>
                    </div>
                    {"igUsername" in c && c.igUsername ? (
                      <p className="text-xs text-muted-foreground mt-1">@{c.igUsername}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">ID: {c.pageId}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{active ? "Selected" : ""}</div>
                </div>
              </button>
            );
          })}

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
            <Button variant="outline" onClick={() => router.push("/channels")} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Connecting…
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





