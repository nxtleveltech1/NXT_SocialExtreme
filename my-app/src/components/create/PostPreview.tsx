"use client";

import { 
  Smartphone, 
  Monitor, 
  MoreHorizontal, 
  Heart, 
  MessageCircle, 
  Send,
  Share2,
  Facebook,
  Instagram,
  Video,
  MessageSquare
} from "lucide-react";

interface PostPreviewProps {
  platform: string;
  content: string;
  mediaUrl: string | null;
  viewMode: 'mobile' | 'desktop';
}

export default function PostPreview({ platform, content, mediaUrl, viewMode }: PostPreviewProps) {
  const isMobile = viewMode === 'mobile';
  
  const PlatformIcon = {
    Facebook: Facebook,
    Instagram: Instagram,
    TikTok: Video,
    WhatsApp: MessageSquare
  }[platform] || MessageSquare;

  const platformColor = {
    Facebook: 'text-blue-600',
    Instagram: 'text-pink-600',
    TikTok: 'text-black',
    WhatsApp: 'text-green-600'
  }[platform] || 'text-gray-600';

  return (
    <div className={`mx-auto bg-white border border-gray-200 shadow-xl overflow-hidden transition-all duration-300 ${
      isMobile ? 'w-[320px] rounded-[30px] min-h-[580px]' : 'w-[500px] rounded-xl min-h-[400px]'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b border-gray-100 flex items-center justify-between ${isMobile ? 'pt-8' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="font-bold text-gray-500">NL</span>
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">NXT Level TECH</h4>
            <p className="text-[10px] text-gray-500 flex items-center gap-1">
              Just now · <PlatformIcon size={10} className={platformColor} />
            </p>
          </div>
        </div>
        <MoreHorizontal size={20} className="text-gray-400" />
      </div>

      {/* Content */}
      <div className="bg-white">
        {mediaUrl ? (
          <div className={`${isMobile ? 'aspect-[4/5]' : 'aspect-video'} bg-gray-100 relative overflow-hidden`}>
            {/* Simulated Image */}
            <img 
              src={mediaUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="p-8 bg-gray-50 text-center text-gray-400 text-sm italic">
            No media selected
          </div>
        )}

        {/* Action Bar */}
        <div className="p-3 flex items-center gap-4 border-b border-gray-50">
          <Heart size={20} className="text-gray-600" />
          <MessageCircle size={20} className="text-gray-600" />
          <Send size={20} className="text-gray-600" />
          <div className="flex-1" />
          <Share2 size={20} className="text-gray-600" />
        </div>

        {/* Caption */}
        <div className="p-4 pt-2">
          <p className="text-xs font-bold text-gray-900 mb-1">1,240 likes</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            <span className="font-bold mr-1">nxtleveltech</span>
            {content || "Your caption will appear here..."}
          </p>
          <p className="text-[10px] text-gray-400 mt-2 uppercase">View all 12 comments</p>
        </div>
      </div>
    </div>
  );
}
