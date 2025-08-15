#!/bin/bash

# This script automates git commits and pull request creation after each task
# Usage: ./commit-and-pr.sh "commit message" "PR title" "PR description"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if parameters are provided
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Commit message is required${NC}"
    echo "Usage: ./commit-and-pr.sh \"commit message\" [\"PR title\"] [\"PR description\"]"
    exit 1
fi

COMMIT_MSG="$1"
PR_TITLE="${2:-$COMMIT_MSG}"
PR_BODY="${3:-$COMMIT_MSG}"

# Add Claude signature to commit message
FULL_COMMIT_MSG="$COMMIT_MSG

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}No changes to commit${NC}"
    exit 0
fi

echo -e "${GREEN}Adding changes to git...${NC}"
git add -A

echo -e "${GREEN}Creating commit...${NC}"
git commit -m "$FULL_COMMIT_MSG"

# Check if we have a remote repository
if ! git remote | grep -q origin; then
    echo -e "${YELLOW}No remote repository found. Skipping pull request creation.${NC}"
    echo -e "${YELLOW}To add a remote repository, run:${NC}"
    echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    exit 0
fi

# Get current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Push to remote
echo -e "${GREEN}Pushing to remote...${NC}"
git push origin "$BRANCH" 2>/dev/null || git push --set-upstream origin "$BRANCH"

# Check if gh is authenticated
if ! gh auth status &>/dev/null; then
    echo -e "${YELLOW}GitHub CLI is not authenticated. Skipping pull request creation.${NC}"
    echo -e "${YELLOW}To authenticate, run:${NC}"
    echo "gh auth login"
    exit 0
fi

# Check if PR already exists for this branch
if gh pr view "$BRANCH" &>/dev/null; then
    echo -e "${YELLOW}Pull request already exists for branch '$BRANCH'${NC}"
    echo -e "${GREEN}Updating existing pull request...${NC}"
else
    # Create pull request
    echo -e "${GREEN}Creating pull request...${NC}"
    PR_BODY_FULL="$PR_BODY

🤖 Generated with [Claude Code](https://claude.ai/code)"
    
    gh pr create --title "$PR_TITLE" --body "$PR_BODY_FULL" --base main 2>/dev/null || \
    gh pr create --title "$PR_TITLE" --body "$PR_BODY_FULL" --base master
fi

echo -e "${GREEN}✅ Task completed successfully!${NC}"