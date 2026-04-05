#!/bin/bash
# systemd 服务配置脚本
# 确保 DASHSCOPE_API_KEY 环境变量在服务启动时自动注入

set -e

PROJECT_DIR="/home/admin/.openclaw/workspace/xueqiu-vip-tracker"
SERVICE_NAME="xueqiu-vip-tracker"

echo "======================================"
echo "⚙️  配置 systemd 服务"
echo "======================================"

# 检查环境变量
if [ -z "$DASHSCOPE_API_KEY" ]; then
    echo "❌ 错误: DASHSCOPE_API_KEY 未设置"
    echo ""
    echo "请先设置环境变量:"
    echo "  export DASHSCOPE_API_KEY='your-key'"
    echo ""
    echo "或添加到 ~/.bashrc:"
    echo "  echo 'export DASHSCOPE_API_KEY=\"your-key\"' >> ~/.bashrc"
    exit 1
fi

echo "✅ DASHSCOPE_API_KEY 已设置: ${DASHSCOPE_API_KEY:0:10}..."

# 创建 systemd 服务文件
echo ""
echo "📝 创建服务配置文件..."

sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << EOF
[Unit]
Description=Xueqiu VIP Tracker Backend
After=network.target

[Service]
Type=simple
User=admin
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/backend/venv/bin
Environment=DASHSCOPE_API_KEY=$DASHSCOPE_API_KEY
ExecStart=$PROJECT_DIR/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "✅ 服务文件已创建: /etc/systemd/system/$SERVICE_NAME.service"

# 重载 systemd
echo ""
echo "🔄 重载 systemd..."
sudo systemctl daemon-reload

# 启用开机自启
echo ""
echo "🔧 启用开机自启..."
sudo systemctl enable $SERVICE_NAME

# 重启服务
echo ""
echo "🚀 启动服务..."
sudo systemctl restart $SERVICE_NAME

# 检查状态
echo ""
echo "📊 检查服务状态..."
sleep 2

if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "   ✓ 服务运行正常"
    echo "   ✓ 开机自启已启用"
else
    echo "   ✗ 服务启动失败"
    sudo systemctl status $SERVICE_NAME --no-pager
    exit 1
fi

# 验证环境变量
echo ""
echo "🔍 验证环境变量..."
ENV_CHECK=$(sudo systemctl show $SERVICE_NAME --property=Environment)
if echo "$ENV_CHECK" | grep -q "DASHSCOPE_API_KEY"; then
    echo "   ✓ DASHSCOPE_API_KEY 已注入服务环境"
else
    echo "   ✗ 环境变量未正确注入"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ systemd 服务配置完成！"
echo "======================================"
echo ""
echo "服务名称: $SERVICE_NAME"
echo "管理命令:"
echo "  sudo systemctl status $SERVICE_NAME"
echo "  sudo systemctl restart $SERVICE_NAME"
echo "  sudo systemctl stop $SERVICE_NAME"
echo "  sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "下次服务器重启后，服务会自动启动并加载环境变量"
echo ""