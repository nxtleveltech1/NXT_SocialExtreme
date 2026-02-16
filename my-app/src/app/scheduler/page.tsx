import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  MoreVertical,
  Facebook,
  Instagram,
  Video,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import { db } from "@/db/db";
import { posts as postsTable } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const platformIcons = {
  Facebook: { icon: Facebook, color: 'text-blue-600' },
  Instagram: { icon: Instagram, color: 'text-pink-600' },
  TikTok: { icon: Video, color: 'text-black' },
  WhatsApp: { icon: MessageSquare, color: 'text-green-600' },
};

export default async function SchedulerPage() {
  let scheduledPosts = [];
  try {
    scheduledPosts = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.status, "scheduled"))
      .orderBy(asc(postsTable.scheduledAt))
      .limit(50);
  } catch (error: any) {
    // Silently handle database errors - tables may not exist yet
    // This is expected if migrations haven't been run
    if (process.env.NODE_ENV === 'development') {
      console.warn("Database not initialized. Run 'bun run db:push' to create tables.");
    }
    scheduledPosts = [];
  }

  const daysWithPosts = new Set<number>(
    scheduledPosts
      .map((p) => (p.scheduledAt ? new Date(p.scheduledAt).getDate() : null))
      .filter((d): d is number => typeof d === "number")
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NXT Content Scheduler</h1>
          <p className="text-gray-500">Plan and automate posts across all NXT Level Tech platforms.</p>
        </div>
        <Button asChild>
          <Link href="/create">
            <Plus size={20} />
            Create NXT post
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar View Placeholder */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon size={18} className="text-blue-600" />
              <span>December 2025</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <ChevronLeft size={20} />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <ChevronRight size={20} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-gray-50 py-2 text-center text-xs font-bold text-gray-500 uppercase">
                  {day}
                </div>
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const hasPosts = daysWithPosts.has(day);
                
                return (
                  <div key={i} className={`bg-white h-24 p-2 relative group hover:bg-blue-50 transition-colors cursor-pointer ${
                    hasPosts ? 'bg-blue-50 ring-2 ring-blue-600 ring-inset' : ''
                  }`}>
                    <span className={`text-xs font-medium ${hasPosts ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                      {day}
                    </span>
                    {hasPosts && (
                      <div className="mt-1 space-y-1">
                        <div className="h-1.5 w-full bg-pink-500 rounded-full" />
                        <div className="h-1.5 w-full bg-blue-500 rounded-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Post Queue */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center space-x-2">
              <Clock size={18} className="text-blue-600" />
              <span>NXT Post Queue</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-6">
            {scheduledPosts.map((post) => {
              const platformInfo =
                platformIcons[post.platform as keyof typeof platformIcons] ?? platformIcons.WhatsApp;
              const Icon = platformInfo.icon;
              const color = platformInfo.color;
              const scheduledLabel = post.scheduledAt
                ? new Date(post.scheduledAt).toLocaleString()
                : "Unscheduled";

              return (
              <div key={post.id} className="relative pl-6 border-l-2 border-gray-100 hover:border-blue-600 transition-colors">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-white border-2 border-blue-600" />
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{post.platform}</span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={16} />
                  </button>
                </div>
                <h4 className="text-sm font-bold text-gray-900 mt-2 line-clamp-1">
                  {post.content.slice(0, 60)}
                </h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">"{post.content}"</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    {scheduledLabel}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    post.status === 'scheduled' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {post.status}
                  </span>
                </div>
              </div>
              );
            })}
          </CardContent>
          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <Button variant="ghost" className="w-full text-muted-foreground">
              View full NXT calendar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
