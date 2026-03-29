# GitHub Setup Guide

## Option 1: GitHub CLI (Recommended)

```bash
# Install gh CLI if not already installed
brew install gh

# Authenticate
gh auth login

# Create public repository
gh repo create blockmaster --public --source=. --remote=origin --push

# Or with description
gh repo create blockmaster \
  --public \
  --description="Chrome extension for one-click blocking on X/Twitter" \
  --source=. \
  --remote=origin \
  --push
```

## Option 2: Manual Setup

1. Go to https://github.com/new
2. Enter repository name: `blockmaster`
3. Set visibility: **Public**
4. Click "Create repository"
5. Run the following commands locally:

```bash
# Add the remote
git remote add origin https://github.com/YOUR_USERNAME/blockmaster.git

# Rename default branch (optional, for consistency)
git branch -M main

# Push to GitHub
git push -u origin main
```

## After Pushing

The repository will be available at:
`https://github.com/YOUR_USERNAME/blockmaster`

## Optional: Add Topics

Go to the GitHub repo page → About section → click the gear icon → add topics:
- `chrome-extension`
- `twitter`
- `x-dot-com`
- `block-users`
- `browser-extension`
- `javascript`
- `manifest-v3`
