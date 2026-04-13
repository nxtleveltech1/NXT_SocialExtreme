"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Cable, DollarSign, FileBarChart2, RefreshCcw, Route, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

type ProviderRecord = {
  id: number;
  slug: string;
  displayName: string;
  enabled: boolean;
  status: string;
  defaultModel: string | null;
  baseUrl: string | null;
  settings: Record<string, unknown> | null;
  lastValidationStatus?: string | null;
  lastValidationError?: string | null;
  credential: {
    last4: string | null;
    isEnvBacked: boolean;
  };
};

type RouteRecord = {
  id: number;
  routeKey: string;
  primaryProviderId: number | null;
  preferredModel: string | null;
  fallbackProviderIds: number[] | null;
  enabled: boolean;
};

type BudgetRecord = {
  id: number;
  providerId: number | null;
  routeKey: string | null;
  limitMicros: number;
  warningThresholdPercent: number;
  hardStop: boolean;
  enabled: boolean;
};

type ReconRecord = {
  id: number;
  providerSlug: string;
  periodStart: string;
  periodEnd: string;
  importedTotalMicros: number;
  estimatedTotalMicros: number;
  varianceMicros: number;
};

type LogRecord = {
  id: number;
  routeKey: string | null;
  model: string | null;
  status: string;
  requestType: string;
  estimatedCostMicros: number;
  createdAt: string | null;
};

type ModelRecord = {
  id: number;
  slug: string;
  displayName: string;
  defaultModel: string | null;
  models: string[];
};

type PromptTemplateRecord = {
  id: number;
  name: string;
  useCase: string;
};

type BrandProfileRecord = {
  id: number;
  name: string;
  businessName: string;
  brandVoice: string | null;
};

const ROUTE_LABELS: Record<string, string> = {
  "studio.copy": "Studio Copy",
  "studio.media.image": "Studio Image",
  "studio.media.video": "Studio Video",
  "agents.content": "Content Engine",
  "agents.reply": "Reply Agent",
};

function microsToUsd(value: number) {
  return (value / 1_000_000).toFixed(2);
}

