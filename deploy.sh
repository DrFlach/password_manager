#!/bin/bash


echo "🚀 Deploying to Render.com..."

if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository. Initialize with 'git init' first."
    exit 1
fi

echo "📦 Adding changes..."
git add .

echo "💬 Enter commit message (or press Enter for default):"
read commit_message

if [ -z "$commit_message" ]; then
    commit_message="Update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo "💾 Committing changes..."
git commit -m "$commit_message"

echo "⚬️  Pushing to GitHub..."
git push origin main

echo "✅ Done! Render.com will automatically deploy the changes."
echo "📊 Check deployment status at: https://dashboard.render.com"
