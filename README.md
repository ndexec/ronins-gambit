# Ronin's Gambit

> Mahjong solitaire, превращенный в самурайскую дуэль: каждая пара - удар клинком, каждая провинция - испытание, каждая победа - шаг к легенде.

[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=111)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?style=for-the-badge&logo=vite&logoColor=fff)](https://vite.dev/)
[![TanStack](https://img.shields.io/badge/TanStack-Start-ff4154?style=for-the-badge&logo=reactrouter&logoColor=fff)](https://tanstack.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ecf8e?style=for-the-badge&logo=supabase&logoColor=111)](https://supabase.com/)

**Ronin's Gambit** - браузерная игра, где классический mahjong solitaire становится тактическим поединком. Игрок странствует по провинциям, сражается с противниками, очищает многоуровневые раскладки, копит XP, держит ежедневные серии и поднимается в рейтинге.

Проект сделан как полноценное игровое веб-приложение: с авторизацией, профилем, историей партий, дуэльным HUD, ежедневным испытанием, шарингом результатов, магазином скинов и прогрессией.

## Что уже есть

- **Дуэльный режим**: находишь пары, наносишь урон врагу и следишь за своим HP.
- **Ежедневная дуэль**: одна общая раскладка на день и отдельный топ игроков.
- **Прогрессия**: XP, ранги, серии побед, daily streak, открытие провинций.
- **AI-коуч**: подсказки и советы по чтению поля.
- **Несколько раскладок**: черепаха, дракон, пирамида и крест.
- **Сложности**: easy, medium, hard и master.
- **Темы плиток**: classic, nature, moon и fire.
- **Шаринг челленджей**: можно переиграть тот же seed или поделиться результатом.
- **Профиль игрока**: статистика, история партий, город и место в рейтинге.
- **Лавка ронина**: demo PRO, скины клинков и эксклюзивные провинции.

## Как играется

1. Выбери провинцию, раскладку, сложность и тему плиток.
2. Начни дуэль с противником.
3. Снимай свободные одинаковые плитки парами.
4. Каждая пара бьет врага, ошибки и промедление могут стоить HP.
5. Используй подсказки, отмену, перемешивание, паузу и лечение.
6. Побеждай, получай XP, открывай новые провинции и поднимайся в рейтинге.

## Основные экраны

| Роут | Назначение |
| --- | --- |
| `/` | Главный экран, атмосфера игры и карта провинций |
| `/tutorial` | Интерактивное обучение для первого запуска |
| `/play` | Основной дуэльный режим |
| `/daily` | Ежедневное испытание с общей раскладкой |
| `/leaderboard` | Рейтинг дня, всех времен и игроков по городам |
| `/profile` | Профиль, XP, статистика и история партий |
| `/shop` | PRO-демо, скины клинков и премиум-провинции |
| `/auth` | Вход через Supabase |

## Стек

- **React 19** - интерфейс.
- **TanStack Router / React Start** - маршруты и структура приложения.
- **Vite 7** - dev server и production build.
- **Tailwind CSS 4** - стили.
- **Supabase** - auth, профили, история игр и рейтинги.
- **TanStack Query** - серверное состояние.
- **Lucide React** - иконки.
- **GitHub Pages** - деплой через GitHub Actions.

## Структура проекта

```text
src/
  components/
    AppShell.tsx
    MahjongBoard.tsx
  hooks/
    useAuth.ts
    useThemeMode.ts
  integrations/supabase/
    client.ts
    types.ts
  lib/
    mahjong/
      engine.ts
      layouts.ts
      tiles.ts
      duel-generator.ts
    ronin.ts
    share-card.ts
    profile-sync.ts
  routes/
    index.tsx
    play.tsx
    daily.tsx
    leaderboard.tsx
    profile.tsx
    shop.tsx
    tutorial.tsx
public/
  avatars/
  blade_skins/
  covers/
supabase/
.github/workflows/deploy.yml
```

## Быстрый старт

### Требования

- Node.js 20+
- npm
- Supabase project для авторизации и хранения прогресса

### Установка

```bash
npm install
```

### Переменные окружения

Создай `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполни значения:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
```

Опционально можно указать SSR fallback-переменные:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

### Запуск в разработке

```bash
npm run dev
```

Открой адрес, который покажет Vite. Обычно это:

```text
http://localhost:5173
```

### Production build

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

## Supabase

Приложение ожидает таблицы:

- `profiles` - профиль игрока, город, XP, ранг, победы, серии, saved preferences и PRO-состояние.
- `game_history` - история дуэлей: счет, seed, провинция, раскладка, сложность, время, ходы и результат.
- `daily_scores` - ежедневные результаты игроков.

Сгенерированные типы Supabase лежат здесь:

```text
src/integrations/supabase/types.ts
```

## Деплой

GitHub Pages деплой настроен в:

```text
.github/workflows/deploy.yml
```

При push в `main` workflow:

1. Устанавливает зависимости.
2. Собирает проект.
3. Загружает `dist`.
4. Публикует игру на GitHub Pages.

Нужные repository secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_ANON_KEY
```

## Скрипты

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Запускает локальный Vite dev server |
| `npm run build` | Собирает production build |
| `npm run build:dev` | Собирает development-mode build |
| `npm run preview` | Запускает preview production build |
| `npm run lint` | Проверяет проект через ESLint |
| `npm run format` | Форматирует проект через Prettier |

## Дизайн-направление

Ronin's Gambit задуман как атмосферная, но плотная игровая панель, а не лендинг. Интерфейс делает упор на:

- быстрое чтение боевой ситуации,
- спокойную самурайскую эстетику,
- province art как часть атмосферы,
- доступные основные действия во время партии,
- удобную мобильную игру,
- видимый прогресс после каждой дуэли.

## Лицензия

Сейчас репозиторий не содержит open-source лицензии.

