# This script automates git commits and pull request creation after each task
# Usage: .\commit-and-pr.ps1 "commit message" "PR title" "PR description"

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage,
    
    [Parameter(Mandatory=$false)]
    [string]$PRTitle = "",
    
    [Parameter(Mandatory=$false)]
    [string]$PRBody = ""
)

# Use commit message as PR title/body if not provided
if ([string]::IsNullOrEmpty($PRTitle)) {
    $PRTitle = $CommitMessage
}
if ([string]::IsNullOrEmpty($PRBody)) {
    $PRBody = $CommitMessage
}

# Colors for output
function Write-ColorOutput($ForegroundColor, $Message) {
    Write-Host $Message -ForegroundColor $ForegroundColor
}

# Check if there are changes to commit
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-ColorOutput Yellow "No changes to commit"
    exit 0
}

Write-ColorOutput Green "Adding changes to git..."
git add -A

Write-ColorOutput Green "Creating commit..."
$fullCommitMsg = @"
$CommitMessage

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
"@

git commit -m $fullCommitMsg

# Check if we have a remote repository
$remotes = git remote
if (-not ($remotes -contains "origin")) {
    Write-ColorOutput Yellow "No remote repository found. Skipping pull request creation."
    Write-ColorOutput Yellow "To add a remote repository, run:"
    Write-Host "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    exit 0
}

# Get current branch name
$branch = git rev-parse --abbrev-ref HEAD

Write-ColorOutput Green "Pushing to remote..."
git push origin $branch 2>$null
if ($LASTEXITCODE -ne 0) {
    git push --set-upstream origin $branch
}

# Check if gh is authenticated
$ghAuthStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Yellow "GitHub CLI is not authenticated. Skipping pull request creation."
    Write-ColorOutput Yellow "To authenticate, run:"
    Write-Host "gh auth login"
    exit 0
}

# Check if PR already exists for this branch
$prExists = gh pr view $branch 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput Yellow "Pull request already exists for branch '$branch'"
    Write-ColorOutput Green "Updating existing pull request..."
} else {
    # Create pull request
    Write-ColorOutput Green "Creating pull request..."
    $fullPRBody = @"
$PRBody

🤖 Generated with [Claude Code](https://claude.ai/code)
"@
    
    gh pr create --title $PRTitle --body $fullPRBody --base main 2>$null
    if ($LASTEXITCODE -ne 0) {
        gh pr create --title $PRTitle --body $fullPRBody --base master
    }
}

Write-ColorOutput Green "✅ Task completed successfully!"