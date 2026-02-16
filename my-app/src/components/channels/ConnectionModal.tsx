"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  Facebook,
  Instagram,
  Video,
  MessageSquare,
  User,
  Key,
  Shield,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withRetry } from "@/lib/utils/api-error-handler";

interface Channel {
  id: number;
  name: string;
  platform: string;
  authType: string;
}

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  onSuccess: () => void;
}

const platformIcons = {
  facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
  instagram: { icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
  tiktok: { icon: Video, color: 'text-black', bg: 'bg-gray-50' },
  whatsapp: { icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
};

export default function ConnectionModal({ isOpen, onClose, channel, onSuccess }: ConnectionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [authType, setAuthType] = useState<'oauth' | 'username_password' | 'manual_token'>('oauth');
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [manualToken, setManualToken] = useState('');
  const [error, setError] = useState<string>('');

  // Normalize platform to lowercase for consistent comparison (DB may have mixed case)
  const normalizedPlatform = channel?.platform?.toLowerCase() || '';
  
  const platformInfo = platformIcons[normalizedPlatform as keyof typeof platformIcons] || { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-50' };
  const Icon = platformInfo.icon;

  const isUsernamePasswordSupported = channel ? ['facebook', 'instagram', 'tiktok'].includes(normalizedPlatform) : false;

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen && channel) {
      setAuthType(channel.authType === 'username_password' ? 'username_password' : 'oauth');
      setCredentials({ username: '', password: '' });
      setManualToken('');
      setStatus('idle');
      setError('');
    }
  }, [isOpen, channel]);

  // Early return after hooks
  if (!channel) return null;

  const handleUsernamePasswordAuth = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await withRetry(
        async () => {
          const response = await fetch('/api/channels/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channelId: channel.id,
              username: credentials.username,
              password: credentials.password,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Authentication failed');
          }

          return data;
        },
        { maxRetries: 2, initialDelay: 1000 }
      );

      if (result.success) {
        setStatus('success');
        toast.success('Account connected successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Authentication failed');
        setStatus('error');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Connection error. Please try again.');
      setStatus('error');
      toast.error(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const startOauth = async () => {
    setIsLoading(true);
    setStatus('idle');
    setError('');

    try {
      if (normalizedPlatform === "facebook" || normalizedPlatform === "instagram") {
        // Pre-flight validation: check if Meta OAuth is configured
        const validation = await withRetry(
          async () => {
            const res = await fetch('/api/oauth/meta/validate');
            if (!res.ok) throw new Error('Validation request failed');
            return res.json();
          },
          { maxRetries: 2, initialDelay: 500 }
        );

        if (!validation.valid) {
          setStatus("error");
          setError(`OAuth not configured: ${validation.message}`);
          toast.error("Meta OAuth is not configured. Check your environment variables.");
          return;
        }

        // Redirect to Meta OAuth
        window.location.href = `/api/oauth/meta/start?channelId=${encodeURIComponent(String(channel.id))}`;
        return;
      }

      if (normalizedPlatform === "tiktok") {
        // Redirect to TikTok OAuth
        window.location.href = `/api/oauth/tiktok/start?channelId=${encodeURIComponent(String(channel.id))}`;
        return;
      }

      if (normalizedPlatform === "whatsapp") {
        setStatus("error");
        setError("WhatsApp requires Meta Business Manager setup or third-party provider");
        return;
      }

      setError("Platform not supported");
      setStatus('error');
    } catch (err) {
      console.error('OAuth redirect error:', err);
      setError('Redirect error. Please try again.');
      setStatus('error');
      toast.error("Failed to start OAuth. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualToken = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await withRetry(
        async () => {
          const response = await fetch('/api/channels/meta/manual-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channelId: channel.id,
              accessToken: manualToken.trim(),
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to connect with token');
          }

          return data;
        },
        { maxRetries: 2, initialDelay: 1000 }
      );

      if (result.success) {
        setStatus('success');
        toast.success('Token connected successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to connect with token');
        setStatus('error');
      }
    } catch (err: any) {
      console.error('Manual token error:', err);
      setError(err.message || 'Connection error. Please try again.');
      setStatus('error');
      toast.error(err.message || 'Failed to connect with token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/channels/auth?channelId=${encodeURIComponent(String(channel.id))}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError('Failed to disconnect channel');
        setStatus('error');
      }
    } catch (err) {
      console.error('Disconnect error:', err);
      setError('Disconnect error. Please try again.');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setStatus("idle");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-4">
            <div className={`${platformInfo.bg} p-3 rounded-xl ${platformInfo.color}`}>
              <Icon size={24} />
            </div>
            <div className="text-left">
              <DialogTitle>Connect Your <span className="capitalize">{normalizedPlatform}</span> Account</DialogTitle>
              <DialogDescription>
                Choose your preferred authentication method below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {status === "success" ? (
          <div className="py-6 flex flex-col items-center text-center gap-4">
            <div className="bg-green-100 p-4 rounded-full text-green-600">
              <CheckCircle2 size={44} />
            </div>
            <div>
              <p className="text-base font-bold text-card-foreground">Connected successfully</p>
              <p className="text-sm text-muted-foreground">Your account is now linked and ready.</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => { onSuccess(); onClose(); }}>
                  Continue
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Authentication Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Authentication Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-blue-600" />
                      <span className="font-medium">OAuth (Recommended)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use your normal {channel.platform} login through secure OAuth flow
                    </p>
                    <Button
                      variant={authType === 'oauth' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAuthType('oauth')}
                      className="w-full"
                    >
                      Use OAuth
                    </Button>
                  </div>

                  {(normalizedPlatform === "facebook" || normalizedPlatform === "instagram") && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Key size={16} className="text-purple-600" />
                        <span className="font-medium">Manual Token (Testing)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paste your Graph API Explorer token for quick testing
                      </p>
                      <Button
                        variant={authType === 'manual_token' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAuthType('manual_token')}
                        className="w-full"
                      >
                        Use Manual Token
                      </Button>
                    </div>
                  )}

                  {isUsernamePasswordSupported && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-green-600" />
                        <span className="font-medium">Username/Password</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Direct login with your {channel.platform} credentials
                      </p>
                      <Button
                        variant={authType === 'username_password' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAuthType('username_password')}
                        className="w-full"
                      >
                        Use Username/Password
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Manual Token Form */}
            {(normalizedPlatform === "facebook" || normalizedPlatform === "instagram") && authType === 'manual_token' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Enter Your Access Token</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="token">Graph API Explorer Token</Label>
                    <Input
                      id="token"
                      type="password"
                      placeholder="Paste your access token here"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get this from <a href="https://developers.facebook.com/tools/explorer/" target="_blank" className="text-blue-600 hover:underline">Graph API Explorer</a> (for testing only)
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                      <p className="font-semibold mb-1">Connection Error</p>
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleManualToken}
                      disabled={isLoading || !manualToken.trim()}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" />
                          Connecting...
                        </>
                      ) : (
                        'Connect with Token'
                      )}
                    </Button>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                      Cancel
                    </Button>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                    <p className="font-semibold text-amber-900 mb-1">⚠️ Testing Only</p>
                    <p className="text-amber-800">
                      Graph API Explorer tokens expire quickly (1-2 hours). For production, use OAuth to get long-lived tokens.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Username/Password Form */}
            {authType === 'username_password' && isUsernamePasswordSupported && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Enter Your Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username/Email</Label>
                    <Input
                      id="username"
                      placeholder="Enter your username or email"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                      <p className="font-semibold mb-1">Authentication Error</p>
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUsernamePasswordAuth}
                      disabled={isLoading || !credentials.username || !credentials.password}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" />
                          Authenticating...
                        </>
                      ) : (
                        'Connect Account'
                      )}
                    </Button>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                      Cancel
                    </Button>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs">
                    <p className="font-semibold text-blue-900 mb-1">🔒 Security Note</p>
                    <p className="text-blue-800">
                      Your password is encrypted and stored securely. You can change or remove it anytime from your channel settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* OAuth Instructions */}
            {authType === 'oauth' && (
              <div className="space-y-3">
                {(normalizedPlatform === "facebook" || normalizedPlatform === "instagram") && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
                    <p className="font-bold text-green-900 mb-2">✅ Ready to Connect</p>
                    <p className="text-green-800 mb-3">
                      Click the button below to connect your <strong className="capitalize">{normalizedPlatform}</strong> account. You'll log in with your <strong>normal {normalizedPlatform === "facebook" ? "Facebook" : "Instagram"} username and password</strong>.
                    </p>
                    <div className="bg-white rounded p-3 border border-green-100">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Quick Steps:</p>
                      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Click "Connect <span className="capitalize">{normalizedPlatform}</span>" below</li>
                        <li>Log in with your normal {normalizedPlatform === "facebook" ? "Facebook" : "Instagram"} account</li>
                        <li>Authorize NXT Social Extreme to access your {normalizedPlatform === "facebook" ? "Page" : "Business Account"}</li>
                        <li>Select which {normalizedPlatform === "facebook" ? "Page" : "Account"} to connect</li>
                        <li>Done! Your channel will be connected.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                    <p className="font-bold mb-1">⚠️ Setup Required</p>
                    <p>{error}</p>
                    <p className="mt-2 text-[10px]">
                      Make sure you've added <code className="bg-destructive/20 px-1 rounded">META_APP_ID</code> and <code className="bg-destructive/20 px-1 rounded">META_APP_SECRET</code> to your <code className="bg-destructive/20 px-1 rounded">.env.local</code> file.
                    </p>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={startOauth} 
                    disabled={isLoading}
                    className="bg-red-800 hover:bg-red-700 capitalize"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin mr-2" />
                        Redirecting…
                      </>
                    ) : (
                      <>Connect <span className="capitalize">{normalizedPlatform}</span></>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* WhatsApp Setup */}
            {normalizedPlatform === "whatsapp" && authType === 'oauth' && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="font-bold text-amber-900 mb-2">⚠️ WhatsApp Setup Required</p>
                  <p className="text-amber-800 mb-3">
                    WhatsApp doesn't have a simple login like Facebook/Instagram. You need to set up WhatsApp Business API through one of these options:
                  </p>
                  <div className="bg-white rounded p-3 border border-amber-100 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Options:</p>
                    <div className="text-xs text-gray-600 space-y-2">
                      <div>
                        <strong>1. Twilio WhatsApp API</strong> (Recommended - No Meta Business Manager needed)
                        <br />
                        <span className="text-gray-500">Sign up at twilio.com, get WhatsApp enabled, use your Twilio credentials</span>
                      </div>
                      <div>
                        <strong>2. Meta Business Manager</strong>
                        <br />
                        <span className="text-gray-500">Set up WhatsApp Business Account through Meta</span>
                      </div>
                      <div>
                        <strong>3. Third-party services</strong> (Unipile, Whatsboost, etc.)
                        <br />
                        <span className="text-gray-500">Use services that connect via WhatsApp Web</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 mt-3">
                    See <code className="bg-amber-100 px-1 rounded">docs/WHATSAPP_BUSINESS_NON_META_SETUP.md</code> for detailed setup instructions.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              Your password is never stored by NXT Social Extreme in plain text. It is encrypted using AES-256-GCM and can only be used for authentication.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
