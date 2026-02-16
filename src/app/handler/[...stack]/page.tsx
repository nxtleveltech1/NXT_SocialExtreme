import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

export default function StackHandlerPage() {
  return <StackHandler fullPage={true} app={stackServerApp} />;
}

