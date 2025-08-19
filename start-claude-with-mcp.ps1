# Скрипт для запуска Claude Code с MCP серверами
# Использование: .\start-claude-with-mcp.ps1

Write-Host "Запуск Claude Code с MCP серверами..." -ForegroundColor Green

# Проверяем наличие токена Supabase
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "⚠️  SUPABASE_ACCESS_TOKEN не установлен!" -ForegroundColor Yellow
    Write-Host "Для использования Supabase MCP сервера, установите токен:" -ForegroundColor Yellow
    Write-Host '$env:SUPABASE_ACCESS_TOKEN = "your-token-here"' -ForegroundColor Cyan
    Write-Host ""
    
    $token = Read-Host "Введите ваш Supabase Access Token (или нажмите Enter для пропуска)"
    if ($token) {
        $env:SUPABASE_ACCESS_TOKEN = $token
        Write-Host "✓ Токен установлен для текущей сессии" -ForegroundColor Green
    }
}

# Проверяем наличие .mcp.json
if (Test-Path ".\.mcp.json") {
    Write-Host "✓ Найден файл .mcp.json с конфигурацией MCP серверов:" -ForegroundColor Green
    Write-Host "  - Supabase (read-only)" -ForegroundColor Gray
    Write-Host "  - Context7" -ForegroundColor Gray
    Write-Host "  - Playwright" -ForegroundColor Gray
    Write-Host "  - Fetch" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Файл .mcp.json не найден!" -ForegroundColor Red
    exit 1
}

# Запускаем Claude Code с MCP конфигурацией
Write-Host "`nЗапуск Claude Code с MCP серверами..." -ForegroundColor Cyan
Write-Host "Используется конфигурация из .mcp.json" -ForegroundColor Gray

# Запускаем через npx с указанием MCP конфига
npx @anthropic-ai/claude-code --mcp-config .mcp.json