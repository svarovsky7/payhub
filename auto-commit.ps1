# PowerShell скрипт для автоматического коммита и пуша
# Использование: .\auto-commit.ps1 -Message "описание изменений"

param(
    [string]$Message = "",
    [switch]$Watch = $false,
    [int]$Interval = 300  # Интервал в секундах для режима наблюдения (по умолчанию 5 минут)
)

# Цвета для вывода
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Commit-Changes {
    param([string]$CommitMessage)
    
    Write-Host "🔍 Проверка изменений..." -ForegroundColor Yellow
    
    # Проверяем, есть ли изменения
    $status = git status -s
    if (-not $status) {
        Write-Host "✓ Нет изменений для коммита" -ForegroundColor Green
        return $false
    }
    
    # Показываем статус
    Write-Host "`nНайдены изменения:" -ForegroundColor Cyan
    git status -s
    
    # Добавляем все изменения
    Write-Host "`n📦 Добавление изменений..." -ForegroundColor Yellow
    git add -A
    
    # Формируем сообщение коммита
    if ([string]::IsNullOrEmpty($CommitMessage)) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $CommitMessage = "chore: Автоматическое сохранение изменений $timestamp"
    }
    
    # Добавляем подпись Claude
    $fullMessage = @"
$CommitMessage

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
"@
    
    # Создаем коммит
    Write-Host "`n💾 Создание коммита..." -ForegroundColor Yellow
    git commit -m $fullMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Коммит создан успешно" -ForegroundColor Green
        
        # Пушим на GitHub
        Write-Host "`n🚀 Отправка на GitHub..." -ForegroundColor Yellow
        git push origin master
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Изменения успешно отправлены на GitHub" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ Ошибка при отправке на GitHub" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "✗ Ошибка при создании коммита" -ForegroundColor Red
        return $false
    }
}

# Основная логика
if ($Watch) {
    Write-Host "👁️ Режим наблюдения активирован" -ForegroundColor Magenta
    Write-Host "Проверка изменений каждые $Interval секунд" -ForegroundColor Gray
    Write-Host "Нажмите Ctrl+C для остановки" -ForegroundColor Gray
    Write-Host ""
    
    while ($true) {
        $result = Commit-Changes -CommitMessage $Message
        if ($result) {
            Write-Host "`n⏰ Следующая проверка через $Interval секунд..." -ForegroundColor Gray
        }
        Start-Sleep -Seconds $Interval
    }
} else {
    # Однократное выполнение
    Commit-Changes -CommitMessage $Message
}