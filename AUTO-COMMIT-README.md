# Автоматические коммиты в GitHub

## Быстрый старт

### Windows (PowerShell) - Рекомендуется
```powershell
# Однократный коммит с описанием
.\auto-commit.ps1 -Message "feat: добавлена новая функция"

# Автоматический коммит каждые 5 минут
.\auto-commit.ps1 -Watch

# Автоматический коммит каждые 10 минут с описанием
.\auto-commit.ps1 -Watch -Interval 600 -Message "auto: сохранение изменений"
```

### Windows (Batch)
```cmd
# Коммит с описанием
auto-commit.bat "feat: добавлена новая функция"

# Коммит без описания (автоматическое сообщение)
auto-commit.bat
```

### Linux/Mac (Bash)
```bash
# Сделать скрипт исполняемым (один раз)
chmod +x auto-commit.sh

# Коммит с описанием
./auto-commit.sh "feat: добавлена новая функция"

# Коммит без описания
./auto-commit.sh
```

## Возможности

### PowerShell скрипт (auto-commit.ps1)
- **Режим наблюдения** - автоматически коммитит изменения через заданный интервал
- **Цветной вывод** - удобное отображение статуса
- **Настраиваемый интервал** - от 1 секунды до бесконечности
- **Умное определение изменений** - не создает пустых коммитов

### Batch скрипт (auto-commit.bat)
- Простой и быстрый
- Работает на любой Windows системе
- Не требует дополнительных разрешений

### Bash скрипт (auto-commit.sh)
- Для Linux/Mac систем
- Цветной вывод в терминале
- Совместим с Git Bash на Windows

## Автоматизация

### Запуск при старте системы (Windows)

1. **Через планировщик задач:**
   - Откройте Планировщик задач
   - Создайте задачу с триггером "При входе в систему"
   - Укажите действие: `powershell.exe -File "C:\путь\к\проекту\auto-commit.ps1" -Watch`

2. **Через автозагрузку:**
   - Создайте ярлык для `auto-commit.bat`
   - Поместите в папку автозагрузки: `Win+R` → `shell:startup`

### Интеграция с IDE

**WebStorm/IntelliJ IDEA:**
1. Settings → Tools → File Watchers
2. Добавьте новый watcher
3. Program: `powershell.exe`
4. Arguments: `-File $ProjectFileDir$\auto-commit.ps1 -Message "auto: изменения в $FileName$"`

**VS Code:**
1. Установите расширение "Run on Save"
2. В settings.json добавьте:
```json
"runOnSave.commands": [
    {
        "match": ".*",
        "command": "powershell.exe -File ${workspaceFolder}\\auto-commit.ps1",
        "runIn": "terminal"
    }
]
```

## Настройка Git

### Исключение файлов из автокоммита
Добавьте в `.gitignore`:
```
# Временные файлы
*.tmp
*.log
.env.local

# Файлы автокоммита (опционально)
auto-commit.*
AUTO-COMMIT-README.md
```

### Настройка автора коммитов
```bash
git config user.name "Ваше имя"
git config user.email "ваш@email.com"
```

## Примеры сообщений коммитов

Скрипты автоматически добавляют подпись Claude к каждому коммиту:

```
feat: добавлена страница бюджетирования

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Рекомендации

1. **Используйте осмысленные сообщения** - указывайте, что именно изменилось
2. **Коммитьте часто** - маленькие коммиты легче откатить
3. **Проверяйте перед пушем** - скрипт автоматически пушит на GitHub
4. **Настройте .gitignore** - исключите ненужные файлы

## Устранение проблем

### "git не является внутренней командой"
- Установите Git: https://git-scm.com/download/win
- Добавьте Git в PATH

### "Отказано в доступе" (PowerShell)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Permission denied" (Linux/Mac)
```bash
chmod +x auto-commit.sh
```

### Ошибка аутентификации GitHub
1. Настройте SSH ключи или
2. Используйте Personal Access Token:
```bash
git remote set-url origin https://TOKEN@github.com/username/repo.git
```