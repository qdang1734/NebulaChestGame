import { db } from './db';
import { eggTypes, kitties } from './schema';
import 'dotenv/config';

async function seed() {
  console.log('Bắt đầu gieo dữ liệu cho cơ sở dữ liệu...');

  // --- CÁC LOẠI TRỨNG ---
  // Dữ liệu này sẽ chỉ được thêm vào nếu ID chưa tồn tại.
  const eggTypesData = [
    { id: 1, name: 'Mini Egg', price: 10, minEarnPerDay: 1, maxEarnPerDay: 5, description: 'Một quả trứng nhỏ nhưng có võ.', color: '#F4D03F' },
    { id: 2, name: 'Starter Egg', price: 50, minEarnPerDay: 5, maxEarnPerDay: 15, description: 'Một khởi đầu tuyệt vời cho mọi nhà sưu tập.', color: '#5DADE2' },
    { id: 3, name: 'Pro Egg', price: 200, minEarnPerDay: 20, maxEarnPerDay: 50, description: 'Dành cho những người đam mê mèo chuyên nghiệp.', color: '#AF7AC5' },
    { id: 4, name: 'Genesis Egg', price: 1000, minEarnPerDay: 100, maxEarnPerDay: 250, description: 'Một quả trứng có nguồn gốc huyền thoại.', color: '#58D68D' },
  ];

  await db.insert(eggTypes).values(eggTypesData).onConflictDoNothing();
  console.log('Đã gieo xong dữ liệu cho các loại trứng.');

  // --- CÁC LOẠI MÈO ---
  // Dữ liệu này sẽ chỉ được thêm vào nếu tên mèo chưa tồn tại.
  const kittiesData = [
    // Mèo từ Mini Egg (eggTypeId: 1)
    { name: 'Pebble', rarity: 'Common', earnPerDay: 1, dropRate: 60, eggTypeId: 1, color: '#AAB7B8', spotColor: '#ECF0F1' },
    { name: 'Sprout', rarity: 'Common', earnPerDay: 2, dropRate: 30, eggTypeId: 1, color: '#ABEBC6', spotColor: '#2ECC71' },
    { name: 'Sparky', rarity: 'Rare', earnPerDay: 5, dropRate: 10, eggTypeId: 1, color: '#FAD7A0', spotColor: '#F39C12' },

    // Mèo từ Starter Egg (eggTypeId: 2)
    { name: 'Aqua', rarity: 'Common', earnPerDay: 5, dropRate: 50, eggTypeId: 2, color: '#AED6F1', spotColor: '#3498DB' },
    { name: 'Bolt', rarity: 'Common', earnPerDay: 8, dropRate: 35, eggTypeId: 2, color: '#F9E79F', spotColor: '#F1C40F' },
    { name: 'Rocky', rarity: 'Rare', earnPerDay: 12, dropRate: 10, eggTypeId: 2, color: '#D5DBDB', spotColor: '#95A5A6' },
    { name: 'Blaze', rarity: 'Epic', earnPerDay: 15, dropRate: 5, eggTypeId: 2, color: '#F5B7B1', spotColor: '#E74C3C' },

    // Mèo từ Pro Egg (eggTypeId: 3)
    { name: 'Violet', rarity: 'Common', earnPerDay: 20, dropRate: 40, eggTypeId: 3, color: '#D7BDE2', spotColor: '#8E44AD' },
    { name: 'Shadow', rarity: 'Rare', earnPerDay: 30, dropRate: 30, eggTypeId: 3, color: '#AAB7B8', spotColor: '#566573' },
    { name: 'Crystal', rarity: 'Epic', earnPerDay: 40, dropRate: 20, eggTypeId: 3, color: '#D6EAF8', spotColor: '#5DADE2' },
    { name: 'Inferno', rarity: 'Legendary', earnPerDay: 50, dropRate: 10, eggTypeId: 3, color: '#FAD7A0', spotColor: '#E67E22' },

    // Mèo từ Genesis Egg (eggTypeId: 4)
    { name: 'Verdant', rarity: 'Rare', earnPerDay: 100, dropRate: 50, eggTypeId: 4, color: '#D5F5E3', spotColor: '#28B463' },
    { name: 'Stardust', rarity: 'Epic', earnPerDay: 150, dropRate: 30, eggTypeId: 4, color: '#EBDEF0', spotColor: '#9B59B6' },
    { name: 'Nebula', rarity: 'Legendary', earnPerDay: 200, dropRate: 15, eggTypeId: 4, color: '#D4E6F1', spotColor: '#3498DB' },
    { name: 'Cosmo', rarity: 'Mythic', earnPerDay: 250, dropRate: 5, eggTypeId: 4, color: '#FCF3CF', spotColor: '#F1C40F' },
  ];

  await db.insert(kitties).values(kittiesData).onConflictDoNothing();
  console.log('Đã gieo xong dữ liệu cho các loại mèo.');

  console.log('Hoàn tất gieo dữ liệu cho cơ sở dữ liệu!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Lỗi trong quá trình gieo dữ liệu:', error);
  process.exit(1);
});
