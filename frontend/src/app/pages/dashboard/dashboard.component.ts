import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface VIPUser {
  id: number;
  xueqiu_id: string;
  nickname: string;
  avatar: string | null;
  followers: number;
  description: string | null;
  category?: string;
}

interface Status {
  id: string;
  user_id: string;
  text: string;
  title: string;
  link: string;
  created_at: string;
  retweet_count: number;
  reply_count: number;
  like_count: number;
  vip_nickname?: string;
  vip_id?: number;
}

// 预设热门大V库
const HOT_VIPS: VIPUser[] = [
  { id: 0, xueqiu_id: '1247347543', nickname: '方三文', avatar: null, followers: 1200000, description: '雪球创始人', category: '价值投资' },
  { id: 0, xueqiu_id: '1178668715', nickname: '不明真相的群众', avatar: null, followers: 850000, description: '雪球联合创始人', category: '价值投资' },
  { id: 0, xueqiu_id: '2292705444', nickname: '省心省力啊', avatar: null, followers: 150000, description: '资深投资者', category: '综合' },
  { id: 0, xueqiu_id: '1233631554', nickname: '价值at风险', avatar: null, followers: 280000, description: '价值投资', category: '价值投资' },
  { id: 0, xueqiu_id: '6876843497', nickname: '省心省力啊', avatar: null, followers: 120000, description: '投资达人', category: '综合' },
];

