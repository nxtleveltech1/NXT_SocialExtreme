import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  Download,
  ExternalLink,
  Facebook,
  Instagram,
  Video,
  MessageSquare
} from "lucide-react";
import { db } from "@/db/db";
import { posts as postsTable } from "@/db/schema";
import { desc, InferSelectModel } from "drizzle-orm";

type Post = InferSelectModel<typeof postsTable>;

export const dynamic = "force-dynamic";

const platformIcons = {
  Facebook: { icon: Facebook, color: 'text-blue-600' },
  Instagram: { icon: Instagram, color: 'text-pink-600' },
  TikTok: { icon: Video, color: 'text-black' },
  WhatsApp: { icon: MessageSquare, color: 'text-green-600' },
};

export default async function HistoryPage() {
  let posts: Post[] = [];
  try {
    posts = await db.select().from(postsTable).orderBy(desc(postsTable.date));
  } catch (error: any) {
    // Silently handle database errors - tables may not exist yet
    // This is expected if migrations haven't been run
    if (process.env.NODE_ENV === 'development') {
      console.warn("Database not initialized. Run 'bun run db:push' to create tables.");
    }
    posts = [];
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HistoryIcon className="text-blue-600" />
            NXT SA Channel History
          </h1>
          <p className="text-gray-500">Real post data from the last 12 months for NXT Level TECH South Africa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Search SA post content..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100">
            <Filter size={14} />
            Platforms
          </button>
        </div>
      </div>

      {/* History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => {
          const platformInfo = platformIcons[post.platform as keyof typeof platformIcons] || { icon: MessageSquare, color: 'text-gray-600' };
          const Icon = platformInfo.icon;
          
          return (
            <div key={post.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col group hover:ring-2 hover:ring-blue-500 transition-all">
              {post.image && (
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.platform} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur rounded-md flex items-center gap-1.5 shadow-sm">
                    <Icon size={14} className={platformInfo.color} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                      {post.platform}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="p-5 flex-1 flex flex-col">
                {!post.image && (
                  <div className="flex items-center gap-2 mb-4">
                    <Icon size={18} className={platformInfo.color} />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      {post.platform}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">
                    {post.platform === 'Facebook' ? 'NXT Level TECH | Cape Town' : 
                     post.platform === 'Instagram' ? '@nxtleveltech' :
                     post.platform === 'TikTok' ? 'NXT Official' : 'NXT Support'}
                  </h3>
                  <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap ml-2">
                    {post.date ? new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : ''}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1 italic">
                  "{post.content}"
                </p>
                
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(post.tags as string[] || []).map(tag => (
                    <span key={tag} className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-900">
                        {post.likes || 0}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase font-medium">
                        {post.platform === 'WhatsApp' ? 'Replies' : 'Likes'}
                      </span>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 transition-colors">
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
