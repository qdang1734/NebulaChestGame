import React, { useState, useEffect } from "react";

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    start_param?: string;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

import { ChevronLeft, ChevronRight, Info, Award, User as UserIcon, Loader2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LanguageSelector from "@/components/ui/language-selector";
import Egg from "@/components/ui/egg";
import GradientButton from "@/components/ui/gradient-button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { translate } from "@/lib/i18n";
import TelegramStatus from "@/components/TelegramStatus";
import ChestRewardsDialog from "@/components/ChestRewardsDialog";
import InviteRewardHistory, { InviteRewardItem } from '../components/InviteRewardHistory';

// Import kitty images and TON logo
import fluffy from "@assets/Fluffy.png";
import ash from "@assets/Ash.png";
import tofu from "@assets/Tofu.png";
import biscuit from "@assets/Biscuit.png";
import boba from "@assets/Boba.png";
import crystal from "@assets/Crystal.png";
import ghost from "@assets/Ghost.png";
import glitch from "@assets/Glitch.png";
import luna from "@assets/Luna.png";
import meowster from "@assets/Meowster.png";
import miso from "@assets/Miso.png";
import orion from "@assets/Orion.png";
import phantom from "@assets/Phantom.png";
import salem from "@assets/Salem.png";
import solar from "@assets/Solar.png";
import stripey from "@assets/Stripey.png";
import vega from "@assets/Vega.png";
// Import new kitty images
import mochi from "@assets/Mochi.png";
import aqua from "@assets/Aqua.png";
import blaze from "@assets/Blaze.png";
import eclipse from "@assets/Eclipse.png";
import jade from "@assets/Jade.png";
import nebula from "@assets/Nebula.png";
import onyx from "@assets/Onyx.png";
import storm from "@assets/Storm.png";
import nova from "@assets/Nova.png";
import chronos from "@assets/Chronos.png";
import dragon from "@assets/Dragon.png";
import tonLogo from "@assets/ton_symbol_1746668225277.png";
// Import treasure chest images for eggs
import miniEggImage from "@assets/egg0_1746671519249.png";
import starterEggImage from "@assets/egg1_1746671839217.png";
import proEggImage from "@assets/egg2_1746671963979.png";
import genesisEggImage from "@assets/egg3_1746672005465.png";

// Mapping kitty names to their images or colors
const kittyImages: Record<string, string> = {
  Fluffy: fluffy,
  Ash: ash,
  Tofu: tofu,
  Biscuit: biscuit,
  Boba: boba,
  Crystal: crystal,
  Ghost: ghost,
  Glitch: glitch,
  Luna: luna,
  Meowster: meowster,
  Miso: miso,
  Orion: orion,
  Phantom: phantom,
  Salem: salem,
  Solar: solar,
  Stripey: stripey,
  Vega: vega,
  Mochi: mochi,
  Aqua: aqua,
  Blaze: blaze,
  Eclipse: eclipse,
  Jade: jade,
  Nebula: nebula,
  Onyx: onyx,
  Storm: storm,
  Nova: nova,
  Chronos: chronos,
  Dragon: dragon
};

// Mapping kitty names to distinct colors for those without images
const kittyColors: Record<string, string> = {
  Fluffy: "#E8D7F1",  // Existing color from API
  Ash: "#A8D8B9",
  Tofu: "#FFEADD",
  Mochi: "#FFD8CC",
  Onyx: "#3F3F3F",
  Salem: "#7D7D7D",
  Vega: "#89CFF0",
  Ghost: "#E8E8E8",
  Solar: "#FFB347",
  Luna: "#C6E2FF",
  Nova: "#9370DB",
  Pixel: "#B19CD9",
  Cosmic: "#6A5ACD",
  Aurora: "#77DD77",
  Nebula: "#FF6B6B",
  Biscuit: "#FFD700",
};

interface EggType {
  id: number;
  name: string;
  price: number;
  minEarnPerDay: number;
  maxEarnPerDay: number;
  description?: string;
  color?: string;
}

interface Kitty {
  id: number;
  name: string;
  rarity: string;
  earnPerDay: number;
  dropRate: number;
  eggTypeId: number;
  color?: string;
  spotColor?: string;
  imageUrl?: string;
}

type KittyWithCount = Kitty & { count: number }; // Add this type

interface User {
  id: number;
  username: string;
  rank?: string;
  avatar?: string;
  balance?: number;
  totalReward?: number;
  telegram_id?: string; // Added for Telegram integration
  openedEggs?: number; // Adjust type if it's an array or different structure
  // Add more fields as needed from backend API
}



// Default eggs data to use if API is not available
const defaultEggs = [
  { id: 1, name: "Mini Egg", price: 0.1, minEarnPerDay: 0.0001, maxEarnPerDay: 0.05, color: "#FFD700", image: miniEggImage },
  { id: 2, name: "Starter Egg", price: 1, minEarnPerDay: 0.001, maxEarnPerDay: 0.5, color: "#F2C879", image: starterEggImage },
  { id: 3, name: "Mega Egg", price: 10, minEarnPerDay: 0.01, maxEarnPerDay: 1, color: "#EF959C", image: proEggImage },
  { id: 4, name: "Genesis Egg", price: 100, minEarnPerDay: 0.1, maxEarnPerDay: 10, color: "#69A2B0", image: genesisEggImage }
];

// Default kitties for each egg id (fallback if API returns empty)
const defaultKittiesByEggId: Record<number, Kitty[]> = {
  1: [
    { id: 101, name: "Fluffy", rarity: "Common", earnPerDay: 0.0002, dropRate: 40, eggTypeId: 1 },
    { id: 102, name: "Meowster", rarity: "Common", earnPerDay: 0.0005, dropRate: 35, eggTypeId: 1 },
    { id: 103, name: "Stripey", rarity: "Rare", earnPerDay: 0.0035, dropRate: 15, eggTypeId: 1 },
    { id: 104, name: "Luna", rarity: "Epic", earnPerDay: 0.01, dropRate: 7, eggTypeId: 1 },
    { id: 105, name: "Glitch", rarity: "Epic", earnPerDay: 0.02, dropRate: 2, eggTypeId: 1 },
    { id: 106, name: "Phantom", rarity: "Legendary", earnPerDay: 0.1, dropRate: 1, eggTypeId: 1 },
  ],
  2: [
    { id: 201, name: "Tofu", rarity: "Common", earnPerDay: 0.002, dropRate: 35, eggTypeId: 2 },
    { id: 202, name: "Boba", rarity: "Common", earnPerDay: 0.005, dropRate: 30, eggTypeId: 2 },
    { id: 203, name: "Ash", rarity: "Rare", earnPerDay: 0.035, dropRate: 15, eggTypeId: 2 },
    { id: 204, name: "Miso", rarity: "Epic", earnPerDay: 0.1, dropRate: 10, eggTypeId: 2 },
    { id: 205, name: "Orion", rarity: "Epic", earnPerDay: 0.2, dropRate: 5, eggTypeId: 2 },
    { id: 206, name: "Phantom", rarity: "Legendary", earnPerDay: 0.1, dropRate: 3, eggTypeId: 2 },
    { id: 207, name: "Crystal", rarity: "Legendary", earnPerDay: 0.35, dropRate: 2, eggTypeId: 2 },
  ],
  3: [
    { id: 301, name: "Biscuit", rarity: "Common", earnPerDay: 0.015, dropRate: 30, eggTypeId: 3 },
    { id: 302, name: "Mochi", rarity: "Common", earnPerDay: 0.025, dropRate: 25, eggTypeId: 3 },
    { id: 303, name: "Onyx", rarity: "Rare", earnPerDay: 0.075, dropRate: 20, eggTypeId: 3 },
    { id: 304, name: "Salem", rarity: "Rare", earnPerDay: 0.05, dropRate: 15, eggTypeId: 3 },
    { id: 305, name: "Vega", rarity: "Epic", earnPerDay: 0.35, dropRate: 5, eggTypeId: 3 },
    { id: 306, name: "Ghost", rarity: "Epic", earnPerDay: 0.2, dropRate: 3, eggTypeId: 3 },
    { id: 307, name: "Solar", rarity: "Legendary", earnPerDay: 0.75, dropRate: 1.5, eggTypeId: 3 },
    { id: 308, name: "Eclipse", rarity: "Mythic", earnPerDay: 1.0, dropRate: 0.5, eggTypeId: 3 },
  ],
  4: [
    { id: 401, name: "Nebula", rarity: "Common", earnPerDay: 0.15, dropRate: 30, eggTypeId: 4 },
    { id: 402, name: "Jade", rarity: "Common", earnPerDay: 0.25, dropRate: 25, eggTypeId: 4 },
    { id: 403, name: "Blaze", rarity: "Rare", earnPerDay: 0.6, dropRate: 20, eggTypeId: 4 },
    { id: 404, name: "Aqua", rarity: "Rare", earnPerDay: 0.85, dropRate: 15, eggTypeId: 4 },
    { id: 405, name: "Storm", rarity: "Epic", earnPerDay: 2.0, dropRate: 5, eggTypeId: 4 },
    { id: 406, name: "Nova", rarity: "Epic", earnPerDay: 3.5, dropRate: 3, eggTypeId: 4 },
    { id: 407, name: "Dragon", rarity: "Legendary", earnPerDay: 6.0, dropRate: 1.5, eggTypeId: 4 },
    { id: 408, name: "Chronos", rarity: "Mythic", earnPerDay: 10.0, dropRate: 0.5, eggTypeId: 4 },
  ],
};


const Home = () => {
  // ...existing states
  const [inviteRewardHistory, setInviteRewardHistory] = useState<InviteRewardItem[]>([]);
  const [loadingInviteHistory, setLoadingInviteHistory] = useState(false);
  // User-related state and effects moved inside component
  const [user, setUser] = useState<User | null>(null);
  const [inviteRewardMsg, setInviteRewardMsg] = useState<string | null>(null);
  const [chestHistory, setChestHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Lấy lịch sử invite reward khi đã đăng nhập user
  useEffect(() => {
    if (user && user.telegram_id) {
      setLoadingInviteHistory(true);
      fetch(`/api/invite-rewards-history?telegram_id=${user.telegram_id}`)
        .then(res => res.json())
        .then(data => setInviteRewardHistory(data.history || []))
        .finally(() => setLoadingInviteHistory(false));
    }
  }, [user]);

  // Lấy lịch sử mở rương khi đã đăng nhập user
  useEffect(() => {
    if (user && user.telegram_id) {
      setLoadingHistory(true);
      fetch(`/api/chest-history?telegram_id=${user.telegram_id}`)
        .then(res => res.json())
        .then(data => setChestHistory(data.history || []))
        .finally(() => setLoadingHistory(false));
    }
  }, [user]);

  // Đăng nhập Telegram WebApp hoặc fallback
  useEffect(() => {
    async function loginTelegram() {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://nebulachestgamebackend.onrender.com';

      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe.user) {
        const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
        const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
        const { id, first_name, last_name, username, photo_url } = tgUser;
        const displayName = last_name ? `${first_name} ${last_name}`.trim() : first_name;

        try {
          const res = await fetch(`${apiUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: id.toString(),
              username: displayName || username,
              invite_by: startParam || '',
              avatar: photo_url || '',
            }),
          });
          const data = await res.json();
          if (data && data.user) {
            setUser(data.user);
            if (data.token) {
              localStorage.setItem('authToken', data.token);
            }
          }
        } catch (error) {
          console.error("Failed to login:", error);
        }
      } else {
        console.log("Telegram Web App user data not found. Using fallback.");
        const telegram_id = localStorage.getItem('telegram_id');
        if (telegram_id) {
          try {
            const res = await fetch(`${apiUrl}/api/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telegram_id }),
            });
            const data = await res.json();
            if (data && data.user) {
              setUser(data.user);
              if (data.token) {
                localStorage.setItem('authToken', data.token);
              }
            }
          } catch (error) {
            console.error("Fallback login failed:", error);
          }
        }
      }
    }
    loginTelegram();
  }, []);

  const [currentEgg, setCurrentEgg] = useState(0);
  const [showKittyDialog, setShowKittyDialog] = useState(false);
  const [showRewardsDialog, setShowRewardsDialog] = useState(false);
  const queryClient = useQueryClient();
  // Use our translation function
  const t = translate;

  // Fetch egg types from API
  const { data: eggTypes, isLoading: loadingEggs } = useQuery<EggType[]>({
    queryKey: ['/api/egg-types'],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://nebulachestgamebackend.onrender.com';
      const res = await fetch(`${apiUrl}/api/egg-types`);
      if (!res.ok) throw new Error('Failed to fetch egg types');
      return res.json();
    }
  });

  // Use API data if non-empty, otherwise fallback to defaults
  const eggs = (eggTypes && eggTypes.length > 0) ? eggTypes : defaultEggs;

  // Get current egg ID for fetching kitties
  // Ensure currentEgg index is within bounds when eggs array changes
  useEffect(() => {
    if (currentEgg >= eggs.length) {
      setCurrentEgg(0);
    }
  }, [eggs.length]);

  const currentEggId = eggs[currentEgg]?.id;

  // Fetch kitties data for the current egg
  const { data: kitties, isLoading: loadingKitties } = useQuery<Kitty[]>({
    queryKey: ['/api/kitties', currentEggId],
    queryFn: async () => {
      if (!currentEggId) return [];
      const apiUrl = import.meta.env.VITE_API_URL || 'https://nebulachestgamebackend.onrender.com';
      const response = await fetch(`${apiUrl}/api/kitties?eggTypeId=${currentEggId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch kitties');
      }
      return response.json();
    },
    enabled: !!currentEggId,
  });

  // Update kitties data when egg selection changes
  useEffect(() => {
    if (currentEggId) {
      queryClient.invalidateQueries({ queryKey: ['/api/kitties', currentEggId] });
    }
  }, [currentEgg, currentEggId, queryClient]);

  // FE balance, sync with Wallet/Home
  const [feBalance, setFeBalance] = useState(10000);
  // Handle egg opening
  const [isOpeningEgg, setIsOpeningEgg] = useState(false);
  const [openedKitty, setOpenedKitty] = useState<Kitty | null>(null);
  // FE collection and reward
  const [feCollection, setFeCollection] = useState<KittyWithCount[]>([]);
  const [feDailyReward, setFeDailyReward] = useState(0);
  const [feTotalReward, setFeTotalReward] = useState(0);
  // Thời điểm mở rương đầu tiên (timestamp ms)
  const [firstOpenTime, setFirstOpenTime] = useState<number | null>(null);
  // Countdown claim
  const [claimCountdown, setClaimCountdown] = useState(0);

  // Tính toán thời gian còn lại để claim
  useEffect(() => {
    if (!firstOpenTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - firstOpenTime;
      const left = 24 * 3600 * 1000 - elapsed;
      setClaimCountdown(left > 0 ? left : 0);
      if (left <= 0 && feDailyReward > 0) {
        setFeBalance(b => b + feDailyReward);
        setFeTotalReward(r => r + feDailyReward);
        const next = now;
        setFirstOpenTime(next);
        localStorage.setItem('firstOpenTime', next.toString());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [firstOpenTime, feDailyReward]);

  // Fetch user's kitty collection
  const { data: collectionKitties = [], refetch: refetchCollection } = useQuery<(Kitty & { count: number })[]>({
    queryKey: ['/api/user-kitties'],
    refetchOnWindowFocus: false,
  });

  // Update FE collection state when data from API changes
  useEffect(() => {
    setFeCollection(collectionKitties);
    setFeDailyReward(collectionKitties.reduce((sum, kitty) => sum + kitty.earnPerDay * kitty.count, 0));
  }, [collectionKitties]);

  // Refetch collection when a new kitty is opened
  useEffect(() => {
    if (openedKitty) {
      refetchCollection();
    }
  }, [openedKitty, refetchCollection]);

  // Fetch user data
  const { data: userData, isLoading: loadingUser } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  // Calculate total daily reward
  const totalDailyReward = collectionKitties.reduce((sum, kitty) => 
    sum + (kitty.earnPerDay * kitty.count), 0
  );

  const isLoading = loadingEggs || loadingUser;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenEgg = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!currentEggId || isOpeningEgg) return;
    const eggPrice = eggs[currentEgg]?.price || 0;
    if (feBalance < eggPrice) {
      setErrorMessage('Not enough balance to open this chest');
      return;
    }
    setIsOpeningEgg(true);
    setErrorMessage(null);
    const apiUrl = import.meta.env.VITE_API_URL || 'https://nebulachestgamebackend.onrender.com';
    try {
      const token = localStorage.getItem('token'); // IMPORTANT: Assumes token is stored in localStorage with key 'token'
      const response = await fetch(`${apiUrl}/api/open-egg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ eggTypeId: currentEggId }),
      });
      let data: any = null;
      if (!response.ok) {
        // Fallback: FE random reward
        const rewards = defaultKittiesByEggId[currentEggId] || [];
        if (rewards.length > 0) {
          const totalRate = rewards.reduce((sum, k) => sum + k.dropRate, 0);
          const rand = Math.random() * totalRate;
          let acc = 0;
          let selected = rewards[0];
          for (const k of rewards) {
            acc += k.dropRate;
            if (rand <= acc) {
              selected = k;
              break;
            }
          }
          setOpenedKitty(selected);
          setFeBalance((b) => b - eggPrice);
          setFeCollection((prev: KittyWithCount[]) => {
            const idx = prev.findIndex((k) => k.id === selected.id);
            let newCollection;
            if (idx !== -1) {
              newCollection = [...prev];
              newCollection[idx] = { ...newCollection[idx], count: newCollection[idx].count + 1 };
            } else {
              newCollection = [...prev, { ...selected, count: 1 }];
            }
            setFeDailyReward(newCollection.reduce((sum, k) => sum + k.earnPerDay * k.count, 0));
            return newCollection;
          });
          if (!firstOpenTime) {
            const now = Date.now();
            setFirstOpenTime(now);
            localStorage.setItem('firstOpenTime', now.toString());
          }
        }
        setIsOpeningEgg(false);
        return;
      }
      data = await response.json();
      if (user) {
        try {
          const res = await fetch(`${apiUrl}/api/open-chest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: user.telegram_id, chestValue: eggs[currentEgg].price })
          });
          const inviteData = await res.json();
          if (inviteData && inviteData.inviterRewarded && inviteData.inviter && inviteData.reward) {
            setInviteRewardMsg(`Bạn đã giúp người mời nhận ${inviteData.reward} TON!`);
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      setErrorMessage('Lỗi không xác định khi mở rương');
    } finally {
      setIsOpeningEgg(false);
    }
  };

const handlePrevEgg = () => {
  setCurrentEgg((prev: number) => (prev === 0 ? eggs.length - 1 : prev - 1));
};

const handleNextEgg = () => {
  setCurrentEgg((prev: number) => (prev === eggs.length - 1 ? 0 : prev + 1));
};

  return (
    <div id="home-screen">
      {errorMessage && (
        <div className="p-2 text-xs text-red-400 text-center">{errorMessage}</div>
      )}

      {/* User Info Header */}
      <div className="mx-2 mt-2 bg-gray-800/50 rounded-xl shadow-lg">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-3">
            {/* Profile Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-primary/50">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-7 h-7 text-gray-400" />
              )}
            </div>
            {/* User Name and Rank */}
            <div>
              <p className="font-semibold text-lg text-white">{user?.username || 'Player'}</p>
              <p className="text-sm text-gray-400 flex items-center">
                <Award className="w-4 h-4 mr-1 text-yellow-500" />
                <span>{user?.rank || 'KittyMint'}</span>
              </p>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </div>

    {/* Token Balance, Total Reward, and Daily Reward */}
    <div className="mt-4 px-4 text-center">
      <div className="bg-gradient-to-b from-gray-800/70 to-gray-900/70 rounded-xl p-4 shadow-lg border border-primary/30 backdrop-blur-sm">
        {/* Balance */}
        <div className="mb-4 pb-3 border-b border-primary/20">
          <div className="text-sm text-gray-300 mb-1 font-medium">{t('balance')}</div>
          <div className="text-xl font-display font-bold text-amber-500 flex items-center justify-center">
            <img src={tonLogo} alt="TON" className="w-6 h-6 mr-1" />
            <span>{feBalance.toFixed(3)}</span>
          </div>
        </div>
        
        {/* Rewards */}
        <div className="flex justify-between">
          <div className="flex-1 p-2 mx-1 bg-gray-800/50 rounded-lg border border-primary/20">
            <div className="text-sm text-gray-300 font-medium">{t('totalReward')}</div>
            <div className="flex items-center justify-center mt-1">
              <img src={tonLogo} alt="TON" className="w-4 h-4 mr-1" />
              <span className="font-semibold text-amber-400">{feTotalReward.toFixed(4)}</span>
            </div>
          </div>
          <div className="flex-1 p-2 mx-1 bg-gray-800/50 rounded-lg border border-primary/20">
            <div className="text-sm text-gray-300 font-medium">{t('dailyReward')}</div>
            <div className="flex items-center justify-center mt-1">
              <img src={tonLogo} alt="TON" className="w-4 h-4 mr-1" />
              <span className="font-semibold text-green-400">{feDailyReward.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Bộ sưu tập kitties */}
    <div className="mt-6 px-4">
      <div className="bg-gray-900/80 rounded-lg p-2 mb-4 border border-primary/20 scale-90" style={{maxWidth: 600}}>
        <div className="text-lg font-semibold text-white mb-2">Your Collection</div>
        <div className="flex flex-row gap-2 overflow-x-auto pb-1">
          {feCollection.length === 0 ? (
            <div className="text-center text-gray-400">No kitties yet. Open eggs to collect!</div>
          ) : (
            feCollection.map((kitty) => (
              <div key={kitty.id} className="flex flex-row items-center bg-gray-800/70 rounded-lg p-2 border border-primary/10 min-w-[140px] relative">
                <div className="w-10 h-10 mr-2 rounded-full border-2 border-yellow-400 bg-black flex items-center justify-center shadow-lg overflow-hidden relative">
                  <img src={kittyImages[kitty.name]} alt={kitty.name} className="w-full h-full object-contain" style={{imageRendering: 'auto'}} />
                </div>
                <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-500 text-[10px] rounded-full px-1 py-0.5">{kitty.count}</div>
                <div className="flex-1 flex flex-col items-start">
                  <div className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium mb-0.5 {
                    kitty.rarity === 'Common' ? 'border-gray-400 text-gray-300 bg-gray-800/40' :
                    kitty.rarity === 'Rare' ? 'border-blue-400 text-blue-300 bg-blue-900/30' :
                    kitty.rarity === 'Epic' ? 'border-purple-400 text-purple-200 bg-purple-900/30' :
                    kitty.rarity === 'Legendary' ? 'border-amber-400 text-amber-200 bg-yellow-900/30' :
                    'border-gray-400 text-gray-300 bg-gray-800/40'
                  }`}>
                    {kitty.name}
                  </div>
                  <div className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold mb-0.5 ml-1 {
                    kitty.rarity === 'Common' ? 'border-gray-400 text-gray-300 bg-gray-800/40' :
                    kitty.rarity === 'Rare' ? 'border-blue-400 text-blue-300 bg-blue-900/30' :
                    kitty.rarity === 'Epic' ? 'border-purple-400 text-purple-200 bg-purple-900/30' :
                    kitty.rarity === 'Legendary' ? 'border-amber-400 text-amber-200 bg-yellow-900/30' :
                    'border-gray-400 text-gray-300 bg-gray-800/40'
                  }`}>
                    {kitty.rarity}
                  </div>
                  <div className="text-[10px] text-green-400">Earn: {kitty.earnPerDay} TON/day</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>

    {/* Main Egg Display */}
    <div className="relative sunburst-bg">
      {/* EGG CAROUSEL */}
      <div className="relative py-8 egg-container flex justify-center items-center">
        {/* Previous Egg Button */}
        <button 
          onClick={handlePrevEgg}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-800/60 text-white rounded-full w-8 h-8 flex items-center justify-center z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
            <p className="text-sm text-white">Loading eggs...</p>
          </div>
        ) : (
          <>
            {/* Current Egg */}
            {eggs[currentEgg].id === 1 ? (
              <div className="relative w-40 h-40 flex items-center justify-center animate-float">
                <img 
                  src={miniEggImage} 
                  alt={t('miniEgg')} 
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                />
              </div>
            ) : eggs[currentEgg].id === 2 ? (
              <div className="relative w-40 h-40 flex items-center justify-center animate-float">
                <img 
                  src={starterEggImage} 
                  alt={t('starterEgg')} 
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(242,200,121,0.5)]" 
                />
              </div>
            ) : eggs[currentEgg].id === 3 ? (
              <div className="relative w-40 h-40 flex items-center justify-center animate-float">
                <img 
                  src={proEggImage} 
                  alt={t('proEgg')} 
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(239,149,156,0.5)]" 
                />
              </div>
            ) : eggs[currentEgg].id === 4 ? (
              <div className="relative w-40 h-40 flex items-center justify-center animate-float">
                <img 
                  src={genesisEggImage} 
                  alt={t('genesisEgg')} 
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(105,162,176,0.7)]" 
                />
              </div>
            ) : (
              <Egg 
                color={eggs[currentEgg].color || "#A7D7C9"} 
                spotColor={"#FFFFFF"} 
              />
            )}

            {/* Egg Label */}
            <div className="absolute right-8 top-1/3 z-10 flex flex-col items-center">
              <div className="flex items-center bg-black/50 backdrop-blur-sm rounded-lg p-1.5 hidden">
                <UserIcon className="text-lg" />
              </div>
              <span className="text-xs mt-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded hidden">{eggs[currentEgg].name}</span>
            </div>
          </>
        )}

        {/* Next Egg Button */}
        <button 
          onClick={handleNextEgg}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-800/60 text-white rounded-full w-8 h-8 flex items-center justify-center z-10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Egg Action Button */}
      <div className="relative -mt-4 px-10 mb-4">
        {errorMessage && (
          <div className="mb-2 text-sm text-red-400 bg-red-900/30 rounded-md p-2 text-center">
            {errorMessage}
          </div>
        )}
        <GradientButton 
          fullWidth 
          className="py-3 rounded-md font-medium text-white flex items-center justify-center space-x-2 shadow-lg"
          onClick={handleOpenEgg}
          disabled={isOpeningEgg}
        >
          {isOpeningEgg ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span>{t('opening')}</span>
            </>
          ) : (
            <>
              <span className="text-lg">{eggs[currentEgg].price} TON</span>
              <img src={tonLogo} alt="TON" className="w-5 h-5" />
            </>
          )}
        </GradientButton>

        {/* Opened Kitty Dialog */}
        {openedKitty && (
          <Dialog open={!!openedKitty} onOpenChange={(open) => !open && setOpenedKitty(null)}>
            <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-center">
                  <span className="block mb-1"> {t('congratulations')} </span>
                  <span>{t('youGotNewCat')}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col items-center p-4">
                <div 
                  className="w-24 h-24 rounded-full overflow-hidden mb-4 shadow-lg"
                >
                  {kittyImages[openedKitty.name] ? (
                    <img 
                      src={kittyImages[openedKitty.name]} 
                      alt={openedKitty.name}
                      className="w-full h-full object-contain bg-white rounded-full p-1 shadow-inner"
                    />
                  ) : (
                    <div 
                      style={{ backgroundColor: kittyColors[openedKitty.name] || openedKitty.color || '#888888' }} 
                      className="w-full h-full flex items-center justify-center"
                    >
                      <span className="text-3xl font-bold text-white">{openedKitty.name.charAt(0)}</span>
                    </div>
                  )}
                </div>

                <div className="text-center mb-4">
                  <div className="text-xl font-medium mb-1">{openedKitty.name}</div>
                  <div className={`text-sm px-3 py-1 rounded-full inline-block
                    ${openedKitty.rarity === 'Common' ? 'bg-gray-700 text-white' : 
                    openedKitty.rarity === 'Rare' ? 'bg-blue-600/50 text-blue-300' : 
                    openedKitty.rarity === 'Epic' ? 'bg-purple-600/50 text-purple-300' : 
                    openedKitty.rarity === 'Legendary' ? 'bg-amber-600/50 text-amber-300' : 
                    'bg-pink-600/50 text-pink-300'}
                  `}>
                    {openedKitty.rarity}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 w-full">
                  <div className="text-sm text-white mb-1">Earns per day:</div>
                  <div className="flex items-center justify-center text-amber-400 text-lg">
                    <img src={tonLogo} alt="TON" className="w-5 h-5 mr-2" />
                    <span>{openedKitty.earnPerDay} TON</span>
                  </div>
                </div>

                <button 
                  className="mt-4 w-full py-3 bg-primary rounded-md font-medium"
                  onClick={() => setOpenedKitty(null)}
                >
                  Awesome!
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        
      </div>
    </div>

    {/* Rewards Dialog Section */}
    <div className="px-4 mt-2">
      <div className="flex justify-center mb-2">
        <button
          className="bg-[#332966] text-[#b5aaff] px-2 py-1 rounded-md font-bold shadow hover:bg-[#493a7a] mb-1 text-xs scale-75"
          style={{ minWidth: 0 }}
          onClick={() => setShowRewardsDialog(true)}
        >
          What's inside?
        </button>
      </div>
      <ChestRewardsDialog
        open={showRewardsDialog}
        onClose={() => setShowRewardsDialog(false)}
        chestName={eggs[currentEgg].name + ' Chest'}
        rewards={(kitties && kitties.length > 0 ? kitties : defaultKittiesByEggId[currentEggId]).map((k) => ({
          id: k.id,
          name: k.name,
          image: kittyImages[k.name] || '',
          earnPerDay: k.earnPerDay,
          rate: k.dropRate
        }))}
      />
    </div>
  </div>
);
};

export default Home;