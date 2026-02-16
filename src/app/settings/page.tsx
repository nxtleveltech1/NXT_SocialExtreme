"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Bell, 
  Lock, 
  Globe, 
  CreditCard, 
  Building2, 
  ShieldCheck,
  Save,
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  Store,
  Wallet
} from "lucide-react";
import { toast } from "sonner";

const sections = [
  { id: 'profile', name: 'Business Profile', icon: Building2 },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security & Access', icon: Lock },
  { id: 'billing', name: 'Billing & Plans', icon: CreditCard },
  { id: 'localization', name: 'SA Localization', icon: Globe },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/settings");
        if (!response.ok) {
          throw new Error("Failed to load settings");
        }
        const data = await response.json();
        setBusinessName(data.businessName || "");
        setBusinessEmail(data.businessEmail || "");
        setBusinessPhone(data.businessPhone || "");
        setBusinessAddress(data.businessAddress || "");
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName,
          businessEmail,
          businessPhone,
          businessAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your NXT Level TECH SA business account and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeSection === section.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <section.icon size={18} />
                <span>{section.name}</span>
              </div>
              <ChevronRight size={14} className={activeSection === section.id ? 'opacity-100' : 'opacity-0'} />
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8">
            {activeSection === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Business Profile</h2>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save size={16} /> <span>Save Changes</span></>}
                  </button>
                </div>

                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-500">Loading settings...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Business Name</label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Registration Number</label>
                      <input 
                        type="text" 
                        defaultValue="2018/123456/07" 
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Primary Contact Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="email" 
                          value={businessEmail}
                          onChange={(e) => setBusinessEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          value={businessPhone}
                          onChange={(e) => setBusinessPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="col-span-full space-y-2">
                      <label className="text-sm font-semibold text-gray-700">HQ Address (Cape Town)</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'localization' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">SA Localization</h2>
                  <button className="text-sm font-bold text-blue-600 hover:underline">Reset Defaults</button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Wallet size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Base Currency</p>
                        <p className="text-sm text-gray-500">All analytics and reports will use this currency.</p>
                      </div>
                    </div>
                    <select className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm font-bold outline-none">
                      <option>ZAR (R)</option>
                      <option>USD ($)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                        <Globe size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Timezone</p>
                        <p className="text-sm text-gray-500">Scheduled posts and syncs will align with this.</p>
                      </div>
                    </div>
                    <select className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm font-bold outline-none">
                      <option>(GMT+02:00) Johannesburg / Cape Town</option>
                      <option>(GMT+00:00) UTC</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-100 p-2 rounded-lg text-green-600">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Default Branch</p>
                        <p className="text-sm text-gray-500">Primary branch for new channel associations.</p>
                      </div>
                    </div>
                    <select className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm font-bold outline-none">
                      <option>Cape Town (HQ)</option>
                      <option>Johannesburg (Warehouse)</option>
                      <option>Durban (Satellite)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Security & Access</h2>
                </div>

                <div className="space-y-6">
                  <div className="p-4 border border-green-100 bg-green-50 rounded-xl flex items-start space-x-4">
                    <ShieldCheck className="text-green-600 mt-1" size={24} />
                    <div>
                      <h4 className="font-bold text-green-900">Two-Factor Authentication</h4>
                      <p className="text-sm text-green-700 mb-4">Your account is currently protected with 2FA via SMS (+27 **** 4567).</p>
                      <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg font-bold text-sm hover:bg-green-100 transition-colors">
                        Update 2FA Settings
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900">Change Password</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <input 
                        type="password" 
                        placeholder="Current Password" 
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input 
                        type="password" 
                        placeholder="New Password" 
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button className="w-fit px-6 py-2 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-colors">
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other sections would go here with similar styling */}
            {(activeSection === 'notifications' || activeSection === 'billing') && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-gray-100 p-4 rounded-full text-gray-400">
                  <Globe size={40} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{sections.find(s => s.id === activeSection)?.name} Module</h3>
                  <p className="text-sm text-gray-500 max-w-xs">This section is currently being optimized for South African business standards.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
