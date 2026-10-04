# Changelog / История изменений 📝

All notable changes to the **LunaNano** desktop shell will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

[English](#english) | [Русский](#russian)

---

<a name="english"></a>
## [0.1.0] - 2026-10-04

### Added
- **Native Wayland Compositor**: High-performance Rust compositor built on `wlroots`/`smithay` with embedded `XWayland` support.
- **Standalone React Desktop Shell**: 100% fullscreen standalone layer surface with zero external browser dependencies.
- **Material You 3 Design**: Dynamic palette generation via `@material/material-color-utilities` from wallpapers, exported to GTK4 and Qt apps via `org.freedesktop.portal.Settings`.
- **Modular Pill Dock**: 100% rounded floating capsules, macOS-style Gaussian magnification, genie minimize animations, and auto-hide mode.
- **Quick Settings Control Center**: Interactive toggles for Wi-Fi, Bluetooth, Dark Mode, DND, Screenshot, Night Light, PipeWire volume slider, and brightness control.
- **Built-in React Applications**:
  - Multi-tab terminal with `xterm.js` and Rust `portable-pty`.
  - Calculator with standard and scientific modes, history tape, and memory registers.
  - File Explorer with real filesystem operations, storage meter, and `.zip`/`.tar.gz`/`.7z` progress dialogs.
  - Markdown Notepad with live split preview, word stats, tag taxonomy, and auto-saving to `~/.local/share/lunanano/notes/`.
  - Comprehensive Settings covering 21 categories with live profile export/import (`~/.config/lunanano/settings.json`).
  - Fullscreen Application Launcher with fuzzy search and `.desktop` categories.
- **Procedural Web Audio Synthesizer**: Subtle tactile haptic sounds for clicks, genie window minimize, snap pops, and notifications.
- **System Overlays**: Lock screen (`Super+L`) with PIN keypad, window switcher carousel (`Alt+Tab`), screenshot/recording bar, and bilingual on-screen keyboard (EN + RU).
- **Packaging & CI/CD**: Debian package generator (`build-deb.sh`), display manager integration (`greetd`, `.desktop`), and GitHub Actions release workflow.

---

<a name="russian"></a>
## [0.1.0] - 2026-10-04

### Добавлено
- **Нативный Wayland-композитор**: Высокопроизводительный композитор на Rust (`wlroots`/`smithay`) со встроенным `XWayland` для X11-приложений.
- **Автономная React-оболочка**: Полноэкранная нативная Wayland-поверхность без каких-либо зависимостей от сторонних браузеров.
- **Дизайн Material You 3**: Динамическое извлечение палитры из обоев через `@material/material-color-utilities` с трансляцией в GTK4 и Qt через `org.freedesktop.portal.Settings`.
- **Модульный док из капсул**: 100% скругленные капсулы, гауссово масштабирование (macOS-style), анимация сворачивания genie и режим автоскрытия.
- **Панель быстрых настроек**: Интерактивные переключатели Wi-Fi, Bluetooth, Dark Mode, DND, Скриншот, Night Light, слайдеры громкости PipeWire и яркости экрана.
- **Встроенные React-приложения**:
  - Многовкладочный терминал на `xterm.js` и Rust `portable-pty`.
  - Калькулятор с обычным и научным режимами, лентой истории и регистрами памяти.
  - Проводник с реальными файловыми операциями, индикатором ёмкости диска и M3 прогресс-барами для архивов `.zip`/`.tar.gz`/`.7z`.
  - Блокнот Markdown с живым сплит-превью, статистикой слов, тегами и автосохранением в `~/.local/share/lunanano/notes/`.
  - Полный раздел Настроек из 21 категории с горячей перезагрузкой (`~/.config/lunanano/settings.json`).
  - Полноэкранный лаунчер с быстрым поиском и парсингом системных `.desktop` файлов.
- **Процедурный синтезатор звуков**: Процедурные звуки Web Audio API (тактильные клики, звук сворачивания genie, щелчок snap, звук уведомлений).
- **Системные оверлеи**: Экран блокировки (`Super+L`) с цифровым PIN-падом, переключатель окон (`Alt+Tab`), панель скриншотов/записи и двуязычная экранная клавиатура (RU + EN).
- **Пакетная база и CI/CD**: Сборщик Debian-пакетов (`build-deb.sh`), интеграция с дисплейными менеджерами (`greetd`, `.desktop`) и рабочий процесс сборки в GitHub Actions.
