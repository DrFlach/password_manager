#!/bin/bash

# Скрипт для быстрого деплоя обновлений на Render.com

echo "🚀 Deploying to Render.com..."

# Проверка, что мы в git репозитории
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository. Initialize with 'git init' first."
    exit 1
fi

# Добавляем все изменения
echo "📦 Adding changes..."
git add .

# Запрашиваем commit message
echo "💬 Enter commit message (or press Enter for default):"
read commit_message

if [ -z "$commit_message" ]; then
    commit_message="Update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Делаем commit
echo "💾 Committing changes..."
git commit -m "$commit_message"

# Push в main
echo "⬆️  Pushing to GitHub..."
git push origin main

echo "✅ Done! Render.com will automatically deploy the changes."
echo "📊 Check deployment status at: https://dashboard.render.com"
