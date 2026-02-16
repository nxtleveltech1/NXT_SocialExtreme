import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 shadow-2xl">
          <h1 className="text-7xl font-extrabold text-red-600 mb-4">404</h1>
          <h2 className="text-2xl font-bold text-neutral-100 mb-2">
            Page Not Found
          </h2>
          <p className="text-neutral-400 mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Link href="/">
            <Button className="bg-red-800 hover:bg-red-700 text-white">
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
