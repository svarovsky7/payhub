@echo off
setlocal EnableDelayedExpansion

REM This script automates git commits and pull request creation after each task
REM Usage: commit-and-pr.bat "commit message" "PR title" "PR description"

REM Check if parameters are provided
if "%~1"=="" (
    echo Error: Commit message is required
    echo Usage: commit-and-pr.bat "commit message" ["PR title"] ["PR description"]
    exit /b 1
)

set COMMIT_MSG=%~1
set PR_TITLE=%~2
set PR_BODY=%~3

REM Use commit message as PR title if not provided
if "%PR_TITLE%"=="" set PR_TITLE=%COMMIT_MSG%
if "%PR_BODY%"=="" set PR_BODY=%COMMIT_MSG%

REM Check if there are changes to commit
git status --porcelain > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt

if "%STATUS%"=="" (
    echo No changes to commit
    exit /b 0
)

echo Adding changes to git...
git add -A

echo Creating commit...
(
echo %COMMIT_MSG%
echo.
echo 🤖 Generated with [Claude Code](https://claude.ai/code^)
echo.
echo Co-Authored-By: Claude ^<noreply@anthropic.com^>
) > commit_msg.txt
git commit -F commit_msg.txt
del commit_msg.txt

REM Check if we have a remote repository
git remote | findstr origin >nul
if errorlevel 1 (
    echo No remote repository found. Skipping pull request creation.
    echo To add a remote repository, run:
    echo git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
    exit /b 0
)

REM Get current branch name
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%i

echo Pushing to remote...
git push origin %BRANCH% 2>nul || git push --set-upstream origin %BRANCH%

REM Check if gh is authenticated
gh auth status >nul 2>&1
if errorlevel 1 (
    echo GitHub CLI is not authenticated. Skipping pull request creation.
    echo To authenticate, run:
    echo gh auth login
    exit /b 0
)

REM Check if PR already exists for this branch
gh pr view %BRANCH% >nul 2>&1
if not errorlevel 1 (
    echo Pull request already exists for branch '%BRANCH%'
    echo Updating existing pull request...
) else (
    echo Creating pull request...
    (
    echo %PR_BODY%
    echo.
    echo 🤖 Generated with [Claude Code](https://claude.ai/code^)
    ) > pr_body.txt
    
    gh pr create --title "%PR_TITLE%" --body-file pr_body.txt --base main 2>nul
    if errorlevel 1 (
        gh pr create --title "%PR_TITLE%" --body-file pr_body.txt --base master
    )
    del pr_body.txt
)

echo ✅ Task completed successfully!
exit /b 0