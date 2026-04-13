import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { VipService, VIPUser, Status } from '../../services/vip.service';

interface StatusWithAnalysis extends Status {
  vip_nickname?: string;
  vip_id?: number;
  vip_avatar?: string;
  data_type?: string;
  analysis?: any;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- 顶部标题栏 -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/" class="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
              <span>←</span>
              <span>返回首页</span>
            </a>
            <span class="text-gray-300">|</span>
            <h1 class="text-2xl font-bold"> 动态时间线</h1>
          </div>
          <div class="flex items-center gap-3">
            <button 
              (click)="fetchNewData()"
              [disabled]="fetching"
              class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2">
              @if (fetching) {
                <span class="animate-spin">...</span>
                <span>拉取中...</span>
              } @else {
                <span></span>
                <span>拉取新数据</span>
              }
            </button>
            <button 
              (click)="refresh()"
              [disabled]="loading"
              class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition">
              {{ loading ? '加载中...' : '刷新' }}
            </button>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto p-4">
        <!-- 拉取状态提示 -->
        @if (fetching) {
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <div class="animate-spin text-2xl">...</div>
            <div>
              <div class="font-medium text-blue-700">正在从雪球拉取最新数据...</div>
              <div class="text-sm text-blue-500 mt-1">拉取完成后会自动进行AI分析，请稍候片刻</div>
            </div>
          </div>
        }

