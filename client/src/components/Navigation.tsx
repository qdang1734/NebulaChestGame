import { Home, BarChart2, UserPlus, DollarSign, Wallet, User } from "lucide-react";
import { ActiveScreen } from "@/lib/types";

interface NavigationProps {
  activeScreen: ActiveScreen;
  onScreenChange: (screen: ActiveScreen) => void;
}

const Navigation = ({ activeScreen, onScreenChange }: NavigationProps) => {
  const tabs = [
    { id: "home" as ActiveScreen, label: "Home", icon: Home },
    { id: "stats" as ActiveScreen, label: "Stats", icon: BarChart2 },
    { id: "invite" as ActiveScreen, label: "Invite", icon: UserPlus },
    { id: "wallet" as ActiveScreen, label: "Wallet", icon: Wallet },
  ];

  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md h-16 flex justify-around items-center z-[9999] border-t border-primary/30 max-w-sm mx-auto shadow-lg shadow-black/50 sticky-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onScreenChange(tab.id)}
          className={`flex flex-col items-center justify-center w-1/6 transition-all relative ${
            activeScreen === tab.id 
              ? "text-primary scale-110" 
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {activeScreen === tab.id && <div className="nav-active-indicator"></div>}
          <tab.icon className={`w-5 h-5 ${activeScreen === tab.id ? 'animate-pulse' : ''}`} />
          
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
