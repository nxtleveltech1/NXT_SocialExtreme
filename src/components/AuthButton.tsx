"use client";

import { UserButton, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function AuthButton() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!isSignedIn) {
    return (
      <div className="flex space-x-2">
        <SignInButton mode="redirect">
          <Button variant="outline">Sign In</Button>
        </SignInButton>
        <SignUpButton mode="redirect">
          <Button>Sign Up</Button>
        </SignUpButton>
      </div>
    );
  }

  return <UserButton afterSignOutUrl="/" />;
}
