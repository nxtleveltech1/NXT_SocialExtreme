"use client";

import { 
  User, 
  History, 
  ShoppingBag, 
  Tag, 
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Calendar
} from "lucide-react";

export default function CustomerSidebar() {
  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 text-center">
        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-gray-500">
          K
        </div>
        <h2 className="text-lg font-bold text-gray-900">Kevin Steyn</h2>
        <p className="text-sm text-gray-500">Event Coordinator @ Cape Weddings</p>
        
        <div className="flex justify-center gap-2 mt-4">
          <button className="p-2 bg-gray-50 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors">
            <Mail size={18} />
          </button>
          <button className="p-2 bg-gray-50 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors">
            <Phone size={18} />
          </button>
          <button className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Customer Vital Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-xl">
            <p className="text-[10px] font-bold text-blue-400 uppercase">Lifetime Value</p>
            <p className="text-lg font-black text-blue-900">R 45,200</p>
          </div>
          <div className="bg-green-50 p-3 rounded-xl">
            <p className="text-[10px] font-bold text-green-400 uppercase">Trust Score</p>
            <p className="text-lg font-black text-green-900">98/100</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <User size={14} />
            Details
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin size={16} />
              <span>Stellenbosch, Western Cape</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar size={16} />
              <span>Customer since Nov 2023</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Tag size={14} />
            Segmentation
          </h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold">VIP Client</span>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">Wedding Sector</span>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs font-bold">High Volume</span>
          </div>
        </div>

        {/* Recent History */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <History size={14} />
            Recent Activity
          </h3>
          <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
            <div className="relative">
              <div className="absolute -left-[21px] top-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
              <p className="text-xs font-bold text-gray-900">Inquired about beamZ Rig</p>
              <p className="text-[10px] text-gray-400">Today, 09:42 AM</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[21px] top-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              <p className="text-xs font-bold text-gray-900">Rented JBL PRX System</p>
              <p className="text-[10px] text-gray-400">Dec 05, 2024</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[21px] top-0 w-3 h-3 bg-gray-300 rounded-full border-2 border-white" />
              <p className="text-xs font-bold text-gray-900">Visited Cape Town HQ</p>
              <p className="text-[10px] text-gray-400">Nov 28, 2024</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">
          <ShoppingBag size={16} />
          Create New Order
        </button>
      </div>
    </div>
  );
}
