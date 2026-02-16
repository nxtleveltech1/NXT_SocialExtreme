import { 
  Users, 
  TrendingUp, 
  MousePointer2, 
  MessageCircle,
  Facebook,
  Instagram,
  Video,
  MessageSquare,
  Music,
  Zap
} from "lucide-react";

import { db } from "@/db/db";
import { channels as channelsTable } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

type Channel = InferSelectModel<typeof channelsTable>;
import { auth } from "@clerk/nextjs/server";
import LoginLanding from "@/components/LoginLanding";

export const dynamic = "force-dynamic";

const platformIcons = {
  Facebook: { icon: Facebook, color: 'bg-blue-600' },
  Instagram: { icon: Instagram, color: 'bg-pink-600' },
  TikTok: { icon: Video, color: 'bg-black' },
  WhatsApp: { icon: MessageSquare, color: 'bg-green-500' },
};

const stats = [
  { name: 'SA Brand Reach', value: '124.2K', change: '+18.5%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  { name: 'Studio Bookings', value: '84', change: '+12.2%', icon: Music, color: 'text-purple-600', bg: 'bg-purple-100' },
  { name: 'Rental Inquiries', value: '342', change: '+22.7%', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { name: 'NXT Support Chats', value: '892', change: '+15.4%', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-100' },
];

export default async function Dashboard() {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch {
    // Clerk auth failed — treat as unauthenticated
  }

  if (!userId) {
    return <LoginLanding />;
  }

  let channels: Channel[] = [];
  try {
    channels = await db.select().from(channelsTable);
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.warn("Database not initialized. Run 'bun run db:push' to create tables.");
    }
    channels = [];
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NXT Level TECH - South Africa</h1>
        <p className="text-gray-500">Sales, Rentals, Repairs & Recording Studio | Saxenburg Park 2, Cape Town.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={stat.bg + " p-2 rounded-lg"}>
                <stat.icon className={stat.color + " h-6 w-6"} />
              </div>
              <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Platforms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">SA Channel Performance</h3>
          <div className="space-y-6">
            {channels.map((platform) => {
              const platformInfo = platformIcons[platform.platform as keyof typeof platformIcons] || { icon: MessageSquare, color: 'bg-gray-600' };
              const Icon = platformInfo.icon;
              
              return (
                <div key={platform.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`${platformInfo.color} p-2 rounded-lg text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{platform.platform}</p>
                      <p className="text-xs text-gray-500">{platform.handle || platform.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{platform.followers}</p>
                    <p className="text-xs text-green-600 font-medium">
                      Healthy
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Studio Activity</h3>
            <button className="text-sm text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { type: 'Booking', title: 'Full Day Recording - Studio A', time: '2h ago', status: 'Confirmed' },
              { type: 'Rental', title: 'JBL PRX System - Weekend Hire', time: '5h ago', status: 'Pending' },
              { type: 'Repair', title: 'Yamaha Mixer - Service Complete', time: '1d ago', status: 'Ready' },
              { type: 'Sale', title: 'beamZ Pro DMX Controller', time: '1d ago', status: 'Shipped' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.type} • {activity.time}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
