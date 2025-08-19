@echo off
REM Скрипт для запуска Claude Code с MCP серверами
REM Использование: start-claude-with-mcp.bat

echo Запуск Claude Code с MCP серверами...
echo.

REM Проверяем наличие токена Supabase
if "%SUPABASE_ACCESS_TOKEN%"=="" (
    echo [WARNING] SUPABASE_ACCESS_TOKEN не установлен!
    echo Для использования Supabase MCP сервера, установите токен:
    echo set SUPABASE_ACCESS_TOKEN=your-token-here
    echo.
    
    set /p token="Введите ваш Supabase Access Token (или нажмите Enter для пропуска): "
    if not "!token!"=="" (
        set SUPABASE_ACCESS_TOKEN=!token!
        echo [OK] Токен установлен для текущей сессии
    )
)

REM Проверяем наличие .mcp.json
if exist ".mcp.json" (
    echo [OK] Найден файл .mcp.json с конфигурацией MCP серверов:
    echo   - Supabase ^(read-only^)
    echo   - Context7
    echo   - Playwright
    echo   - Fetch
) else (
    echo [ERROR] Файл .mcp.json не найден!
    exit /b 1
)

echo.
echo Запуск Claude Code с MCP серверами...
echo Используется конфигурация из .mcp.json

REM Запускаем через npx с указанием MCP конфига
npx @anthropic-ai/claude-code --mcp-config .mcp.json