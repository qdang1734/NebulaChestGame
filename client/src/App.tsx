import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import Stats from "./pages/Stats";
import Invite from "./pages/Invite";
import Earn from "./pages/Earn";
import Wallet from "./pages/Wallet";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Profile from "./pages/Profile";
import { ActiveScreen, TelegramWebApp } from "./lib/types";
import backgroundImage from '@assets/background.png';
import { setAuthTokenForApi } from './lib/queryClient';
import { auth } from './lib/auth';

function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("home");
  const [previousScreen, setPreviousScreen] = useState<ActiveScreen | null>(null);

  // Check if running in Telegram WebApp context safely
  const isTelegramWebApp = typeof window !== 'undefined' && window.Telegram?.WebApp;

  useEffect(() => {
    console.log("App Component Mounted. isTelegramWebApp:", isTelegramWebApp);
    if (typeof window !== 'undefined' && window.Telegram) {
      console.log("window.Telegram is defined.", window.Telegram);
      if (window.Telegram.WebApp) {
        console.log("window.Telegram.WebApp is defined.", window.Telegram.WebApp);
        if (window.Telegram.WebApp.CloudStorage) {
          console.log("window.Telegram.WebApp.CloudStorage is defined.", window.Telegram.WebApp.CloudStorage);
        } else {
          console.log("window.Telegram.WebApp.CloudStorage is NOT defined.");
        }
      } else {
        console.log("window.Telegram.WebApp is NOT defined.");
      }
    } else {
      console.log("window.Telegram is NOT defined.");
    }

    if (isTelegramWebApp) {
      window.Telegram?.WebApp?.ready(); // Safely call ready()
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
      auth.setToken(tokenFromUrl);
      // Remove token from URL for security
      if (window.history && window.history.replaceState) {
        const cleanUrl = window.location.protocol + "//" +
                         window.location.host +
                         window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [isTelegramWebApp]);

  const handleScreenChange = (screen: ActiveScreen) => {
    setPreviousScreen(activeScreen);
    setActiveScreen(screen);
  };

  const handleBack = () => {
    if (previousScreen) {
      setActiveScreen(previousScreen);
      setPreviousScreen(null);
    }
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case "home":
        return <Home />;
      case "stats":
        return <Stats />;
      case "invite":
        return <Invite />;
      case "earn":
        return <Earn />;
      case "wallet":
        return <Wallet onScreenChange={handleScreenChange} />;
      case "deposit":
        return <Deposit onBack={handleBack} />;
      case "withdraw":
        return <Withdraw onBack={handleBack} />;
      case "profile":
        return <Profile />;
      default:
        return <Home />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex justify-center items-start min-h-screen w-full bg-gray-900">
          <div className="w-full max-w-sm mx-auto h-screen overflow-y-auto overflow-x-hidden relative bg-black/30 shadow-2xl shadow-black/60 mobile-container" style={{ 
            maxHeight: '100vh', 
             
            touchAction: 'manipulation',
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}>
            <div className="absolute inset-0 bg-black/75 z-0"></div>
            <main className="pb-16 relative z-10">
              {renderScreen()}
            </main>
            <Navigation 
              activeScreen={activeScreen} 
              onScreenChange={handleScreenChange} 
            />
            <Toaster />
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