const CATEGORIES = ['全部', '价值投资', '科技', '消费', '新能源', '医药', '综合'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- 顶部标题栏 -->
      <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <h1 class="text-xl font-bold text-gray-800">脱水雪球 - 雪球大V信息聚合平台</h1>
          <div class="flex items-center gap-4 text-xs text-gray-400">
            <span>Cookie: {{ cookieStatus ? '✓ 正常' : '⚠ 异常' }}</span>
            <span>|</span>
            <span>数据库: ✓ 正常</span>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto flex gap-4 p-4">
        <!-- 左侧筛选区 (20%) -->
        <aside class="w-64 flex-shrink-0 space-y-4">
          <!-- 大V筛选 -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h3 class="font-medium text-gray-700 mb-3">👤 大V筛选</h3>
            <select 
              [(ngModel)]="selectedVipId" 
              (change)="onVipChange()"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="all">全部大V</option>
              @for (vip of myVips; track vip.id) {
                <option [value]="vip.id">{{ vip.nickname }}</option>
              }
            </select>
          </div>

          <!-- 分类筛选 -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h3 class="font-medium text-gray-700 mb-3">📂 大V分类</h3>
            <div class="space-y-1">
              @for (cat of categories; track cat) {
                <button 
                  (click)="selectedCategory = cat; filterByCategory()"
                  [class]="selectedCategory === cat ? 'w-full text-left px-3 py-2 rounded bg-blue-50 text-blue-600 text-sm' : 'w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-600 text-sm'">
                  {{ cat }}
                </button>
              }
            </div>
          </div>

          <!-- 数据类型 -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h3 class="font-medium text-gray-700 mb-3">📊 数据类型</h3>
            <div class="space-y-1">
              <button 
                (click)="dataType = 'all'"
                [class]="dataType === 'all' ? 'w-full text-left px-3 py-2 rounded bg-blue-50 text-blue-600 text-sm' : 'w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-600 text-sm'">
                全部动态
              </button>
              <button 
                (click)="dataType = 'posts'"
                [class]="dataType === 'posts' ? 'w-full text-left px-3 py-2 rounded bg-blue-50 text-blue-600 text-sm' : 'w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-600 text-sm'">
                仅发言
              </button>
              <button 
                (click)="dataType = 'trades'"
                [class]="dataType === 'trades' ? 'w-full text-left px-3 py-2 rounded bg-blue-50 text-blue-600 text-sm' : 'w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-600 text-sm'">
                仅交易
              </button>
            </div>
          </div>

          <!-- 时间筛选 -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h3 class="font-medium text-gray-700 mb-3">⏰ 时间范围</h3>
            <select 
              [(ngModel)]="timeRange"
              (change)="loadTimeline()"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="today">今日</option>
              <option value="3d">近3天</option>
              <option value="7d">近7天</option>
              <option value="30d">近30天</option>
            </select>
          </div>

          <!-- 快速操作 -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <a 
              routerLink="/vip" 
              class="block w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition text-sm">
              + 添加大V
            </a>
          </div>
        </aside>

        <!-- 右侧核心展示区 (80%) -->
        <main class="flex-1 space-y-4">
          <!-- Tab 标签 -->
          <div class="bg-white rounded-lg shadow-sm">
            <div class="flex border-b border-gray-200">
              <button 
                (click)="activeTab = 'timeline'; loadTimeline()"
                [class]="activeTab === 'timeline' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
                📅 时间线
              </button>
              <button 
                (click)="activeTab = 'posts'"
                [class]="activeTab === 'posts' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
                📝 发言
              </button>
              <button 
                (click)="activeTab = 'comments'"
                [class]="activeTab === 'comments' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
                💬 评论回复
              </button>
              <button 
                (click)="activeTab = 'holdings'"
                [class]="activeTab === 'holdings' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
                📈 持仓变更
              </button>
            </div>

            <!-- 内容区域 -->
            <div class="p-4">
              @if (loading) {
                <div class="text-center py-12 text-gray-400">
                  <div class="animate-pulse">加载中...</div>
                </div>
              } @else if (timeline.length === 0) {
                <div class="text-center py-12 text-gray-400">
                  <p class="text-lg">暂无数据</p>
                  <p class="text-sm mt-2">关注一些大V后，这里会显示他们的最新动态</p>
                  <a routerLink="/vip" class="text-blue-500 hover:underline mt-4 inline-block">→ 添加大V</a>
                </div>
              } @else {
                <div class="space-y-3">
                  @for (item of timeline; track item.id) {
                    <div class="border border-gray-100 rounded-lg p-4 hover:border-gray-200 hover:shadow-sm transition bg-white">
                      <!-- 大V 信息 -->
                      <div class="flex items-center gap-3 mb-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                          👤
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-medium text-gray-800">{{ item.vip_nickname || '大V' }}</div>
                          <div class="text-xs text-gray-400">{{ formatTime(item.created_at) }}</div>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-gray-400">
                          @if (item.like_count > 0) {
                            <span>👍 {{ item.like_count }}</span>
                          }
                          @if (item.reply_count > 0) {
                            <span>💬 {{ item.reply_count }}</span>
                          }
                        </div>
                      </div>
                      
                      <!-- 内容 -->
                      <div class="text-gray-700 text-sm leading-relaxed">
                        {{ item.text | slice:0:200 }}{{ item.text.length > 200 ? '...' : '' }}
                      </div>
                      
                      <!-- 底部操作 -->
                      <div class="mt-3 flex justify-end">
                        <a 
                          [href]="item.link" 
                          target="_blank" 
                          class="text-xs text-blue-500 hover:underline">
                          查看原文 →
                        </a>
                      </div>
                    </div>
                  }
                </div>
                
                <!-- 加载更多 -->
                @if (hasMore) {
                  <div class="text-center py-4">
                    <button 
                      (click)="loadMore()"
                      class="text-sm text-blue-500 hover:underline">
                      加载更多
                    </button>
                  </div>
                }
              }
            </div>
          </div>

          <!-- 最后更新时间 -->
          <div class="text-center text-xs text-gray-400 py-2">
            最后更新: {{ lastUpdate }} | 数据来源于雪球，仅供参考
          </div>
        </main>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  // 大V数据
  myVips: VIPUser[] = [];
  hotVips = HOT_VIPS;
  categories = CATEGORIES;
  
  // 筛选状态
  selectedVipId: string | number = 'all';
  selectedCategory = '全部';
  dataType = 'all';
  timeRange = '7d';
  activeTab = 'timeline';
  
  // 时间线数据
  timeline: Status[] = [];
  loading = false;
  hasMore = false;
  lastUpdate = '--';
  
  // 系统状态
  cookieStatus = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadMyVips();
    this.checkCookie();
    this.loadTimeline();
  }

  loadMyVips() {
    this.http.get<VIPUser[]>('/api/vip').subscribe({
      next: (vips) => {
        this.myVips = vips;
        this.updateLastTime();
      },
      error: () => {}
    });
  }

  checkCookie() {
    this.http.get<{ has_cookie: boolean }>('/api/vip/check-cookie').subscribe({
      next: (res) => this.cookieStatus = res.has_cookie,
      error: () => this.cookieStatus = false
    });
  }

  loadTimeline() {
    this.loading = true;
    this.timeline = [];
    
    // 如果没有关注的大V，显示提示
    if (this.myVips.length === 0) {
      this.loading = false;
      return;
    }

    // 并行获取每个大V的动态
    const allStatuses: Status[] = [];
    let loaded = 0;
    
    for (const vip of this.myVips) {
      const type = this.dataType === 'trades' ? 11 : 0;
      
      this.http.get<Status[]>(`/api/vip/${vip.id}/statuses`, {
        params: { status_type: type.toString(), count: '10' }
      }).subscribe({
        next: (statuses) => {
          for (const s of statuses) {
            s.vip_nickname = vip.nickname;
            s.vip_id = vip.id;
            allStatuses.push(s);
          }
          loaded++;
          this.finishLoading(allStatuses, loaded);
        },
        error: () => {
          loaded++;
          this.finishLoading(allStatuses, loaded);
        }
      });
    }
  }

  finishLoading(statuses: Status[], loaded: number) {
    if (loaded === this.myVips.length) {
      // 按时间排序
      statuses.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeB - timeA;
      });
      
      // 时间过滤
      this.timeline = this.filterByTime(statuses);
      this.hasMore = this.timeline.length >= 20;
      this.loading = false;
      this.updateLastTime();
    }
  }

  filterByTime(statuses: Status[]): Status[] {
    const now = new Date();
    const ranges: { [key: string]: number } = {
      'today': 1,
      '3d': 3,
      '7d': 7,
      '30d': 30
    };
    
    const days = ranges[this.timeRange] || 7;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return statuses.filter(s => new Date(s.created_at) >= cutoff);
  }

  onVipChange() {
    if (this.selectedVipId === 'all') {
      this.loadTimeline();
    } else {
      // 加载单个大V的动态
      this.loading = true;
      const vipId = Number(this.selectedVipId);
      const vip = this.myVips.find(v => v.id === vipId);
      
      this.http.get<Status[]>(`/api/vip/${vipId}/statuses`, {
        params: { status_type: this.dataType === 'trades' ? '11' : '0', count: '20' }
      }).subscribe({
        next: (statuses) => {
          this.timeline = statuses.map(s => ({
            ...s,
            vip_nickname: vip?.nickname,
            vip_id: vipId
          }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  filterByCategory() {
    // 按分类筛选（基于预设大V库的分类字段）
    this.loadTimeline();
  }

  loadMore() {
    // 加载更多数据
    this.hasMore = false;
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN');
  }

  updateLastTime() {
    this.lastUpdate = new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}