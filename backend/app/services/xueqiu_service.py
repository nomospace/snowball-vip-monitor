"""
脱水雪球 - 数据爬取服务

直接访问雪球 API（需要 Cookie）
"""

import os
import json
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field, asdict

# 雪球 API
XUEQIU_BASE = "https://xueqiu.com"

# 动态类型
STATUS_TYPES = {
    10: "全部",
    0: "原发布",
    2: "长文",
    4: "问答",
    9: "热门",
    11: "交易",
}


@dataclass
class UserInfo:
    """用户信息"""
    user_id: str
    screen_name: str = ""
    avatar: str = ""
    followers_count: int = 0
    friends_count: int = 0
    description: str = ""
    verified: bool = False
    status_count: int = 0
    crawled_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass  
class Status:
    """动态"""
    id: str
    user_id: str
    text: str = ""
    title: str = ""
    link: str = ""
    created_at: str = ""
    retweet_count: int = 0
    reply_count: int = 0
    like_count: int = 0


@dataclass
class Portfolio:
    """组合"""
    cube_id: str
    name: str = ""
    symbol: str = ""
    net_value: float = 0.0
    total_gain: float = 0.0


@dataclass
class Rebalancing:
    """调仓记录"""
    cube_id: str
    title: str = ""
    link: str = ""
    description: str = ""
    pub_date: str = ""


