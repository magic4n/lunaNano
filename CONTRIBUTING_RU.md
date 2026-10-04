# Руководство по участию в разработке LunaNano 🌙

[English](CONTRIBUTING.md) | [Русский](CONTRIBUTING_RU.md)

Спасибо за интерес к участию в развитии проекта **LunaNano**! Мы рады вкладу разработчиков, дизайнеров и тестировщиков.

---

## 🛠️ Структура кодовой базы

LunaNano организован как модульный монорепозиторий:

- **`compositor/`**: Нативный Wayland-композитор на Rust.
  - `src/main.rs`: Точка входа и аргументы командной строки.
  - `src/wayland.rs`: Протоколы Wayland и интеграция XWayland.
  - `src/ipc.rs`: Асинхронный сервер WebSocket IPC (`127.0.0.1:4242`).
  - `src/pty.rs`: Сессии терминала Linux PTY (`portable-pty`).
  - `src/system.rs`: Системные интерфейсы (PipeWire, сеть, яркость, питание).
  - `src/fs_ops.rs`: Высокопроизводительные операции с ФС и архивами.
  - `src/config.rs`: Хранение и чтение настроек (`~/.config/lunanano/settings.json`).
- **`src/`**: Автономная React-оболочка рабочего стола.
  - `components/dock/`: Капсулы нижнего дока и панель быстрых настроек.
  - `components/window/`: Декоратор окон и движок прикрепления (Snap).
  - `apps/`: Встроенные приложения (Терминал, Калькулятор, Проводник, Блокнот, Настройки, Лаунчер).
  - `theme/`: Генерация динамической палитры Material You 3 и звуки Web Audio.
  - `stores/`: Состояния Zustand (`windowStore`, `ipcStore`, `settingsStore`).
- **`packaging/`**: Скрипты сборки Debian-пакета и сессий (`lunanano-session`, `.desktop`, `greetd`).

---

## 📋 Процесс разработки

### 1. Требования
- Linux с поддержкой Wayland
- Rust 1.75+
- Node.js 18+ и `npm`

### 2. Подготовка окружения
```bash
# Клонирование репозитория
git clone https://github.com/superluna/lunaNano.git
cd lunaNano

# Установка зависимостей интерфейса
npm install

# Проверка типов TypeScript
npx tsc --noEmit

# Проверка компиляции Rust-композитора
cargo check -p lunanano-compositor
```

### 3. Правила написания кода
- **Дизайн**: Придерживайтесь стандарта Material You 3 с официальными элементами `@material/web` и алгоритмами `@material/material-color-utilities`.
- **Без браузерных зависимостей**: Все функции должны работать автономно внутри нативной Wayland-поверхности.
- **Строгая типизация**: Полностью типизируйте компоненты React и протоколы IPC. Избегайте использования типа `any`.
- **Проверка перед отправкой**: Убедитесь, что `cargo check` и `npx tsc --noEmit` проходят без ошибок.

### 4. Создание Pull Request
1. Создайте ветку под вашу функциональность:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Делайте коммиты по стандарту Conventional Commits (`feat:`, `fix:`, `docs:`, `perf:`):
   ```bash
   git commit -m "feat(dock): add custom capsule animation"
   ```
3. Отправьте ветку в GitHub и откройте Pull Request в ветку `main`.
4. Дождитесь успешного прохождения автоматической сборки в GitHub Actions.

---

## 📜 Лицензия на вклад

Отправляя код в LunaNano, вы соглашаетесь с тем, что ваш вклад будет лицензирован на условиях **GNU General Public License v3.0** (GPLv3).
