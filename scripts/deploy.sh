#!/bin/bash

# 雪球大V动态监听系统 - 一键部署脚本
# 使用方法: ./scripts/deploy.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DIST_DIR="$FRONTEND_DIR/dist/snowball-vip/browser"
DEPLOY_DIR="/var/www/snowball-vip"

echo "🚀 开始部署雪球大V监听系统..."

# 1. 构建前端
echo "📦 构建 Angular 前端..."
cd "$FRONTEND_DIR"
npm run build

# 2. 添加时间戳（防止缓存）
echo "⏰ 添加静态资源时间戳..."
TIMESTAMP=$(date +%s%3N)
INDEX_FILE="$DIST_DIR/index.html"

if [ -f "$INDEX_FILE" ]; then
    # 给 JS 文件添加时间戳
    sed -i "s/\(\.js\)/\1?v=$TIMESTAMP/g" "$INDEX_FILE"
    # 给 CSS 文件添加时间戳
    sed -i "s/\(\.css\)/\1?v=$TIMESTAMP/g" "$INDEX_FILE"
    echo "   时间戳: ?v=$TIMESTAMP"
else
    echo "❌ 找不到 index.html: $INDEX_FILE"
    exit 1
fi

# 3. 部署到 Nginx 目录
echo "📁 复制文件到部署目录..."
sudo mkdir -p "$DEPLOY_DIR"
sudo cp -r "$DIST_DIR"/* "$DEPLOY_DIR/"

# 4. 重载 Nginx
echo "🔄 重载 Nginx..."
sudo nginx -t && sudo nginx -s reload

# 5. 验证部署
echo "✅ 验证部署..."
sleep 1
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3008/)

if [ "$HTTP_CODE" = "200" ]; then
    echo "🎉 部署成功！"
    echo "📍 访问地址: http://47.102.199.24:3008/"
else
    echo "⚠️ 部署可能有问题，HTTP 状态码: $HTTP_CODE"
fi

echo ""
echo "📋 后端服务："
echo "   启动后端: cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo "   或使用 Docker: docker-compose up -d"