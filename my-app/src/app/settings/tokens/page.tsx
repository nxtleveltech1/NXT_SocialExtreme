"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, AlertCircle, Key, Facebook, Instagram } from "lucide-react";

export default function TokenExchangePage() {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const exchangeToken = async () => {
    if (!token.trim()) {
      toast.error("Please paste your Facebook token");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/oauth/meta/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortLivedToken: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error + (data.details ? `: ${data.details}` : ""));
        toast.error("Token exchange failed");
        return;
      }

      setResult(data);
      toast.success("Token exchanged successfully! It's now PERMANENT.");
      setToken("");
    } catch (err: any) {
      setError(err.message);
      toast.error("Exchange failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <Key className="text-blue-600" />
          Token Exchange
        </h1>
        <p className="text-gray-500 mt-1">
          Convert your short-lived Facebook token into a <strong>permanent</strong> Page Access Token.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-2">How Facebook Tokens Work:</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• <strong>Short-lived</strong> = 2 hours (from Graph Explorer)</li>
            <li>• <strong>Long-lived</strong> = 60 days (after exchange)</li>
            <li>• <strong>Page Token</strong> = PERMANENT (what this tool creates)</li>
          </ul>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black text-gray-500 uppercase tracking-wider">
            Paste Your Facebook Token
          </label>
          <Textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="EAATwbe1w3GwBO..."
            className="h-32 font-mono text-sm"
          />
          <p className="text-xs text-gray-400">
            Get from: <a href="https://developers.facebook.com/tools/explorer/" target="_blank" className="text-blue-600 hover:underline">Graph API Explorer</a>
            {" → "} Get Page Access Token → Select NXT Level TECH
          </p>
        </div>

        <Button
          onClick={exchangeToken}
          disabled={isLoading || !token.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-6 text-lg"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 animate-spin" size={20} />
              Exchanging...
            </>
          ) : (
            <>
              <Key className="mr-2" size={20} />
              Exchange for Permanent Token
            </>
          )}
        </Button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <p className="font-bold text-green-800">Success!</p>
                <p className="text-sm text-green-600">Your tokens are now PERMANENT (never expire)</p>
              </div>
            </div>

            {result.pages?.map((page: any) => (
              <div key={page.pageId} className="bg-white rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Facebook className="text-blue-600" size={18} />
                  <span className="font-bold text-gray-900">{page.pageName}</span>
                </div>
                {page.hasInstagram && (
                  <div className="flex items-center gap-2 pl-6">
                    <Instagram className="text-pink-600" size={16} />
                    <span className="text-sm text-gray-600">
                      @{page.instagramUsername} ({page.instagramFollowers?.toLocaleString()} followers)
                    </span>
                  </div>
                )}
              </div>
            ))}

            <Button
              onClick={() => window.location.href = "/meta"}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Go to Meta Command Center →
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-gray-50">
        <h3 className="font-bold text-gray-900 mb-4">Required Setup</h3>
        <p className="text-sm text-gray-600 mb-4">
          Make sure these are set in your <code className="bg-gray-200 px-1 rounded">.env.local</code>:
        </p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`META_APP_ID="your_app_id"
META_APP_SECRET="your_app_secret"`}
        </pre>
        <p className="text-xs text-gray-500 mt-3">
          Find these at: Facebook Developers → Your App → Settings → Basic
        </p>
      </Card>
    </div>
  );
}
