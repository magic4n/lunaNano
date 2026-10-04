# Security Policy / Политика безопасности 🛡️

[English](#english) | [Русский](#russian)

<a name="english"></a>
## English

### Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

### Reporting a Vulnerability

The LunaNano team takes system security very seriously, especially given that the desktop shell manages native Wayland display surfaces, PTY terminal sessions, and filesystem operations.

If you discover a security vulnerability in LunaNano:

1. **Do NOT open a public GitHub issue.**
2. Send an email with a detailed explanation and reproduction steps to **`security@superluna.local`** (or create a private GitHub Security Advisory).
3. Include information about:
   - Operating system and kernel version
   - Graphics driver / GPU hardware
   - Wayland compositor logs
   - Minimal reproduction proof-of-concept
4. You will receive an initial response within 48 hours. We will coordinate a security fix and release a patched version before disclosing the issue publicly.

---

<a name="russian"></a>
## Русский

### Поддерживаемые версии

| Версия  | Поддержка          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

### Сообщение об уязвимости

Команда LunaNano уделяет повышенное внимание безопасности системы, учитывая, что графическая оболочка управляет нативными поверхностями Wayland, PTY-сессиями терминала и операциями с файловой системой.

Если вы обнаружили уязвимость в безопасности LunaNano:

1. **НЕ создавайте публичный Issue на GitHub.**
2. Отправьте подробный отчёт с описанием проблемы и шагами воспроизведения на почту **`security@superluna.local`** (или создайте закрытый Security Advisory в репозитории).
3. Укажите в отчёте:
   - Дистрибутив Linux и версию ядра
   - Графический драйвер и модель видеокарты
   - Логи Wayland-композитора
   - Минимальный сценарий воспроизведения уязвимости
4. Мы предоставим ответ в течение 48 часов, подготовим исправление и выпустим патч до публичной публикации информации.