        <!-- Cookie 失效提示 -->
        @if (cookieError) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div class="flex items-center gap-3 mb-3">
              <span class="text-2xl">!</span>
              <div class="font-medium text-red-700">Cookie 已失效，无法获取雪球数据</div>
            </div>
            <div class="text-sm text-red-600 mb-3">
              雪球 Cookie 有效期约 30 天，需要重新获取。请按以下步骤操作：
            </div>
            <ol class="text-sm text-red-500 list-decimal list-inside space-y-1">
              <li>打开 Chrome 浏览器，访问 <a href="https://xueqiu.com" target="_blank" class="text-blue-500 underline">雪球官网</a></li>
              <li>登录你的雪球账号</li>
              <li>按 F12 打开开发者工具</li>
              <li>切换到 Network 标签，刷新页面</li>
              <li>点击任意请求，在 Headers → Request Headers 中找到 Cookie</li>
              <li>复制完整 Cookie 值，粘贴到首页输入框</li>
            </ol>
          </div>
        }

        <!-- 其他错误提示 -->
        @if (error && !cookieError) {
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <span class="text-2xl">!</span>
            <div>
              <div class="font-medium text-yellow-700">{{ error }}</div>
              <div class="text-sm text-yellow-500 mt-1">请稍后重试，或检查网络连接</div>
            </div>
          </div>
        }

        <!-- 数据统计 -->
        @if (!fetching && !loading && timeline.length > 0) {
          <div class="bg-white rounded-lg p-3 mb-4 flex items-center gap-6 text-sm text-gray-500">
            <span> 共 {{ timeline.length }} 条动态</span>
            <span> {{ vips.length }} 位大V</span>
            @if (lastFetchTime) {
              <span> 最后拉取: {{ lastFetchTime }}</span>
            }
          </div>
        }

        <!-- 加载状态 -->
        @if (loading && !fetching) {
          <div class="text-center py-12">
            <div class="animate-spin text-4xl mb-3">...</div>
            <div class="text-gray-400 text-lg">加载中...</div>
          </div>
        } @else if (timeline.length === 0 && !fetching && !loading && !error) {
          <!-- 空状态 -->
          <div class="text-center py-12 bg-white rounded-lg shadow">
            <div class="text-4xl mb-3">...</div>
            <div class="text-gray-400 text-lg">暂无动态数据</div>
            <div class="text-gray-400 text-sm mt-2 mb-4">点击「拉取新数据」按钮获取最新动态</div>
            <button 
              (click)="fetchNewData()"
              class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition">
              拉取新数据
            </button>
          </div>
        } @else if (timeline.length > 0) {
          <!-- 时间线列表 -->
          <div class="space-y-4">
            @for (item of timeline; track item.id) {
              <div class="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg overflow-hidden">
                    @if (item.vip_avatar) {
                      <img [src]="item.vip_avatar" [alt]="item.vip_nickname" class="w-full h-full object-cover">
                    } @else {
                      <span>U</span>
                    }
                  </div>
                  <div>
                    <div class="font-medium">{{ item.vip_nickname || '未知用户' }}</div>
                    <div class="text-sm text-gray-400">{{ formatTime(item.created_at) }}</div>
                  </div>
                  @if (item.data_type === 'trade') {
                    <span class="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">交易</span>
                  }
                </div>
                
                @if (item.title) {
                  <div class="font-bold text-lg mb-2">{{ item.title }}</div>
                }
                <div class="text-gray-700 whitespace-pre-wrap leading-relaxed">{{ item.text | slice:0:300 }}{{ item.text.length > 300 ? '...' : '' }}</div>
                
                <!-- AI 分析结果 -->
                @if (item.analysis && !item.analysis._error) {
                  <div class="mt-4 pt-4 border-t border-gray-100">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-sm font-medium text-gray-500">AI 分析</span>
                      @if (item.analysis._cached) {
                        <span class="text-xs text-gray-400">(缓存)</span>
                      }
                    </div>
                    
                    @if (item.analysis.overallAttitude) {
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-sm">整体态度:</span>
                        <span [class]="getAttitudeClass(item.analysis.overallAttitude)" class="px-2 py-0.5 rounded text-xs font-medium">
                          {{ item.analysis.overallAttitude }}
                        </span>
                      </div>
                    }
                    
                    @if (item.analysis.coreViewpoint) {
                      <div class="text-sm text-gray-600 mb-2">
                        <span class="font-medium">核心观点:</span> {{ item.analysis.coreViewpoint }}
                      </div>
                    }
                    
                    @if (item.analysis.relatedStocks && item.analysis.relatedStocks.length > 0) {
                      <div class="flex flex-wrap gap-2 mb-2">
                        <span class="text-sm font-medium text-gray-500">相关标的:</span>
                        @for (stock of item.analysis.relatedStocks; track stock.code) {
                          <span class="px-2 py-0.5 rounded text-xs border" 
                                [class]="getStockClass(stock.attitude)">
                            {{ stock.name }} 
                            <span class="text-gray-400">({{ stock.code }})</span>
                            @if (stock.attitude) {
                              - {{ stock.attitude }}
                            }
                          </span>
                        }
                      </div>
                    }
                    
                    @if (item.analysis.summary) {
                      <div class="text-sm text-gray-500 italic">{{ item.analysis.summary }}</div>
                    }
                  </div>
                }
                
                <div class="mt-4 flex items-center gap-6 text-sm text-gray-500">
                  @if (item.retweet_count > 0) {
                    <span> {{ item.retweet_count }}</span>
                  }
                  @if (item.reply_count > 0) {
                    <span>💬 {{ item.reply_count }}</span>
                  }
                  @if (item.like_count > 0) {
                    <span>👍 {{ item.like_count }}</span>
                  }
                  <a [href]="item.link" target="_blank" class="text-blue-500 hover:underline ml-auto">查看原文 →</a>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class TimelineComponent implements OnInit {
  vips: VIPUser[] = [];
  timeline: StatusWithAnalysis[] = [];
  loading = false;
  fetching = false;
  error = '';
  cookieError = false;
  lastFetchTime = '';
  cookie = '';

  constructor(private vipService: VipService, private http: HttpClient) {}

  ngOnInit() {
    // 从 localStorage 获取 cookie
    this.cookie = localStorage.getItem('xueqiu_cookie') || '';
    this.refresh();
  }

  /**
   * 拉取新数据（从雪球获取最新动态）
   */
  fetchNewData() {
    this.fetching = true;
    this.error = '';
    this.cookieError = false;
    
    // 调用后端的 fetch-all-timeline 接口
    this.http.post<any>('/api/vip/fetch-all-timeline', {
      cookie: this.cookie,
      count: 20,
      force_refresh: false
    }).subscribe({
      next: (result) => {
        this.fetching = false;
        
        if (result.error) {
          // 检查是否是 Cookie 相关错误
          if (result.error.includes('Cookie') || result.error.includes('401') || result.error.includes('403')) {
            this.cookieError = true;
          } else {
            this.error = result.error;
          }
          return;
        }
        
        // 更新时间线
        if (result.statuses && result.statuses.length > 0) {
          this.timeline = result.statuses;
          this.lastFetchTime = result._cache_time || new Date().toLocaleString('zh-CN');
          
          // 提取大V信息
          const vipMap = new Map<number, VIPUser>();
          for (const s of result.statuses) {
            if (s.vip_id && !vipMap.has(s.vip_id)) {
              vipMap.set(s.vip_id, {
                id: s.vip_id,
                xueqiu_id: s.user_id,
                nickname: s.vip_nickname || '未知',
                avatar: null,
                followers: 0,
                description: null
              });
            }
          }
          this.vips = Array.from(vipMap.values());
        }
      },
      error: (err) => {
        this.fetching = false;
        console.error('拉取失败', err);
        
        // 检查是否是 401/403 错误
        if (err.status === 401 || err.status === 403) {
          this.cookieError = true;
        } else {
          this.error = '拉取失败，请稍后重试';
        }
      }
    });
  }

  /**
   * 刷新页面数据（重新加载已缓存的数据）
   */
  refresh() {
    this.loading = true;
    this.timeline = [];
    this.error = '';
    this.cookieError = false;

    // 先尝试从缓存数据加载
    this.http.post<any>('/api/vip/fetch-all-timeline', {
      cookie: this.cookie,
      count: 20,
      force_refresh: false
    }).subscribe({
      next: (result) => {
        this.loading = false;
        
        if (result.error) {
          // 检查是否是 Cookie 相关错误
          if (result.error.includes('Cookie') || result.error.includes('401') || result.error.includes('403')) {
            this.cookieError = true;
          } else {
            this.error = result.error;
          }
          return;
        }
        
        if (result.statuses && result.statuses.length > 0) {
          this.timeline = result.statuses;
          this.lastFetchTime = result._cache_time || '';
          
          // 提取大V信息
          const vipMap = new Map<number, VIPUser>();
          for (const s of result.statuses) {
            if (s.vip_id && !vipMap.has(s.vip_id)) {
              vipMap.set(s.vip_id, {
                id: s.vip_id,
                xueqiu_id: s.user_id,
                nickname: s.vip_nickname || '未知',
                avatar: null,
                followers: 0,
                description: null
              });
            }
          }
          this.vips = Array.from(vipMap.values());
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('加载失败', err);
        
        if (err.status === 401 || err.status === 403) {
          this.cookieError = true;
        } else {
          this.error = '加载失败，请稍后重试';
        }
      }
    });
  }

  formatTime(timestamp: number | string): string {
    return this.vipService.formatTime(timestamp);
  }

  getAttitudeClass(attitude: string): string {
    switch (attitude) {
      case '看多':
      case '整体看多':
        return 'bg-red-100 text-red-700';
      case '看空':
      case '整体看空':
        return 'bg-green-100 text-green-700';
      case '中性':
      case '观望':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getStockClass(attitude: string): string {
    switch (attitude) {
      case '看多':
        return 'border-red-200 text-red-700';
      case '看空':
        return 'border-green-200 text-green-700';
      default:
        return 'border-gray-200 text-gray-700';
    }
  }
}