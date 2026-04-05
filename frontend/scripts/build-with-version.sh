#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# 构建时间戳
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION=$(date +"%Y%m%d.%H%M")
DIST_DIR="dist/snowball-vip/browser"

echo "🔨 开始构建..."
echo "版本: $VERSION"
echo "时间: $BUILD_TIME"

# 执行构建
npm run build

# 确保 assets 目录存在
mkdir -p "$DIST_DIR/assets"

# 生成版本文件
cat > "$DIST_DIR/assets/version.json" << VERSION_EOF
{"version": "$VERSION", "buildTime": "$BUILD_TIME"}
VERSION_EOF

# 在 index.html 中添加构建时间 meta 标签（如果不存在）
if ! grep -q 'meta name="build-time"' "$DIST_DIR/index.html"; then
    sed -i "s|<head>|<head>\n    <meta name=\"build-time\" content=\"$BUILD_TIME\">|g" "$DIST_DIR/index.html"
fi

# 更新 index.html 的资源引用时间戳
sed -i "s/polyfills\.js/polyfills.js?v=$VERSION/g" "$DIST_DIR/index.html"
sed -i "s/main\.js/main.js?v=$VERSION/g" "$DIST_DIR/index.html"
sed -i "s/styles\.css/styles.css?v=$VERSION/g" "$DIST_DIR/index.html"

echo ""
echo "✅ 构建完成！"
echo "📦 版本号: $VERSION"
echo "🕐 构建时间: $BUILD_TIME"
