"""
定时任务管理 API
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

router = APIRouter()


class TaskStatus(BaseModel):
    running: bool
    last_crawl_time: Optional[str] = None
    crawl_count: int = 0
    error_count: int = 0
    interval: int = 900


class ManualCrawlResult(BaseModel):
    vip_id: int
    success: bool
    statuses_count: int = 0
    portfolios_count: int = 0
    error: Optional[str] = None


@router.get("/status", response_model=TaskStatus)
async def get_task_status():
    """获取定时任务状态"""
    from app.tasks.crawler_tasks import get_scheduler_status
    return get_scheduler_status()


@router.post("/start")
async def start_tasks():
    """启动定时任务"""
    from app.tasks.crawler_tasks import start_scheduler
    await start_scheduler()
    return {"message": "定时任务已启动"}


@router.post("/stop")
async def stop_tasks():
    """停止定时任务"""
    from app.tasks.crawler_tasks import stop_scheduler
    await stop_scheduler()
    return {"message": "定时任务已停止"}


@router.post("/crawl/{vip_id}", response_model=ManualCrawlResult)
async def manual_crawl(vip_id: int):
    """手动触发爬取指定大V"""
    from app.tasks.crawler_tasks import crawl_vip_now
    
    result = await crawl_vip_now(vip_id)
    
    return ManualCrawlResult(
        vip_id=vip_id,
        success=result.get("success", False),
        statuses_count=len(result.get("statuses", [])),
        portfolios_count=len(result.get("portfolios", [])),
        error=result.get("error")
    )


@router.get("/changes/{vip_id}")
async def get_holding_changes(vip_id: int):
    """获取大V持仓变动"""
    from app.tasks.crawler_tasks import detect_holding_changes
    
    changes = await detect_holding_changes(vip_id)
    return {"vip_id": vip_id, "changes": changes}