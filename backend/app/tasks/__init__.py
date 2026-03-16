"""
定时任务模块
"""
from app.tasks.crawler_tasks import start_scheduler

__all__ = ["start_scheduler"]