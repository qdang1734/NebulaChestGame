import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { languages } from '@/components/ui/language-selector';

// Define the translations interface
interface Translations {
  [language: string]: {
    [key: string]: string;
  };
}

// All translations for the app
const translations: Translations = {
  en: {
    // Common
    'balance': 'Balance',
    'totalReward': 'Total Reward',
    'dailyReward': 'Daily Reward',
    'collection': 'Collection',
    'whatIsInside': 'What\'s Inside?',
    'earnsPerDay': 'Earns per day',
    'dropChance': 'Drop chance',
    'beginner': 'Beginner',
    'eggsOpened': 'eggs opened',
    'player': 'Player',
    
    // Eggs
    'miniEgg': 'Mini Egg',
    'starterEgg': 'Starter Egg',
    'proEgg': 'Pro Egg',
    'genesisEgg': 'Genesis Egg',
    'opening': 'Opening...',
    
    // Kitties
    'congratulations': 'Congratulations!',
    'youGotNewCat': 'You got a new cat!!!',
    'awesome': 'Awesome!',
    'possibleCats': 'Possible Cats',
    'tonsPerDay': 'TON / Day',
    'noCats': 'No cats found for this egg',
  },
  ru: {
    // Common
    'balance': 'Баланс',
    'totalReward': 'Общая награда',
    'dailyReward': 'Дневная награда',
    'collection': 'Коллекция',
    'whatIsInside': 'Что внутри?',
    'earnsPerDay': 'Зарабатывает в день',
    'dropChance': 'Шанс выпадения',
    'beginner': 'Новичок',
    'eggsOpened': 'яиц открыто',
    'player': 'Игрок',
    
    // Eggs
    'miniEgg': 'Мини яйцо',
    'starterEgg': 'Начальное яйцо',
    'proEgg': 'Профессиональное яйцо',
    'genesisEgg': 'Генезис яйцо',
    'opening': 'Открывается...',
    
    // Kitties
    'congratulations': 'Поздравляем!',
    'youGotNewCat': 'Вы получили нового кота!!!',
    'awesome': 'Круто!',
    'possibleCats': 'Возможные коты',
    'tonsPerDay': 'TON / день',
    'noCats': 'Не найдено котов для этого яйца',
  },
  cn: {
    // Common
    'balance': '余额',
    'totalReward': '总奖励',
    'dailyReward': '每日奖励',
    'collection': '收藏',
    'whatIsInside': '里面有什么？',
    'earnsPerDay': '每天赚取',
    'dropChance': '掉落几率',
    'beginner': '新手',
    'eggsOpened': '已开启宝箱',
    'player': '玩家',
    
    // Eggs
    'miniEgg': '迷你宝箱',
    'starterEgg': '初级宝箱',
    'proEgg': '专业宝箱',
    'genesisEgg': '创世宝箱',
    'opening': '正在打开...',
    
    // Kitties
    'congratulations': '恭喜！',
    'youGotNewCat': '你得到了一只新猫！！！',
    'awesome': '太棒了！',
    'possibleCats': '可能的猫咪',
    'tonsPerDay': 'TON / 天',
    'noCats': '没有找到这个蛋的猫',
  },
  kr: {
    // Common
    'balance': '잔액',
    'totalReward': '총 보상',
    'dailyReward': '일일 보상',
    'collection': '컬렉션',
    'whatIsInside': '안에 무엇이 있나요?',
    'earnsPerDay': '하루 수익',
    'dropChance': '드롭 확률',
    'beginner': '초보자',
    'eggsOpened': '개의 보물상자 열림',
    'player': '플레이어',
    
    // Eggs
    'miniEgg': '미니 보물상자',
    'starterEgg': '초보자 보물상자',
    'proEgg': '전문가 보물상자',
    'genesisEgg': '창세기 보물상자',
    'opening': '여는 중...',
    
    // Kitties
    'congratulations': '축하합니다!',
    'youGotNewCat': '새로운 고양이를 얻었습니다!!!',
    'awesome': '멋져요!',
    'possibleCats': '가능한 고양이',
    'tonsPerDay': 'TON / 일',
    'noCats': '이 알에 대한 고양이를 찾을 수 없습니다',
  },
  vn: {
    // Common
    'balance': 'Số dư',
    'totalReward': 'Tổng phần thưởng',
    'dailyReward': 'Phần thưởng hàng ngày',
    'collection': 'Bộ sưu tập',
    'whatIsInside': 'Bên trong có gì?',
    'earnsPerDay': 'Thu nhập mỗi ngày',
    'dropChance': 'Tỷ lệ rơi',
    'beginner': 'Người mới',
    'eggsOpened': 'rương đã mở',
    'player': 'Người chơi',
    
    // Eggs
    'miniEgg': 'Rương báu nhỏ',
    'starterEgg': 'Rương báu khởi đầu',
    'proEgg': 'Rương báu cao cấp',
    'genesisEgg': 'Rương báu kim cương',
    'opening': 'Đang mở...',
    
    // Kitties
    'congratulations': 'Chúc mừng!',
    'youGotNewCat': 'Bạn đã nhận được một chú mèo mới!!!',
    'awesome': 'Tuyệt vời!',
    'possibleCats': 'Các chú mèo có thể nhận',
    'tonsPerDay': 'TON / ngày',
    'noCats': 'Không tìm thấy mèo cho rương này',
  }
};

// Create the context
interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Get initial language from localStorage or default to 'en'
  const [language, setLanguage] = useState(() => {
    const savedLang = localStorage.getItem('app_language');
    return savedLang && languages.some(lang => lang.code === savedLang) 
      ? savedLang 
      : 'en';
  });

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  // Translation function
  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};