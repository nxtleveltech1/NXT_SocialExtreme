"use client";

import { useUser, useStackApp } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { UserButton } from "@stackframe/stack";

export default function AuthButton() {
  const user = useUser();
  const app = useStackApp();

  if (!user) {
    return (
      <div className="flex space-x-2">
        <Button variant="outline" onClick={() => app.redirectToSignIn()}>
          Sign In
        </Button>
        <Button onClick={() => app.redirectToSignUp()}>Sign Up</Button>
      </div>
    );
  }

  return <UserButton />;
}

