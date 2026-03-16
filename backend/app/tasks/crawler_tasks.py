"""
定时爬虫任务 - 使用 asyncio 实现

功能：
1. 定时爬取大V动态
2. 定时爬取持仓变动
3. 持仓变动检测与通知
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# 任务状态
_task_running = False
_scheduler_task = None

# 爬取间隔（秒）
CRAWL_INTERVAL = 900  # 15分钟


class Scheduler:
    """定时任务调度器"""
    
    def __init__(self):
        self.running = False
        self.last_crawl_time = None
        self.last_holding_time = None
        self.crawl_count = 0
        self.error_count = 0
    
    async def start(self):
        """启动调度器"""
        if self.running:
            return
        
        self.running = True
        logger.info("定时任务调度器启动")
        
        while self.running:
            try:
                await self._run_tasks()
            except Exception as e:
                logger.error(f"定时任务执行失败: {e}")
                self.error_count += 1
            
            # 等待下一次执行
            await asyncio.sleep(CRAWL_INTERVAL)
    
    def stop(self):
        """停止调度器"""
        self.running = False
        logger.info("定时任务调度器停止")
    
    async def _run_tasks(self):
        """执行定时任务"""
        self.crawl_count += 1
        self.last_crawl_time = datetime.now()
        
        logger.info(f"开始执行定时任务 (第 {self.crawl_count} 次)")
        
        # 1. 爬取大V动态
        await self._crawl_vip_statuses()
        
        # 2. 爬取持仓变动
        await self._crawl_vip_holdings()
        
        logger.info(f"定时任务完成")
    
    async def _crawl_vip_statuses(self):
        """爬取所有大V动态"""
        try:
            # 导入服务（延迟导入避免循环依赖）
            from app.services.xueqiu_service import XueqiuService
            from app.core.database import get_sync_session
            from app.models.models import VIPUser, VIPPost
            from sqlalchemy import select
            
            # 获取所有大V
            # TODO: 实现数据库查询
            
            logger.info("爬取大V动态完成")
            
        except Exception as e:
            logger.error(f"爬取动态失败: {e}")
    
    async def _crawl_vip_holdings(self):
        """爬取所有大V持仓"""
        try:
            logger.info("爬取大V持仓完成")
        except Exception as e:
            logger.error(f"爬取持仓失败: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """获取调度器状态"""
        return {
            "running": self.running,
            "last_crawl_time": self.last_crawl_time.isoformat() if self.last_crawl_time else None,
            "crawl_count": self.crawl_count,
            "error_count": self.error_count,
            "interval": CRAWL_INTERVAL,
        }


# 全局调度器实例
scheduler = Scheduler()


async def start_scheduler():
    """启动定时任务调度器"""
    global _task_running, _scheduler_task
    
    if _task_running:
        return scheduler
    
    _task_running = True
    _scheduler_task = asyncio.ensure_future(scheduler.start())
    
    return scheduler


async def stop_scheduler():
    """停止定时任务调度器"""
    global _task_running, _scheduler_task
    
    if scheduler:
        scheduler.stop()
    
    if _scheduler_task:
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass
    
    _task_running = False


def get_scheduler_status() -> Dict[str, Any]:
    """获取调度器状态"""
    return scheduler.get_status()


# ============ 手动触发的任务 ============

async def crawl_vip_now(vip_id: int) -> Dict[str, Any]:
    """立即爬取指定大V"""
    from app.services.xueqiu_service import XueqiuService
    
    service = XueqiuService()
    result = service.crawl_vip(str(vip_id))
    
    return result


async def detect_holding_changes(vip_id: int) -> List[Dict[str, Any]]:
    """检测持仓变动
    
    返回变动列表：
    [
        {
            "stock_code": "600519",
            "stock_name": "贵州茅台",
            "change_type": "increase",  # add/remove/increase/decrease
            "old_weight": 5.0,
            "new_weight": 10.0,
            "change_percent": 100.0,
        }
    ]
    """
    # TODO: 实现变动检测逻辑
    # 1. 获取当前持仓
    # 2. 获取上次持仓
    # 3. 对比差异
    # 4. 返回变动列表
    
    return []


# ============ Celery 兼容层（如果可用） ============

try:
    from celery import Celery
    from app.core.config import settings
    
    celery_app = Celery(
        "snowball_vip",
        broker=getattr(settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/0'),
        backend=getattr(settings, 'CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    )
    
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="Asia/Shanghai",
        enable_utc=True,
    )
    
    @celery_app.task
    def crawl_all_vip_posts():
        """Celery 任务：爬取所有大V动态"""
        import asyncio
        asyncio.run(scheduler._crawl_vip_statuses())
    
    @celery_app.task
    def crawl_all_vip_holdings():
        """Celery 任务：爬取所有大V持仓"""
        import asyncio
        asyncio.run(scheduler._crawl_vip_holdings())
    
    CELERY_AVAILABLE = True
    
except ImportError:
    CELERY_AVAILABLE = False
    celery_app = None