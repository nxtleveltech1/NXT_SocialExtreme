"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, RotateCcw, Save, Unplug } from "lucide-react";
import { toast } from "sonner";
import type { PLATFORM_DEFS, PlatformSlug } from "@/lib/platform-credentials";

type CredStatus = {
  hasValue: boolean;
  isEnvBacked: boolean;
  isSecret: boolean;
  last4: string | null;
  updatedAt: string | null;
};

type PlatformCredentials = Record<string, CredStatus>;
type AllCredentials = Record<PlatformSlug, PlatformCredentials>;

type PlatformDef = typeof PLATFORM_DEFS[PlatformSlug];

const PLATFORM_ICONS: Record<PlatformSlug, string> = {
  meta: "🟦",
  tiktok: "⬛",
  whatsapp: "🟩",
};

function SecretInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function PlatformCard({
  slug,
  def,
  statuses,
  onSave,
}: {
  slug: PlatformSlug;
  def: PlatformDef;
  statuses: PlatformCredentials;
  onSave: (platform: PlatformSlug, updates: Record<string, string | null>) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cleared, setCleared] = useState<Record<string, boolean>>({});

  const handleSave = async () => {
    setSaving(true);
    const updates: Record<string, string | null> = {};
    for (const cred of def.credentials) {
      if (cleared[cred.key]) {
        updates[cred.key] = null;
      } else if (drafts[cred.key] !== undefined && drafts[cred.key].trim() !== "") {
        updates[cred.key] = drafts[cred.key];
      }
    }
    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save.");
      setSaving(false);
      return;
    }
    await onSave(slug, updates);
    setDrafts({});
    setCleared({});
    setSaving(false);
  };

  const handleClear = (key: string) => {
    setDrafts((d) => { const c = { ...d }; delete c[key]; return c; });
    setCleared((c) => ({ ...c, [key]: true }));
  };

  const handleChange = (key: string, value: string) => {
    setDrafts((d) => ({ ...d, [key]: value }));
    setCleared((c) => { const n = { ...c }; delete n[key]; return n; });
  };

  const connectedCount = def.credentials.filter((c) => statuses[c.key]?.hasValue).length;
  const allConnected = connectedCount === def.credentials.length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{PLATFORM_ICONS[slug]}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900">{def.label}</h3>
              {allConnected && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 size={10} /> All set
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{def.description}</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          {connectedCount}/{def.credentials.length} configured
        </span>
      </div>

      {/* Credential fields */}
      <div className="space-y-4">
        {def.credentials.map((cred) => {
          const status = statuses[cred.key];
          const isClearedLocally = cleared[cred.key];
          const hasDraft = drafts[cred.key] !== undefined && drafts[cred.key].trim() !== "";

          return (
            <div key={cred.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">{cred.label}</label>
                <div className="flex items-center gap-2">
                  {status?.isEnvBacked && !isClearedLocally && !hasDraft && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      ENV
                    </span>
                  )}
                  {status?.hasValue && !isClearedLocally && !hasDraft && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {status.isEnvBacked
                        ? `from .env ···${status.last4 ?? ""}`
                        : `saved ···${status.last4 ?? ""}`}
                    </span>
                  )}
                  {isClearedLocally && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      will be removed
                    </span>
                  )}
                  {status?.hasValue && (
                    <button
                      type="button"
                      onClick={() => handleClear(cred.key)}
                      title="Remove stored value"
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              </div>

              {cred.isSecret ? (
                <SecretInput
                  value={isClearedLocally ? "" : (drafts[cred.key] ?? "")}
                  onChange={(v) => handleChange(cred.key, v)}
                  placeholder={
                    isClearedLocally
                      ? "Enter new value…"
                      : status?.hasValue
                      ? `Current: ···${status.last4 ?? "****"} — paste to rotate`
                      : cred.placeholder
                  }
                />
              ) : (
                <input
                  type="text"
                  value={isClearedLocally ? "" : (drafts[cred.key] ?? "")}
                  onChange={(e) => handleChange(cred.key, e.target.value)}
                  placeholder={
                    isClearedLocally
                      ? "Enter new value…"
                      : status?.hasValue && !status.isEnvBacked
                      ? "Stored in DB — paste to update"
                      : status?.hasValue && status.isEnvBacked
                      ? "From .env — paste to override"
                      : cred.placeholder
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
              {cred.hint && <p className="text-[11px] text-gray-400">{cred.hint}</p>}
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export default function IntegrationsPanel() {
  const [credentials, setCredentials] = useState<AllCredentials | null>(null);
  const [platformDefs, setPlatformDefs] = useState<Record<PlatformSlug, PlatformDef> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/integrations");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCredentials(data.credentials);
      setPlatformDefs(data.platforms);
    } catch {
      toast.error("Failed to load integration credentials");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (platform: PlatformSlug, updates: Record<string, string | null>) => {
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setCredentials(data.credentials);
      toast.success("Credentials saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save credentials");
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3 text-sm text-gray-500">
        <Loader2 size={18} className="animate-spin" /> Loading integrations…
      </div>
    );
  }

  if (!credentials || !platformDefs) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Unplug size={32} className="text-gray-300" />
        <p className="text-sm text-gray-500">Could not load integration settings.</p>
        <button onClick={load} className="text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
        <strong>How this works:</strong> Values saved here are encrypted in the database and override <code className="bg-blue-100 px-1 rounded">.env</code> / Vercel environment variables at runtime.
        Fields marked <span className="font-bold text-amber-700 bg-amber-100 px-1 rounded text-xs">ENV</span> are currently read from your environment — paste a value to store it in the DB instead.
      </div>

      {(Object.entries(platformDefs) as [PlatformSlug, PlatformDef][]).map(([slug, def]) => (
        <PlatformCard
          key={slug}
          slug={slug}
          def={def}
          statuses={credentials[slug] ?? {}}
          onSave={handleSave}
        />
      ))}
    </div>
  );
}
