"use client";

import { useState } from "react";
import { 
  Wand2, 
  Loader2, 
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AIContentGeneratorProps {
  platform: string;
  onGenerate: (content: string, hashtags: string[]) => void;
}

export default function AIContentGenerator({ platform, onGenerate }: AIContentGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("Professional");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, platform, tone }),
      });
      
      const data = await response.json();
      if (data.content) {
        onGenerate(data.content, data.hashtags);
      }
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-indigo-600" size={18} />
        <h3 className="font-bold text-indigo-900 text-sm">AI Assistant</h3>
        <span className="text-[10px] bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-bold">BETA</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-indigo-800 mb-1 block">What's this post about?</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Announcing our new line array rental packages..."
            className="text-sm border-indigo-200 focus-visible:ring-indigo-500 bg-white/80"
          />
        </div>

        <div className="flex gap-2">
          {['Professional', 'Casual', 'Fun'].map((t) => (
            <Button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              variant={tone === t ? "default" : "outline"}
              className={
                tone === t
                  ? "flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              }
            >
              {t}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Generating Magic...</span>
            </>
          ) : (
            <>
              <Wand2 size={16} />
              <span>Generate with AI</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
