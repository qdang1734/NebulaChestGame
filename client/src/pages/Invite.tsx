import { useState } from "react";
import { Copy, Share2, Gift, Award } from "lucide-react";
import GradientButton from "@/components/ui/gradient-button";

interface Tab {
  id: string;
  label: string;
}

const Invite = () => {
  const [activeTab, setActiveTab] = useState<string>("rewards");
  
  const tabs: Tab[] = [
    { id: "rewards", label: "Latest Rewards" },
    { id: "friends", label: "List friends" }
  ];
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-display font-semibold mb-2">Invite friends</h2>
      <p className="text-gray-400 text-sm mb-4">Earn more TON coin</p>
      
      <div className="flex space-x-2 mb-6">
        <div className="flex-1 rounded-lg bg-gray-800/80 p-3">
          <div className="text-center text-sm text-gray-300 mb-1">Total friends</div>
          <div className="text-amber-500 text-2xl font-display font-bold text-center">1</div>
        </div>
        <div className="flex-1 rounded-lg bg-gray-800/80 p-3">
          <div className="text-center text-sm text-gray-300 mb-1">TON Earned</div>
          <div className="text-amber-500 text-2xl font-display font-bold flex items-center justify-center">
            0.01
            <svg className="w-4 h-4 ml-1 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800/80 rounded-lg p-4 mb-6">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
            <Gift className="text-accent text-xl" />
          </div>
        </div>
        <h3 className="text-center font-medium mb-3">Reward</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Each egg opened by your friend</span>
            <span className="text-amber-500 font-medium">10%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Invite 1 friend</span>
            <div className="flex items-center text-amber-500 font-medium">
              <span>+500</span>
              <Award className="ml-1 text-amber-500 w-4 h-4" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Invite 1 premium friend</span>
            <div className="flex items-center text-amber-500 font-medium">
              <span>+1,000</span>
              <Award className="ml-1 text-amber-500 w-4 h-4" />
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-400 mt-2">*Friend open at least 1 egg</div>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b border-gray-700">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`pb-2 ${
                activeTab === tab.id 
                  ? "font-medium text-white border-b-2 border-primary" 
                  : "text-gray-400 ml-4"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="py-6 text-center text-gray-400">
          No data
        </div>
      </div>
      
      <div className="flex space-x-2">
        <GradientButton fullWidth className="flex-1 py-3 rounded-lg font-medium text-white">
          Invite friends
        </GradientButton>
        <button className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
          <Copy className="text-gray-400 w-5 h-5" />
        </button>
        <button className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
          <Share2 className="text-gray-400 w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Invite;
