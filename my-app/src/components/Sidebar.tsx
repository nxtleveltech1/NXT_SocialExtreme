"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Share2, 
  Calendar, 
  BarChart3, 
  MessageSquare, 
  History,
  PenTool,
  Settings,
  Menu,
  X,
  Users,
  Facebook,
  ShoppingBag,
  Store
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Channels", href: "/channels", icon: Share2 },
  { name: "Meta Platform", href: "/meta", icon: Facebook },
  { name: "Scheduler", href: "/scheduler", icon: Calendar },
  { name: "History", href: "/history", icon: History },
  { name: "Create", href: "/create", icon: PenTool },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Audience", href: "/audience", icon: Users },
  { name: "Inbox", href: "/inbox", icon: MessageSquare },
  { name: "Sales", href: "/sales", icon: ShoppingBag },
  { name: "Store", href: "/store", icon: Store },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md bg-neutral-900 shadow-md text-neutral-300 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar backdrop for mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-neutral-950 border-r border-neutral-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 border-b border-neutral-800 px-4">
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-red-600">NXT</span>
              <span className="text-neutral-400 mx-0.5 font-semibold">Social</span>
              <span className="text-red-500 italic">Extreme</span>
            </span>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200",
                    isActive 
                      ? "bg-red-950/60 text-red-400 border border-red-900/40" 
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                  )}
                >
                  <item.icon className={cn(
                    "mr-3 h-5 w-5",
                    isActive ? "text-red-500" : "text-neutral-500 group-hover:text-neutral-400"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-neutral-800">
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Social Channels
                </p>
                <div className="mt-2 flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" title="Facebook" />
                  <div className="w-2 h-2 rounded-full bg-pink-500" title="Instagram" />
                  <div className="w-2 h-2 rounded-full bg-neutral-300" title="TikTok" />
                  <div className="w-2 h-2 rounded-full bg-green-500" title="WhatsApp" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
