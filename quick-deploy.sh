#!/bin/bash

echo "🚀 Deploying fix for share links 404 error..."

git add backend/main.go frontend/app.js
git commit -m "Fix: Handle /share/* routing correctly (fix 404)"
git push origin main

echo "✅ Pushed! Render will auto-deploy in ~3-5 minutes"
echo "🔗 Check: https://dashboard.render.com"
