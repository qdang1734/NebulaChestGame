import { languages } from '@/components/ui/language-selector';

// Define the translations interface
interface Translations {
  [language: string]: {
    [key: string]: string;
  };
}

// All translations for the app
export const translations: Translations = {
  en: {
    // Common
    'balance': 'Balance',
    'totalReward': 'Total Reward',
    'dailyReward': 'Daily Reward',
    'collection': 'Collection',
    'whatIsInside': 'What\'s Inside?',
    'earnsPerDay': 'Earns per day',
    'dropChance': 'Drop chance',
    'loading': 'Loading...',
    'openingEgg': 'Opening...',
    'player': 'Player',
    'beginner': 'Beginner',
    
    // Eggs
    'miniEgg': 'Mini Chest',
    'starterEgg': 'Starter Chest',
    'proEgg': 'Pro Chest',
    'genesisEgg': 'Genesis Chest',
    'opening': 'Opening...',
    
    // Kitties
    'congratulations': 'Congratulations!',
    'youGotNewCat': 'You got a new cat!!!',
    'awesome': 'Awesome!',
    'possibleCats': 'Possible Cats',
    'tonsPerDay': 'TON / Day',
    'noCats': 'No cats found for this chest',
    'noCollection': 'No items in the collection',
    'openToGetItems': 'Buy and open chests to get items!',
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
    'loading': 'Загрузка...',
    'openingEgg': 'Открывается...',
    'player': 'Игрок',
    'beginner': 'Новичок',
    
    // Eggs
    'miniEgg': 'Мини сундук',
    'starterEgg': 'Начальный сундук',
    'proEgg': 'Про сундук',
    'genesisEgg': 'Генезис сундук',
    'opening': 'Открывается...',
    
    // Kitties
    'congratulations': 'Поздравляем!',
    'youGotNewCat': 'Вы получили нового кота!!!',
    'awesome': 'Круто!',
    'possibleCats': 'Возможные коты',
    'tonsPerDay': 'TON / день',
    'noCats': 'Не найдено котов для этого сундука',
    'noCollection': 'Нет предметов в коллекции',
    'openToGetItems': 'Купите и откройте сундуки, чтобы получить предметы!',
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
    'loading': '加载中...',
    'openingEgg': '正在打开...',
    'player': '玩家',
    'beginner': '初学者',
    
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
    'noCats': '没有找到这个宝箱的猫',
    'noCollection': '收藏中没有物品',
    'openToGetItems': '购买并打开宝箱以获取物品！',
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
    'loading': '로딩 중...',
    'openingEgg': '여는 중...',
    'player': '플레이어',
    'beginner': '초보자',
    
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
    'noCats': '이 보물상자에 대한 고양이를 찾을 수 없습니다',
    'noCollection': '컬렉션에 아이템이 없습니다',
    'openToGetItems': '보물상자를 구매하고 열어서 아이템을 얻으세요!',
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
    'loading': 'Đang tải...',
    'openingEgg': 'Đang mở...',
    'player': 'Người chơi',
    'beginner': 'Người mới',
    
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
    'noCollection': 'Không có vật phẩm trong bộ sưu tập',
    'openToGetItems': 'Mua và mở rương báu để nhận vật phẩm!',
  }
};

// Get current language from localStorage or default to 'en'
export const getCurrentLanguage = (): string => {
  const savedLang = localStorage.getItem('app_language');
  return savedLang && languages.some(lang => lang.code === savedLang) 
    ? savedLang 
    : 'en';
};

// Translation function
export const translate = (key: string): string => {
  const currentLang = getCurrentLanguage();
  return translations[currentLang]?.[key] || translations['en'][key] || key;
};