"""
mini脱水雪球 - 数据爬取服务

优先直接访问雪球 API，RSSHub 作为备用

雪球公开 API（需要浏览器环境或 Cookie）：
- /v4/statuses/user_timeline.json - 用户动态
- /cubes/rebalancing/history.json - 组合调仓

RSSHub 雪球路由（备用）：
- /xueqiu/user/:id/:type? - 用户动态 (type: 0=原发布, 2=长文, 11=交易)
- /xueqiu/snb/:id - 组合调仓
"""

import os
import json
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field, asdict
import xml.etree.ElementTree as ET

# 雪球 API
XUEQIU_BASE = "https://xueqiu.com"

# RSSHub 公共实例
RSSHUB_INSTANCES = [
    "https://rsshub.app",
    "https://rsshub.rssforever.com",
]

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
    
    def __init__(self, rsshub_url: str = None):
        self.rsshub_url = rsshub_url or RSSHUB_INSTANCES[0]
        self.cookie_file = os.path.expanduser("~/.xueqiu_cookie")
        self.cookie = ""
        self._load_cookie()
    
    def _load_cookie(self) -> str:
        """加载 Cookie"""
        if os.path.exists(self.cookie_file):
            with open(self.cookie_file, "r") as f:
                self.cookie = f.read().strip()
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
            headers["Cookie"] = self.cookie
        return headers
    
    def _fetch_json(self, url: str, timeout: int = 15) -> Optional[Dict]:
        """获取 JSON 数据"""
        with httpx.Client(follow_redirects=True, timeout=timeout) as client:
            try:
                resp = client.get(url, headers=self._get_headers())
                if resp.status_code == 200:
                    # 检查是否是 JSON
                    try:
                        return resp.json()
                    except:
                        # 可能被 WAF 拦截返回 HTML
                        if "aliyun_waf" in resp.text:
                            print("雪球 WAF 拦截，请配置 Cookie")
                        return None
            except Exception as e:
                print(f"请求失败: {e}")
        return None
    
    def get_user_info(self, user_id: str) -> Optional[UserInfo]:
        """获取用户信息 - 直接访问雪球 API"""
        url = f"{XUEQIU_BASE}/v4/statuses/user_timeline.json?user_id={user_id}&count=1"
        data = self._fetch_json(url)
        
        if not data:
            # 尝试备用方案：RSSHub
            return self.get_user_info_from_rss(user_id)
        
        # 解析用户信息
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
        
        # 备用：从 statuses 中提取
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
    
    def _fetch_rss(self, path: str, timeout: int = 30) -> Optional[str]:
        """获取 RSS feed（备用方案）"""
        url = f"{self.rsshub_url}{path}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/rss+xml, application/xml, text/xml",
        }
        
        if self.cookie:
            headers["X-Cookie"] = self.cookie
        
        with httpx.Client(follow_redirects=True, timeout=timeout) as client:
            try:
                resp = client.get(url, headers=headers)
                if resp.status_code == 200:
                    return resp.text
            except Exception as e:
                print(f"RSSHub 请求失败: {e}")
        
        return None
    
    def _parse_rss(self, rss_text: str) -> Dict[str, Any]:
        """解析 RSS XML"""
        result = {
            "title": "",
            "description": "",
            "items": []
        }
        
        try:
            root = ET.fromstring(rss_text)
            channel = root.find("channel")
            
            if channel is None:
                return result
            
            title_el = channel.find("title")
            if title_el is not None:
                result["title"] = title_el.text or ""
            
            desc_el = channel.find("description")
            if desc_el is not None:
                result["description"] = desc_el.text or ""
            
            for item in channel.findall("item"):
                item_data = {
                    "title": "",
                    "link": "",
                    "description": "",
                    "pubDate": "",
                    "author": "",
                }
                
                for child in item:
                    tag = child.tag
                    if tag in item_data:
                        item_data[tag] = child.text or ""
                    elif tag == "{http://purl.org/dc/elements/1.1/}creator":
                        item_data["author"] = child.text or ""
                
                result["items"].append(item_data)
            
        except Exception as e:
            print(f"RSS 解析失败: {e}")
        
        return result
    
    def get_user_info_from_rss(self, user_id: str) -> Optional[UserInfo]:
        """从 RSS 中提取用户信息（备用方案）"""
        path = f"/xueqiu/user/{user_id}/0"
        rss_text = self._fetch_rss(path)
        
        if not rss_text:
            return None
        
        data = self._parse_rss(rss_text)
        title = data.get("title", "")
        
        screen_name = ""
        if " 的雪球" in title:
            screen_name = title.split(" 的雪球")[0]
        
        return UserInfo(
            user_id=user_id,
            screen_name=screen_name,
            crawled_at=datetime.now().isoformat(),
        )
    
    def get_user_statuses(
        self,
        user_id: str,
        status_type: int = 0,
        count: int = 20
    ) -> List[Status]:
        """获取用户动态
        
        Args:
            user_id: 用户ID
            status_type: 动态类型 (0=原发布, 2=长文, 11=交易)
            count: 数量
        """
        # 尝试直接访问雪球 API
        url = f"{XUEQIU_BASE}/v4/statuses/user_timeline.json?user_id={user_id}&type={status_type}&count={count}"
        data = self._fetch_json(url)
        
        if data and "statuses" in data:
            statuses = []
            for s in data.get("statuses", [])[:count]:
                statuses.append(Status(
                    id=str(s.get("id", "")),
                    user_id=str(user_id),
                    text=s.get("text", ""),
                    title=s.get("title", ""),
                    link=f"https://xueqiu.com/{s.get('user', {}).get('id', '')}/{s.get('id', '')}",
                    created_at=datetime.fromtimestamp(s.get("created_at", 0) / 1000).isoformat() if s.get("created_at") else "",
                    retweet_count=s.get("retweet_count", 0),
                    reply_count=s.get("reply_count", 0),
                    like_count=s.get("like_count", 0),
                ))
            return statuses
        
        # 备用：RSSHub
        path = f"/xueqiu/user/{user_id}/{status_type}"
        rss_text = self._fetch_rss(path)
        
        if not rss_text:
            return []
        
        rss_data = self._parse_rss(rss_text)
        statuses = []
        
        for item in rss_data.get("items", [])[:count]:
            statuses.append(Status(
                id="",
                user_id=user_id,
                text=item.get("description", ""),
                title=item.get("title", ""),
                link=item.get("link", ""),
                created_at=item.get("pubDate", ""),
            ))
        
        return statuses
    
    def get_portfolio_rebalancing(
        self,
        cube_symbol: str,
        count: int = 10
    ) -> List[Rebalancing]:
        """获取组合调仓历史"""
        path = f"/xueqiu/snb/{cube_symbol}"
        rss_text = self._fetch_rss(path)
        
        if not rss_text:
            return []
        
        data = self._parse_rss(rss_text)
        rebalancings = []
        
        for item in data.get("items", [])[:count]:
            rebalancings.append(Rebalancing(
                cube_id=cube_symbol,
                title=item.get("title", ""),
                link=item.get("link", ""),
                description=item.get("description", ""),
                pub_date=item.get("pubDate", ""),
            ))
        
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
    user_id = sys.argv[1] if len(sys.argv) > 1 else "2292705444"
    
    print(f"爬取用户 {user_id}...")
    result = crawl_vip(user_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))