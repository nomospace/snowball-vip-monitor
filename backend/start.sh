#!/bin/bash
# 脱水雪球后端启动脚本


cd /home/admin/.openclaw/workspace/snowball-vip-monitor/backend
source venv/bin/activate

# 初始化数据库表
python3 -c "
from app.core.database import init_db
import asyncio
asyncio.run(init_db())
print('✓ 数据库表已初始化')
"

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000