class XueqiuService:
    """雪球数据服务"""
    
    def __init__(self):
        self.cookie_file = os.path.expanduser("~/.xueqiu_cookie")
        self.cookie = ""
        self._load_cookie()
    
    def _load_cookie(self) -> str:
        """加载 Cookie"""
        if os.path.exists(self.cookie_file):
            try:
                with open(self.cookie_file, "r", encoding="utf-8") as f:
                    self.cookie = f.read().strip()
            except Exception as e:
                print(f"加载 Cookie 失败: {e}")
                self.cookie = ""
        return self.cookie
    
    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Origin": "https://xueqiu.com",
            "Referer": "https://xueqiu.com/",
        }
        if self.cookie:
            # 确保 Cookie 是有效的字符串
            try:
                # 尝试编码为 ASCII，如果有问题就移除特殊字符
                self.cookie.encode('ascii')
                headers["Cookie"] = self.cookie
            except UnicodeEncodeError:
                # 移除或替换非 ASCII 字符
                safe_cookie = self.cookie.encode('ascii', errors='ignore').decode('ascii')
                headers["Cookie"] = safe_cookie
        return headers
    
    def _fetch_json(self, url: str, timeout: int = 15) -> Optional[Dict]:
        """获取 JSON 数据"""
        try:
            with httpx.Client(follow_redirects=True, timeout=timeout) as client:
                resp = client.get(url, headers=self._get_headers())
                if resp.status_code == 200:
                    try:
                        return resp.json()
                    except:
                        if "aliyun_waf" in resp.text:
                            print("雪球 WAF 拦截，Cookie 可能无效")
                        return None
        except Exception as e:
            print(f"请求失败: {e}")
        return None
    
    def get_user_info(self, user_id: str) -> Optional[UserInfo]:
        """获取用户信息"""
        url = f"{XUEQIU_BASE}/v4/statuses/user_timeline.json?user_id={user_id}&count=1"
        data = self._fetch_json(url)
        
        if not data:
            return None
        
        # 从 users 字段提取
        users = data.get("users", {})
        user_data = users.get(str(user_id), {})
        
        if user_data:
            return UserInfo(
                user_id=str(user_id),
                screen_name=user_data.get("screen_name", ""),
                avatar=user_data.get("profile_image_url", ""),
                followers_count=user_data.get("followers_count", 0),
                friends_count=user_data.get("friends_count", 0),
                description=user_data.get("description", ""),
                verified=user_data.get("verified", False),
                status_count=user_data.get("status_count", 0),
            )
        
        # 从 statuses 中提取
        statuses = data.get("statuses", [])
        if statuses:
            first = statuses[0]
            user = first.get("user", {})
            return UserInfo(
                user_id=str(user_id),
                screen_name=user.get("screen_name", ""),
                avatar=user.get("profile_image_url", ""),
                followers_count=user.get("followers_count", 0),
                friends_count=user.get("friends_count", 0),
                description=user.get("description", ""),
                verified=user.get("verified", False),
                status_count=user.get("status_count", 0),
            )
        
        return None
    
    def get_user_statuses(
        self,
        user_id: str,
        status_type: int = 0,
        count: int = 20
    ) -> List[Status]:
        """获取用户动态"""
        url = f"{XUEQIU_BASE}/v4/statuses/user_timeline.json?user_id={user_id}&type={status_type}&count={count}"
        data = self._fetch_json(url)
        
        if not data or "statuses" not in data:
            return []
        
        statuses = []
        for s in data.get("statuses", [])[:count]:
            try:
                created_at = ""
                if s.get("created_at"):
                    created_at = datetime.fromtimestamp(s["created_at"] / 1000).isoformat()
                
                statuses.append(Status(
                    id=str(s.get("id", "")),
                    user_id=str(user_id),
                    text=s.get("text", "")[:500] if s.get("text") else "",  # 截断长文本
                    title=s.get("title", ""),
                    link=f"https://xueqiu.com/{s.get('user', {}).get('id', '')}/{s.get('id', '')}",
                    created_at=created_at,
                    retweet_count=s.get("retweet_count", 0),
                    reply_count=s.get("reply_count", 0),
                    like_count=s.get("like_count", 0),
                ))
            except Exception as e:
                print(f"解析动态失败: {e}")
                continue
        
        return statuses
    
    def get_user_portfolios(self, user_id: str) -> List[Portfolio]:
        """获取用户组合列表"""
        url = f"{XUEQIU_BASE}/cubes/list.json?user_id={user_id}&count=10"
        data = self._fetch_json(url)
        
        if not data or "list" not in data:
            return []
        
        portfolios = []
        for p in data.get("list", []):
            try:
                portfolios.append(Portfolio(
                    cube_id=str(p.get("cube_id", "")),
                    name=p.get("name", ""),
                    symbol=p.get("symbol", ""),
                    net_value=float(p.get("net_value", 0)),
                    total_gain=float(p.get("total_gain", 0)),
                ))
            except Exception as e:
                print(f"解析组合失败: {e}")
                continue
        
        return portfolios
    
    def get_portfolio_rebalancing(
        self,
        cube_id: str,
        count: int = 10
    ) -> List[Rebalancing]:
        """获取组合调仓历史"""
        url = f"{XUEQIU_BASE}/cubes/rebalancing/history.json?cube_id={cube_id}&count={count}"
        data = self._fetch_json(url)
        
        if not data or "list" not in data:
            return []
        
        rebalancings = []
        for r in data.get("list", []):
            try:
                rebalancings.append(Rebalancing(
                    cube_id=cube_id,
                    title=r.get("title", ""),
                    link=f"https://xueqiu.com/cubes/rebalancing/{r.get('id', '')}",
                    description=r.get("description", "")[:500] if r.get("description") else "",
                    pub_date=r.get("created_at", ""),
                ))
            except Exception as e:
                print(f"解析调仓失败: {e}")
                continue
        
        return rebalancings
    
    def crawl_vip(self, user_id: str) -> Dict[str, Any]:
        """爬取大V完整信息"""
        result = {
            "user_id": user_id,
            "success": False,
            "user_info": None,
            "statuses": [],
            "trade_statuses": [],
            "rebalancings": [],
            "error": None
        }
        
        try:
            # 获取用户信息
            user_info = self.get_user_info(user_id)
            if user_info:
                result["user_info"] = asdict(user_info)
                result["success"] = True
            
            # 获取原发布动态
            statuses = self.get_user_statuses(user_id, status_type=0, count=10)
            result["statuses"] = [asdict(s) for s in statuses]
            
            # 获取交易动态
            trade_statuses = self.get_user_statuses(user_id, status_type=11, count=10)
            result["trade_statuses"] = [asdict(s) for s in trade_statuses]
            
        except Exception as e:
            result["error"] = str(e)
        
        return result


def crawl_vip(user_id: str) -> Dict[str, Any]:
    """爬取大V信息（便捷函数）"""
    service = XueqiuService()
    return service.crawl_vip(user_id)


if __name__ == "__main__":
    import sys
    user_id = sys.argv[1] if len(sys.argv) > 1 else "1247347543"
    
    print(f"爬取用户 {user_id}...")
    result = crawl_vip(user_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))