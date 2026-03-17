"""
数据库模型
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


class PostType(enum.Enum):
    post = "post"
    repost = "repost"
    comment = "comment"


class ChangeType(enum.Enum):
    add = "add"
    remove = "remove"
    increase = "increase"
    decrease = "decrease"


class VIPUser(Base):
    """大V表"""
    __tablename__ = "vip_users"

    id = Column(Integer, primary_key=True, index=True)
    xueqiu_id = Column(String(50), unique=True, nullable=False, index=True)
    nickname = Column(String(100), nullable=False)
    avatar = Column(String(500))
    followers = Column(Integer, default=0)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class VIPPost(Base):
    """动态表"""
    __tablename__ = "vip_posts"

    id = Column(Integer, primary_key=True, index=True)
    vip_id = Column(Integer, ForeignKey("vip_users.id"), nullable=False, index=True)
    post_id = Column(String(50), unique=True, nullable=False)
    type = Column(String(20), default="post")
    content = Column(Text)
    images = Column(Text)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    created_at = Column(DateTime)
    crawled_at = Column(DateTime, server_default=func.now())


class VIPHolding(Base):
    """持仓表"""
    __tablename__ = "vip_holdings"

    id = Column(Integer, primary_key=True, index=True)
    vip_id = Column(Integer, ForeignKey("vip_users.id"), nullable=False, index=True)
    stock_code = Column(String(20), nullable=False, index=True)
    stock_name = Column(String(50), nullable=False)
    position = Column(Numeric(5, 2), default=0)
    updated_at = Column(DateTime, server_default=func.now())


class HoldingChange(Base):
    """持仓变动表"""
    __tablename__ = "holding_changes"

    id = Column(Integer, primary_key=True, index=True)
    vip_id = Column(Integer, ForeignKey("vip_users.id"), nullable=False, index=True)
    stock_code = Column(String(20), nullable=False, index=True)
    stock_name = Column(String(50))
    change_type = Column(String(20), nullable=False)
    old_position = Column(Numeric(5, 2))
    new_position = Column(Numeric(5, 2))
    change_percent = Column(Numeric(5, 2))
    detected_at = Column(DateTime, server_default=func.now())


class StatusAnalysis(Base):
    """动态分析表（脱水解读）"""
    __tablename__ = "status_analyses"

    id = Column(Integer, primary_key=True, index=True)
    status_id = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(String(50), index=True)
    core_viewpoint = Column(Text)  # 核心观点
    related_stocks = Column(Text)  # 相关股票 (JSON)
    position_signals = Column(Text)  # 持仓信号 (JSON)
    key_logic = Column(Text)  # 关键逻辑 (JSON)
    risk_warnings = Column(Text)  # 风险提示 (JSON)
    overall_attitude = Column(String(20))  # 整体态度
    summary = Column(Text)  # 脱水总结
    raw_content = Column(Text)  # 原始内容
    status_created_at = Column(DateTime)  # 大V发言时间（原始时间）
    created_at = Column(DateTime, server_default=func.now())  # 记录创建时间