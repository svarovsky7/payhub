# PowerShell script for automatic commit and push
# Usage: .\auto-commit.ps1 -Message "change description"

param(
    [string]$Message = "",
    [switch]$Watch = $false,
    [int]$Interval = 300  # Interval in seconds for watch mode (default 5 minutes)
)

function Commit-Changes {
    param([string]$CommitMessage)
    
    Write-Host "Checking for changes..." -ForegroundColor Yellow
    
    # Check if there are changes
    $status = git status -s
    if (-not $status) {
        Write-Host "No changes to commit" -ForegroundColor Green
        return $false
    }
    
    # Show status
    Write-Host "`nFound changes:" -ForegroundColor Cyan
    git status -s
    
    # Add all changes
    Write-Host "`nAdding changes..." -ForegroundColor Yellow
    git add -A
    
    # Create commit message
    if ([string]::IsNullOrEmpty($CommitMessage)) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $CommitMessage = "chore: Auto-save changes $timestamp"
    }
    
    # Add Claude signature
    $fullMessage = @"
$CommitMessage

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
"@
    
    # Create commit
    Write-Host "`nCreating commit..." -ForegroundColor Yellow
    git commit -m $fullMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Commit created successfully" -ForegroundColor Green
        
        # Push to GitHub
        Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
        git push origin master
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Changes successfully pushed to GitHub" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Error pushing to GitHub" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "Error creating commit" -ForegroundColor Red
        return $false
    }
}

# Main logic
if ($Watch) {
    Write-Host "Watch mode activated" -ForegroundColor Magenta
    Write-Host "Checking for changes every $Interval seconds" -ForegroundColor Gray
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    
    while ($true) {
        $result = Commit-Changes -CommitMessage $Message
        if ($result) {
            Write-Host "`nNext check in $Interval seconds..." -ForegroundColor Gray
        }
        Start-Sleep -Seconds $Interval
    }
} else {
    # Single execution
    Commit-Changes -CommitMessage $Message
}