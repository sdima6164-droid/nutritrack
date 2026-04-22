const FOODS_DB = [
  // Мясо и птица
  { id: 1, name: 'Куриная грудка (варёная)', category: 'meat', proteins: 30.4, fats: 3.2, carbs: 0, calories: 165 },
  { id: 2, name: 'Куриное бедро (варёное)', category: 'meat', proteins: 21.5, fats: 10.2, carbs: 0, calories: 185 },
  { id: 3, name: 'Говядина (варёная)', category: 'meat', proteins: 25.7, fats: 16.8, carbs: 0, calories: 254 },
  { id: 4, name: 'Свинина (варёная)', category: 'meat', proteins: 22.6, fats: 18.5, carbs: 0, calories: 260 },
  { id: 5, name: 'Индейка (варёная)', category: 'meat', proteins: 28.0, fats: 5.0, carbs: 0, calories: 165 },
  { id: 6, name: 'Фарш говяжий (жареный)', category: 'meat', proteins: 26.0, fats: 17.0, carbs: 0, calories: 262 },
  { id: 7, name: 'Сосиски молочные', category: 'meat', proteins: 11.0, fats: 23.9, carbs: 1.6, calories: 261 },
  { id: 8, name: 'Колбаса варёная', category: 'meat', proteins: 12.8, fats: 22.8, carbs: 0, calories: 260 },
  { id: 9, name: 'Бекон жареный', category: 'meat', proteins: 37.0, fats: 42.0, carbs: 1.4, calories: 541 },
  { id: 10, name: 'Печень куриная', category: 'meat', proteins: 20.4, fats: 5.9, carbs: 0.73, calories: 140 },

  // Рыба и морепродукты
  { id: 11, name: 'Лосось (запечённый)', category: 'fish', proteins: 25.4, fats: 13.4, carbs: 0, calories: 220 },
  { id: 12, name: 'Тунец (консервы в воде)', category: 'fish', proteins: 23.6, fats: 2.0, carbs: 0, calories: 116 },
  { id: 13, name: 'Треска (варёная)', category: 'fish', proteins: 22.8, fats: 0.9, carbs: 0, calories: 105 },
  { id: 14, name: 'Скумбрия (варёная)', category: 'fish', proteins: 20.0, fats: 15.5, carbs: 0, calories: 221 },
  { id: 15, name: 'Креветки варёные', category: 'fish', proteins: 20.3, fats: 1.7, carbs: 0.9, calories: 99 },
  { id: 16, name: 'Горбуша (консервы)', category: 'fish', proteins: 21.0, fats: 5.1, carbs: 0, calories: 136 },
  { id: 17, name: 'Сельдь солёная', category: 'fish', proteins: 17.7, fats: 19.5, carbs: 0, calories: 246 },
  { id: 18, name: 'Минтай (варёный)', category: 'fish', proteins: 19.0, fats: 1.1, carbs: 0, calories: 90 },

  // Молочные продукты и яйца
  { id: 19, name: 'Яйцо куриное', category: 'dairy', proteins: 12.7, fats: 10.9, carbs: 0.7, calories: 157 },
  { id: 20, name: 'Молоко 2.5%', category: 'dairy', proteins: 2.8, fats: 2.5, carbs: 4.7, calories: 52 },
  { id: 21, name: 'Молоко 3.5%', category: 'dairy', proteins: 2.8, fats: 3.5, carbs: 4.7, calories: 60 },
  { id: 22, name: 'Кефир 1%', category: 'dairy', proteins: 2.8, fats: 1.0, carbs: 4.0, calories: 40 },
  { id: 23, name: 'Творог 0%', category: 'dairy', proteins: 18.0, fats: 0.6, carbs: 1.8, calories: 88 },
  { id: 24, name: 'Творог 5%', category: 'dairy', proteins: 17.2, fats: 5.0, carbs: 1.8, calories: 121 },
  { id: 25, name: 'Творог 9%', category: 'dairy', proteins: 16.7, fats: 9.0, carbs: 2.0, calories: 159 },
  { id: 26, name: 'Сметана 15%', category: 'dairy', proteins: 2.6, fats: 15.0, carbs: 3.0, calories: 161 },
  { id: 27, name: 'Сметана 20%', category: 'dairy', proteins: 2.5, fats: 20.0, carbs: 3.2, calories: 206 },
  { id: 28, name: 'Йогурт натуральный 2.5%', category: 'dairy', proteins: 4.3, fats: 2.5, carbs: 6.3, calories: 66 },
  { id: 29, name: 'Сыр Российский', category: 'dairy', proteins: 23.2, fats: 29.5, carbs: 0, calories: 371 },
  { id: 30, name: 'Сыр Пармезан', category: 'dairy', proteins: 38.0, fats: 28.0, carbs: 3.2, calories: 431 },
  { id: 31, name: 'Сыр Рикотта', category: 'dairy', proteins: 11.3, fats: 13.0, carbs: 3.0, calories: 174 },
  { id: 32, name: 'Масло сливочное', category: 'dairy', proteins: 0.5, fats: 82.5, carbs: 0.8, calories: 748 },
  { id: 33, name: 'Белок яичный', category: 'dairy', proteins: 10.8, fats: 0.0, carbs: 0.7, calories: 44 },
  { id: 34, name: 'Желток яичный', category: 'dairy', proteins: 16.2, fats: 31.9, carbs: 1.0, calories: 352 },

  // Крупы и злаки
  { id: 35, name: 'Гречка варёная', category: 'grains', proteins: 4.2, fats: 1.1, carbs: 21.3, calories: 110 },
  { id: 36, name: 'Рис белый варёный', category: 'grains', proteins: 2.7, fats: 0.3, carbs: 28.2, calories: 130 },
  { id: 37, name: 'Рис бурый варёный', category: 'grains', proteins: 2.6, fats: 0.9, carbs: 23.0, calories: 112 },
  { id: 38, name: 'Овсяные хлопья', category: 'grains', proteins: 11.0, fats: 6.1, carbs: 65.4, calories: 342 },
  { id: 39, name: 'Овсяная каша (на воде)', category: 'grains', proteins: 3.0, fats: 1.7, carbs: 15.0, calories: 84 },
  { id: 40, name: 'Перловая крупа варёная', category: 'grains', proteins: 3.4, fats: 0.4, carbs: 22.1, calories: 109 },
  { id: 41, name: 'Пшённая каша (на воде)', category: 'grains', proteins: 3.0, fats: 0.7, carbs: 17.0, calories: 90 },
  { id: 42, name: 'Макароны варёные', category: 'grains', proteins: 4.3, fats: 0.7, carbs: 23.0, calories: 114 },
  { id: 43, name: 'Хлеб ржаной', category: 'grains', proteins: 6.6, fats: 1.2, carbs: 34.2, calories: 174 },
  { id: 44, name: 'Хлеб белый', category: 'grains', proteins: 7.7, fats: 2.4, carbs: 49.0, calories: 242 },
  { id: 45, name: 'Хлеб цельнозерновой', category: 'grains', proteins: 8.1, fats: 1.4, carbs: 40.6, calories: 210 },
  { id: 46, name: 'Киноа варёная', category: 'grains', proteins: 4.1, fats: 1.9, carbs: 21.3, calories: 120 },

  // Овощи
  { id: 47, name: 'Картофель варёный', category: 'vegetables', proteins: 2.0, fats: 0.1, carbs: 17.0, calories: 77 },
  { id: 48, name: 'Картофель печёный', category: 'vegetables', proteins: 2.5, fats: 0.1, carbs: 20.0, calories: 93 },
  { id: 49, name: 'Морковь сырая', category: 'vegetables', proteins: 1.3, fats: 0.1, carbs: 6.9, calories: 32 },
  { id: 50, name: 'Капуста белокочанная', category: 'vegetables', proteins: 1.8, fats: 0.1, carbs: 4.7, calories: 27 },
  { id: 51, name: 'Брокколи', category: 'vegetables', proteins: 2.8, fats: 0.4, carbs: 6.6, calories: 34 },
  { id: 52, name: 'Огурец', category: 'vegetables', proteins: 0.8, fats: 0.1, carbs: 2.8, calories: 15 },
  { id: 53, name: 'Помидор', category: 'vegetables', proteins: 0.9, fats: 0.2, carbs: 3.7, calories: 20 },
  { id: 54, name: 'Перец болгарский', category: 'vegetables', proteins: 1.3, fats: 0.1, carbs: 6.7, calories: 31 },
  { id: 55, name: 'Свёкла варёная', category: 'vegetables', proteins: 1.9, fats: 0.0, carbs: 10.8, calories: 49 },
  { id: 56, name: 'Лук репчатый', category: 'vegetables', proteins: 1.4, fats: 0.0, carbs: 10.4, calories: 41 },
  { id: 57, name: 'Чеснок', category: 'vegetables', proteins: 6.5, fats: 0.5, carbs: 29.9, calories: 149 },
  { id: 58, name: 'Шпинат', category: 'vegetables', proteins: 2.9, fats: 0.4, carbs: 3.6, calories: 23 },
  { id: 59, name: 'Цукини', category: 'vegetables', proteins: 1.2, fats: 0.1, carbs: 3.1, calories: 17 },
  { id: 60, name: 'Тыква', category: 'vegetables', proteins: 1.0, fats: 0.1, carbs: 4.4, calories: 22 },

  // Фрукты и ягоды
  { id: 61, name: 'Яблоко', category: 'fruits', proteins: 0.4, fats: 0.4, carbs: 11.8, calories: 47 },
  { id: 62, name: 'Банан', category: 'fruits', proteins: 1.5, fats: 0.2, carbs: 21.8, calories: 95 },
  { id: 63, name: 'Апельсин', category: 'fruits', proteins: 0.9, fats: 0.2, carbs: 8.1, calories: 36 },
  { id: 64, name: 'Виноград', category: 'fruits', proteins: 0.6, fats: 0.2, carbs: 15.4, calories: 65 },
  { id: 65, name: 'Клубника', category: 'fruits', proteins: 0.8, fats: 0.4, carbs: 7.5, calories: 33 },
  { id: 66, name: 'Черника', category: 'fruits', proteins: 1.1, fats: 0.4, carbs: 14.5, calories: 57 },
  { id: 67, name: 'Груша', category: 'fruits', proteins: 0.4, fats: 0.3, carbs: 10.9, calories: 42 },
  { id: 68, name: 'Арбуз', category: 'fruits', proteins: 0.6, fats: 0.1, carbs: 7.5, calories: 30 },
  { id: 69, name: 'Манго', category: 'fruits', proteins: 0.8, fats: 0.4, carbs: 14.8, calories: 60 },
  { id: 70, name: 'Авокадо', category: 'fruits', proteins: 2.0, fats: 15.4, carbs: 0.5, calories: 160 },

  // Орехи и семена
  { id: 71, name: 'Грецкий орех', category: 'nuts', proteins: 15.2, fats: 65.2, carbs: 7.0, calories: 654 },
  { id: 72, name: 'Миндаль', category: 'nuts', proteins: 21.2, fats: 49.9, carbs: 13.0, calories: 575 },
  { id: 73, name: 'Кешью', category: 'nuts', proteins: 18.2, fats: 44.0, carbs: 30.2, calories: 576 },
  { id: 74, name: 'Арахис', category: 'nuts', proteins: 26.3, fats: 45.2, carbs: 9.9, calories: 567 },
  { id: 75, name: 'Семена подсолнечника', category: 'nuts', proteins: 20.7, fats: 52.9, carbs: 10.5, calories: 601 },
  { id: 76, name: 'Семена льна', category: 'nuts', proteins: 18.3, fats: 42.2, carbs: 28.9, calories: 534 },
  { id: 77, name: 'Арахисовая паста', category: 'nuts', proteins: 25.1, fats: 50.4, carbs: 16.1, calories: 589 },

  // Масла и жиры
  { id: 78, name: 'Масло оливковое', category: 'fats', proteins: 0, fats: 99.8, carbs: 0, calories: 898 },
  { id: 79, name: 'Масло подсолнечное', category: 'fats', proteins: 0, fats: 99.9, carbs: 0, calories: 899 },

  // Бобовые
  { id: 80, name: 'Фасоль красная варёная', category: 'legumes', proteins: 8.7, fats: 0.5, carbs: 22.8, calories: 127 },
  { id: 81, name: 'Чечевица варёная', category: 'legumes', proteins: 9.0, fats: 0.4, carbs: 20.1, calories: 116 },
  { id: 82, name: 'Нут варёный', category: 'legumes', proteins: 8.9, fats: 2.6, carbs: 27.4, calories: 164 },
  { id: 83, name: 'Горошек зелёный', category: 'legumes', proteins: 5.0, fats: 0.2, carbs: 8.3, calories: 55 },
  { id: 84, name: 'Тофу', category: 'legumes', proteins: 8.1, fats: 4.8, carbs: 1.9, calories: 76 },

  // Готовые блюда / Фастфуд
  { id: 85, name: 'Пицца Маргарита (1 кусок)', category: 'fast', proteins: 11.0, fats: 10.0, carbs: 33.0, calories: 266 },
  { id: 86, name: 'Бургер (классический)', category: 'fast', proteins: 13.0, fats: 17.0, carbs: 24.0, calories: 295 },
  { id: 87, name: 'Пельмени варёные', category: 'fast', proteins: 11.9, fats: 10.0, carbs: 29.0, calories: 245 },
  { id: 88, name: 'Оливье с колбасой', category: 'fast', proteins: 4.7, fats: 9.8, carbs: 5.8, calories: 129 },
  { id: 89, name: 'Борщ со сметаной', category: 'fast', proteins: 3.2, fats: 3.6, carbs: 7.2, calories: 74 },
  { id: 90, name: 'Гречка с курицей', category: 'fast', proteins: 16.0, fats: 5.0, carbs: 18.0, calories: 185 },

  // Напитки
  { id: 91, name: 'Кофе (чёрный без сахара)', category: 'drinks', proteins: 0.2, fats: 0.0, carbs: 0.0, calories: 2 },
  { id: 92, name: 'Апельсиновый сок', category: 'drinks', proteins: 0.9, fats: 0.2, carbs: 10.4, calories: 45 },
  { id: 93, name: 'Протеиновый коктейль (на воде)', category: 'drinks', proteins: 20.0, fats: 1.5, carbs: 3.0, calories: 105 },

  // Сладкое
  { id: 94, name: 'Шоколад тёмный 70%', category: 'sweets', proteins: 7.8, fats: 32.4, carbs: 45.9, calories: 598 },
  { id: 95, name: 'Шоколад молочный', category: 'sweets', proteins: 6.9, fats: 35.7, carbs: 52.4, calories: 569 },
  { id: 96, name: 'Мёд', category: 'sweets', proteins: 0.3, fats: 0.0, carbs: 82.4, calories: 304 },
  { id: 97, name: 'Сахар', category: 'sweets', proteins: 0.0, fats: 0.0, carbs: 99.8, calories: 387 },
  { id: 98, name: 'Варенье', category: 'sweets', proteins: 0.3, fats: 0.1, carbs: 65.0, calories: 238 },
  { id: 99, name: 'Мороженое пломбир', category: 'sweets', proteins: 3.7, fats: 15.0, carbs: 20.1, calories: 227 },
  { id: 100, name: 'Печенье овсяное', category: 'sweets', proteins: 6.5, fats: 9.8, carbs: 66.0, calories: 437 },
];

const CATEGORY_NAMES = {
  meat: 'Мясо и птица',
  fish: 'Рыба и морепродукты',
  dairy: 'Молочные продукты и яйца',
  grains: 'Крупы и злаки',
  vegetables: 'Овощи',
  fruits: 'Фрукты и ягоды',
  nuts: 'Орехи и семена',
  fats: 'Масла',
  legumes: 'Бобовые',
  fast: 'Готовые блюда',
  drinks: 'Напитки',
  sweets: 'Сладкое',
};
