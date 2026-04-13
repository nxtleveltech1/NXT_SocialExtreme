"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Languages, Loader2, Sparkles, Video, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AIContentGeneratorProps {
  platform: string;
  onGenerate: (content: string, hashtags: string[]) => void;
  onMediaGenerate?: (url: string, type: "image" | "video") => void;
}

type ProviderSummary = {
  id: number;
  slug: string;
  displayName: string;
  enabled?: boolean;
};

type ModelSummary = {
  id: number;
  models: string[];
};

type PromptTemplate = {
  id: number;
  name: string;
  useCase: string;
};

type BrandProfile = {
  id: number;
  name: string;
};

const toneOptions = ["Professional", "Casual", "Fun", "Bold"];

export default function AIContentGenerator({ platform, onGenerate, onMediaGenerate }: AIContentGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("Professional");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [providerId, setProviderId] = useState("");
  const [model, setModel] = useState("");
  const [promptTemplateId, setPromptTemplateId] = useState("");
  const [brandProfileId, setBrandProfileId] = useState("");
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUsage, setLastUsage] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const [providersRes, modelsRes] = await Promise.all([
          fetch("/api/settings/ai/providers"),
          fetch("/api/ai/models"),
        ]);
        const [providersData, modelsData] = await Promise.all([providersRes.json(), modelsRes.json()]);
        const enabledProviders = ((providersData.providers || []) as ProviderSummary[]).filter((provider) => provider.enabled);
        setProviders(enabledProviders);
        setPromptTemplates(providersData.promptTemplates || []);
        setBrandProfiles(providersData.brandProfiles || []);
        setModels(modelsData.providers || []);
        if (enabledProviders[0]) {
          setProviderId(String(enabledProviders[0].id));
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load AI studio configuration");
      }
    };
    load();
  }, []);

  const availableModels = useMemo(
    () => models.find((entry) => entry.id === Number(providerId))?.models || [],
    [models, providerId]
  );

  useEffect(() => {
    setModel(availableModels[0] || "");
  }, [availableModels]);

  const requestText = async (action: "caption" | "variants" | "rewrite" | "hashtags" | "translate" | "ideas") => {
    if (!prompt.trim()) {
      toast.warning("Add a creative brief first.");
      return;
    }

    setIsGenerating(true);
    try {
      let parseJson = false;
      let systemPrompt = "";

      if (action === "caption") {
        parseJson = true;
        systemPrompt = `Generate a high-performing ${platform} caption in a ${tone} tone. Return JSON with 'content' and 'hashtags'.`;
      } else if (action === "variants") {
        systemPrompt = `Create 3 distinct ${platform} caption variants in a ${tone} tone. Label each variation clearly.`;
      } else if (action === "rewrite") {
        systemPrompt = `Rewrite the provided draft for ${platform} in a ${tone} tone and keep it ready to publish.`;
      } else if (action === "hashtags") {
        parseJson = true;
        systemPrompt = `Return JSON with a single 'hashtags' array of 8-12 strong hashtags for ${platform}.`;
      } else if (action === "translate") {
        systemPrompt = `Translate and localize this ${platform} caption into ${targetLanguage}. Keep the structure natural for social media.`;
      } else if (action === "ideas") {
        systemPrompt = `Generate 5 practical content ideas for ${platform} based on this brief. Present them as a numbered list.`;
      }

      const response = await fetch("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeKey: "studio.copy",
          prompt,
          providerId: providerId ? Number(providerId) : undefined,
          model: model || undefined,
          promptTemplateId: promptTemplateId ? Number(promptTemplateId) : undefined,
          brandProfileId: brandProfileId ? Number(brandProfileId) : undefined,
          systemPrompt,
          parseJson,
          options: {
            platform,
            tone,
            targetLanguage,
            action,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI request failed");

      if (action === "caption") {
        onGenerate(data.object?.content || data.text || "", data.object?.hashtags || []);
      } else if (action === "hashtags") {
        onGenerate("", data.object?.hashtags || []);
        toast.success("Hashtags generated");
      } else {
        onGenerate(data.text || "", []);
      }

      const usageCost = Number(data.usage?.estimatedCostMicros || 0) / 1_000_000;
      setLastUsage(`${data.providerSlug || "AI"} • ${data.model || "model"} • $${usageCost.toFixed(4)}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const requestMedia = async (type: "image" | "video") => {
    if (!prompt.trim()) {
      toast.warning("Describe the creative you want first.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeKey: type === "image" ? "studio.media.image" : "studio.media.video",
          prompt: `${platform} ${type} creative brief: ${prompt}`,
          type,
          providerId: providerId ? Number(providerId) : undefined,
          model: model || undefined,
          options: {
            platform,
            tone,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to generate ${type}`);
      if (data.url && onMediaGenerate) {
        onMediaGenerate(data.url, type);
      }
      const usageCost = Number(data.usage?.estimatedCostMicros || 0) / 1_000_000;
      setLastUsage(`${data.providerSlug || "AI"} • ${data.model || "model"} • $${usageCost.toFixed(4)}`);
      toast.success(`${type === "image" ? "Image" : "Video"} generated`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : `Failed to generate ${type}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-blue-600" size={18} />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">AI Studio Control Center</h3>
            <p className="text-xs text-slate-500">Provider-aware copy, ideas, and media generation.</p>
          </div>
        </div>
        {lastUsage && (
          <span className="text-[11px] bg-white/80 text-slate-600 px-3 py-1 rounded-full font-semibold">
            {lastUsage}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="h-10 rounded-lg border border-blue-100 bg-white px-3 text-sm">
          <option value="">Auto route</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>{provider.displayName}</option>
          ))}
        </select>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="h-10 rounded-lg border border-blue-100 bg-white px-3 text-sm">
          <option value="">Default model</option>
          {availableModels.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        <select value={promptTemplateId} onChange={(e) => setPromptTemplateId(e.target.value)} className="h-10 rounded-lg border border-blue-100 bg-white px-3 text-sm">
          <option value="">Prompt template</option>
          {promptTemplates.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
        <select value={brandProfileId} onChange={(e) => setBrandProfileId(e.target.value)} className="h-10 rounded-lg border border-blue-100 bg-white px-3 text-sm">
          <option value="">Brand profile</option>
          {brandProfiles.map((brand) => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 block">Creative Brief</label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the campaign, offer, audience, CTA, and any visual direction..."
          className="text-sm border-blue-100 focus-visible:ring-blue-500 bg-white min-h-[120px]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {toneOptions.map((entry) => (
          <Button
            key={entry}
            type="button"
            onClick={() => setTone(entry)}
            variant={tone === entry ? "default" : "outline"}
            className={tone === entry ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-100 text-slate-700 bg-white"}
          >
            {entry}
          </Button>
        ))}
        <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} className="h-10 rounded-lg border border-blue-100 bg-white px-3 text-sm">
          <option>English</option>
          <option>Afrikaans</option>
          <option>Zulu</option>
          <option>Xitsonga</option>
          <option>Portuguese</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
        <Button type="button" onClick={() => requestText("caption")} disabled={isGenerating || !prompt} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          <span>Generate Caption</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => requestText("variants")} disabled={isGenerating || !prompt} className="bg-white">
          <Sparkles size={16} />
          <span>Variants</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => requestText("rewrite")} disabled={isGenerating || !prompt} className="bg-white">
          <Wand2 size={16} />
          <span>Rewrite</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => requestText("hashtags")} disabled={isGenerating || !prompt} className="bg-white">
          <Sparkles size={16} />
          <span>Hashtags</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => requestText("translate")} disabled={isGenerating || !prompt} className="bg-white">
          <Languages size={16} />
          <span>Translate</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => requestText("ideas")} disabled={isGenerating || !prompt} className="bg-white">
          <Sparkles size={16} />
          <span>Idea Batch</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => requestMedia("image")} disabled={isGenerating || !prompt} className="bg-white">
          <ImageIcon size={16} />
          <span>Generate Image</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => requestMedia("video")} disabled={isGenerating || !prompt} className="bg-white">
          <Video size={16} />
          <span>Generate Video</span>
        </Button>
      </div>
    </div>
  );
}