export default function AIAdminPanel() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [reconciliationRuns, setReconciliationRuns] = useState<ReconRecord[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplateRecord[]>([]);
  const [brandProfiles, setBrandProfiles] = useState<BrandProfileRecord[]>([]);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingProviderId, setTestingProviderId] = useState<number | null>(null);
  const [providerDrafts, setProviderDrafts] = useState<Record<number, Record<string, string | boolean>>>({});
  const [newBudget, setNewBudget] = useState({
    providerId: "",
    routeKey: "",
    limitUsd: "25",
    warningThresholdPercent: "80",
    hardStop: false,
  });
  const [newRecon, setNewRecon] = useState({
    providerSlug: "openrouter",
    periodStart: "",
    periodEnd: "",
    importedTotalUsd: "0",
    notes: "",
  });

  const modelMap = useMemo(() => new Map(models.map((entry) => [entry.id, entry.models])), [models]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [providersRes, routingRes, budgetsRes, reconRes, modelsRes] = await Promise.all([
        fetch("/api/settings/ai/providers"),
        fetch("/api/settings/ai/routing"),
        fetch("/api/settings/ai/budgets"),
        fetch("/api/settings/ai/reconciliation"),
        fetch("/api/ai/models"),
      ]);

      const [providersData, routingData, budgetsData, reconData, modelsData] = await Promise.all([
        providersRes.json(),
        routingRes.json(),
        budgetsRes.json(),
        reconRes.json(),
        modelsRes.json(),
      ]);

      setProviders(providersData.providers || []);
      setRoutes(routingData.routes || []);
      setBudgets(budgetsData.budgets || []);
      setReconciliationRuns(reconData.reconciliationRuns || []);
      setLogs(providersData.logs || []);
      setPromptTemplates(providersData.promptTemplates || []);
      setBrandProfiles(providersData.brandProfiles || []);
      setModels(modelsData.providers || []);
      setProviderDrafts(
        Object.fromEntries(
          (providersData.providers || []).map((provider: ProviderRecord) => [
            provider.id,
            {
              enabled: provider.enabled,
              displayName: provider.displayName,
              defaultModel: provider.defaultModel || "",
              baseUrl: provider.baseUrl || "",
              apiKey: "",
              textEndpoint: String(provider.settings?.textEndpoint || ""),
              imageEndpoint: String(provider.settings?.imageEndpoint || ""),
              videoEndpoint: String(provider.settings?.videoEndpoint || ""),
            },
          ])
        )
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to load AI admin state");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateProviderDraft = (providerId: number, key: string, value: string | boolean) => {
    setProviderDrafts((current) => ({
      ...current,
      [providerId]: {
        ...current[providerId],
        [key]: value,
      },
    }));
  };

  const saveProvider = async (providerId: number) => {
    const draft = providerDrafts[providerId];
    try {
      // Only include endpoint settings that have actual values — an empty object
      // would overwrite existing endpoint config stored in the DB.
      const endpointSettings: Record<string, string> = {};
      if (draft.textEndpoint) endpointSettings.textEndpoint = String(draft.textEndpoint);
      if (draft.imageEndpoint) endpointSettings.imageEndpoint = String(draft.imageEndpoint);
      if (draft.videoEndpoint) endpointSettings.videoEndpoint = String(draft.videoEndpoint);

      const response = await fetch(`/api/settings/ai/providers/${providerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: draft.enabled,
          displayName: draft.displayName,
          defaultModel: draft.defaultModel || null,
          baseUrl: draft.baseUrl || null,
          apiKey: draft.apiKey || undefined,
          ...(Object.keys(endpointSettings).length > 0 ? { settings: endpointSettings } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save provider");
      toast.success("Provider settings saved");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save provider");
    }
  };

  const testProvider = async (providerId: number) => {
    setTestingProviderId(providerId);
    try {
      const response = await fetch(`/api/settings/ai/providers/${providerId}/test`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Connection test failed");
      toast.success(data.message || "Provider connection verified");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection test failed");
    } finally {
      setTestingProviderId(null);
    }
  };

  const saveRoute = async (route: RouteRecord) => {
    try {
      const response = await fetch("/api/settings/ai/routing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(route),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save routing");
      setRoutes(data.routes || []);
      toast.success("Routing saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save routing");
    }
  };

  const createBudget = async () => {
    try {
      const response = await fetch("/api/settings/ai/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: newBudget.providerId ? Number(newBudget.providerId) : null,
          routeKey: newBudget.routeKey || null,
          limitMicros: Math.round(Number(newBudget.limitUsd || "0") * 1_000_000),
          warningThresholdPercent: Number(newBudget.warningThresholdPercent || "80"),
          hardStop: newBudget.hardStop,
          enabled: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create budget");
      setBudgets(data.budgets || []);
      setNewBudget({ providerId: "", routeKey: "", limitUsd: "25", warningThresholdPercent: "80", hardStop: false });
      toast.success("Budget policy saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save budget");
    }
  };

  const createReconciliation = async () => {
    try {
      const response = await fetch("/api/settings/ai/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: newRecon.providerSlug,
          periodStart: new Date(newRecon.periodStart).toISOString(),
          periodEnd: new Date(newRecon.periodEnd).toISOString(),
          importedTotalMicros: Math.round(Number(newRecon.importedTotalUsd || "0") * 1_000_000),
          notes: newRecon.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create reconciliation");
      toast.success("Reconciliation run recorded");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save reconciliation");
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading AI admin...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 text-blue-600 p-3"><Bot size={20} /></div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Providers & Keys</h3>
              <p className="text-sm text-gray-500">Enable providers, rotate keys, and test connectivity.</p>
            </div>
          </div>

          <div className="space-y-4">
            {providers.map((provider) => {
              const draft = providerDrafts[provider.id] || {};
              const availableModels = modelMap.get(provider.id) || [];
              return (
                <div key={provider.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{provider.displayName}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${provider.status === "ready" ? "bg-green-100 text-green-700" : provider.status === "error" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                          {provider.status}
                        </span>
                        {provider.credential?.isEnvBacked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
                            ENV OVERRIDE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Slug: {provider.slug} {provider.credential?.last4 ? `• Key ending ${provider.credential.last4}` : "• No key stored"}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      Enabled
                      <input
                        type="checkbox"
                        checked={Boolean(draft.enabled)}
                        onChange={(e) => updateProviderDraft(provider.id, "enabled", e.target.checked)}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={String(draft.displayName || "")}
                      onChange={(e) => updateProviderDraft(provider.id, "displayName", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                      placeholder="Display name"
                    />
                    <select
                      value={String(draft.defaultModel || "")}
                      onChange={(e) => updateProviderDraft(provider.id, "defaultModel", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <option value="">Select default model</option>
                      {availableModels.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <input
                      value={String(draft.baseUrl || "")}
                      onChange={(e) => updateProviderDraft(provider.id, "baseUrl", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 md:col-span-2"
                      placeholder="Base URL"
                    />
                    <input
                      type="password"
                      value={String(draft.apiKey || "")}
                      onChange={(e) => updateProviderDraft(provider.id, "apiKey", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 md:col-span-2"
                      placeholder="Paste new API key to rotate"
                    />
                  </div>

                  {provider.slug === "krev" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        value={String(draft.textEndpoint || "")}
                        onChange={(e) => updateProviderDraft(provider.id, "textEndpoint", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                        placeholder="Text endpoint"
                      />
                      <input
                        value={String(draft.imageEndpoint || "")}
                        onChange={(e) => updateProviderDraft(provider.id, "imageEndpoint", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                        placeholder="Image endpoint"
                      />
                      <input
                        value={String(draft.videoEndpoint || "")}
                        onChange={(e) => updateProviderDraft(provider.id, "videoEndpoint", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                        placeholder="Video endpoint"
                      />
                    </div>
                  )}

                  {provider.lastValidationError && (
                    <p className="text-xs text-red-600 font-medium">{provider.lastValidationError}</p>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => saveProvider(provider.id)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">
                      Save Provider
                    </button>
                    <button
                      onClick={() => testProvider(provider.id)}
                      className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold"
                      disabled={testingProviderId === provider.id}
                    >
                      {testingProviderId === provider.id ? "Testing..." : "Test Connection"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-50 text-purple-600 p-3"><Route size={20} /></div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Routing Profiles</h3>
              <p className="text-sm text-gray-500">Choose which provider powers each AI surface.</p>
            </div>
          </div>

          <div className="space-y-4">
            {routes.map((route) => (
              <div key={route.id} className="rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_auto] gap-3 items-end">
                <div>
                  <p className="text-sm font-bold text-gray-900">{ROUTE_LABELS[route.routeKey] || route.routeKey}</p>
                  <p className="text-xs text-gray-500">{route.routeKey}</p>
                </div>
                <select
                  value={route.primaryProviderId || ""}
                  onChange={(e) => setRoutes((current) => current.map((item) => item.id === route.id ? { ...item, primaryProviderId: Number(e.target.value) } : item))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.displayName}</option>
                  ))}
                </select>
                <input
                  value={route.preferredModel || ""}
                  onChange={(e) => setRoutes((current) => current.map((item) => item.id === route.id ? { ...item, preferredModel: e.target.value } : item))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                  placeholder="Preferred model"
                />
                <button onClick={() => saveRoute(route)} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold">
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 text-emerald-600 p-3"><DollarSign size={20} /></div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Budgets & Controls</h3>
              <p className="text-sm text-gray-500">Set monthly limits by provider or route.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={newBudget.providerId} onChange={(e) => setNewBudget((current) => ({ ...current, providerId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <option value="">All providers</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.displayName}</option>
              ))}
            </select>
            <select value={newBudget.routeKey} onChange={(e) => setNewBudget((current) => ({ ...current, routeKey: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              <option value="">All routes</option>
              {Object.entries(ROUTE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input value={newBudget.limitUsd} onChange={(e) => setNewBudget((current) => ({ ...current, limitUsd: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50" placeholder="Monthly USD limit" />
            <input value={newBudget.warningThresholdPercent} onChange={(e) => setNewBudget((current) => ({ ...current, warningThresholdPercent: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50" placeholder="Warning %" />
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input type="checkbox" checked={newBudget.hardStop} onChange={(e) => setNewBudget((current) => ({ ...current, hardStop: e.target.checked }))} />
              Block requests when exceeded
            </label>
            <button onClick={createBudget} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold">
              Save Budget
            </button>
          </div>

          <div className="space-y-3">
            {budgets.map((budget) => (
              <div key={budget.id} className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm">
                <p className="font-bold text-gray-900">
                  {budget.routeKey ? ROUTE_LABELS[budget.routeKey] || budget.routeKey : "All routes"} • {budget.providerId ? providers.find((provider) => provider.id === budget.providerId)?.displayName : "All providers"}
                </p>
                <p className="text-gray-500">
                  Limit ${microsToUsd(budget.limitMicros)} • Warn at {budget.warningThresholdPercent}% • {budget.hardStop ? "Hard stop" : "Advisory"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 text-amber-600 p-3"><FileBarChart2 size={20} /></div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Reconciliation</h3>
              <p className="text-sm text-gray-500">Record provider billing imports against estimated usage.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={newRecon.providerSlug} onChange={(e) => setNewRecon((current) => ({ ...current, providerSlug: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
              {providers.map((provider) => (
                <option key={provider.slug} value={provider.slug}>{provider.displayName}</option>
              ))}
            </select>
            <input type="number" step="0.01" value={newRecon.importedTotalUsd} onChange={(e) => setNewRecon((current) => ({ ...current, importedTotalUsd: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50" placeholder="Imported total USD" />
            <input type="datetime-local" value={newRecon.periodStart} onChange={(e) => setNewRecon((current) => ({ ...current, periodStart: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50" />
            <input type="datetime-local" value={newRecon.periodEnd} onChange={(e) => setNewRecon((current) => ({ ...current, periodEnd: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50" />
            <input value={newRecon.notes} onChange={(e) => setNewRecon((current) => ({ ...current, notes: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 md:col-span-2" placeholder="Notes" />
            <button onClick={createReconciliation} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold">
              Record Run
            </button>
          </div>

          <div className="space-y-3">
            {reconciliationRuns.map((run) => (
              <div key={run.id} className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm">
                <p className="font-bold text-gray-900">{run.providerSlug}</p>
                <p className="text-gray-500">Imported ${microsToUsd(run.importedTotalMicros)} • Estimated ${microsToUsd(run.estimatedTotalMicros)} • Variance ${microsToUsd(run.varianceMicros)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 text-slate-700 p-3"><ShieldCheck size={20} /></div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Usage Logs</h3>
              <p className="text-sm text-gray-500">Recent requests, estimated cost, and request types.</p>
            </div>
          </div>

          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 rounded-xl border border-gray-200 p-3 text-sm">
                <div>
                  <p className="font-bold text-gray-900">{ROUTE_LABELS[log.routeKey || ""] || log.routeKey || "AI request"}</p>
                  <p className="text-gray-500">{log.model || "Unknown model"} • {log.requestType}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full self-start ${log.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{log.status}</span>
                <span className="text-xs font-semibold text-gray-700 self-start">${microsToUsd(log.estimatedCostMicros)}</span>
                <span className="text-xs text-gray-500 self-start">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-pink-50 text-pink-600 p-3"><Sparkles size={20} /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Prompt Templates</h3>
                <p className="text-sm text-gray-500">Saved patterns available in Content Studio and agents.</p>
              </div>
            </div>
            {promptTemplates.map((template) => (
              <div key={template.id} className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm">
                <p className="font-bold text-gray-900">{template.name}</p>
                <p className="text-gray-500">{template.useCase}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-50 text-cyan-600 p-3"><Cable size={20} /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Brand Profiles</h3>
                <p className="text-sm text-gray-500">Reusable brand voice context for generations.</p>
              </div>
            </div>
            {brandProfiles.map((brand) => (
              <div key={brand.id} className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm">
                <p className="font-bold text-gray-900">{brand.name}</p>
                <p className="text-gray-500">{brand.businessName}</p>
                {brand.brandVoice && <p className="text-xs text-gray-500 mt-1">{brand.brandVoice}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={loadAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold">
          <RefreshCcw size={16} />
          Refresh AI Admin
        </button>
      </div>
    </div>
  );
}
