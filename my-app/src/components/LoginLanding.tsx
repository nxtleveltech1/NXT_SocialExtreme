"use client";

import { useStackApp } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Video, MessageSquare, ArrowRight } from "lucide-react";

export default function LoginLanding() {
  const app = useStackApp();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left side - Info */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 md:p-12 text-white flex flex-col justify-center">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">MobileMate</h1>
                <p className="text-xl text-blue-100 mb-6">
                  Manage all your social media channels in one place
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Facebook</p>
                    <p className="text-sm text-blue-100">Connect your pages</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Instagram</p>
                    <p className="text-sm text-blue-100">Manage your posts</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">TikTok</p>
                    <p className="text-sm text-blue-100">Track your videos</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">WhatsApp</p>
                    <p className="text-sm text-blue-100">Handle conversations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Login */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Get Started</h2>
                <p className="text-gray-600">
                  Sign in to access all your channels and data. No dev accounts or API keys needed - just your email and password.
                </p>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={() => app.redirectToSignIn()} 
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  Sign In
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                
                <Button 
                  onClick={() => app.redirectToSignUp()} 
                  variant="outline"
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  Create Account
                </Button>
              </div>

              <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Simple Login:</strong> Just use your email and password. Once you're logged in, you'll have access to all your channels and data. No complicated setup required!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



