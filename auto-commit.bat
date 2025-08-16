@echo off
:: Автоматический коммит и пуш изменений для Windows
:: Использование: auto-commit.bat "описание изменений"

echo Проверка изменений...

:: Проверяем статус
git status -s > nul 2>&1
if %errorlevel% neq 0 (
    echo Ошибка: не найден git репозиторий
    exit /b 1
)

:: Проверяем, есть ли изменения
for /f %%i in ('git status -s') do set HAS_CHANGES=1
if not defined HAS_CHANGES (
    echo Нет изменений для коммита
    exit /b 0
)

:: Показываем изменения
echo.
echo Найдены изменения:
git status -s
echo.

:: Добавляем все изменения
echo Добавление изменений...
git add -A

:: Формируем сообщение коммита
if "%~1"=="" (
    set COMMIT_MSG=chore: Автоматическое сохранение изменений %date% %time%
) else (
    set COMMIT_MSG=%~1
)

:: Создаем коммит с подписью Claude
echo Создание коммита...
git commit -m "%COMMIT_MSG%

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

if %errorlevel% equ 0 (
    echo Коммит создан успешно
    echo.
    
    :: Пушим на GitHub
    echo Отправка на GitHub...
    git push origin master
    
    if %errorlevel% equ 0 (
        echo.
        echo ✓ Изменения успешно отправлены на GitHub
    ) else (
        echo.
        echo ✗ Ошибка при отправке на GitHub
        exit /b 1
    )
) else (
    echo.
    echo ✗ Ошибка при создании коммита
    exit /b 1
)