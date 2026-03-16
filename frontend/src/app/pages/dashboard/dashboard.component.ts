import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VipService, VIPUser, Status } from '../../services/vip.service';
import { HttpClient } from '@angular/common/http';

interface TaskStatus {
  running: boolean;
  last_crawl_time: string | null;
  crawl_count: number;
  error_count: number;
  interval: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-800">📊 雪球大V追踪器</h1>
        <div class="flex items-center gap-4">
          <div class="text-sm text-gray-500">
            任务状态: 
            <span [class]="taskStatus?.running ? 'text-green-600 font-medium' : 'text-gray-400'">
              {{ taskStatus?.running ? '运行中' : '已停止' }}
            </span>
          </div>
          <button 
            (click)="refresh()"
            class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm">
            🔄 刷新
          </button>
        </div>
      </div>
      
      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">监听大V</div>
          <div class="text-3xl font-bold text-blue-600">{{ vips.length }}</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">爬取次数</div>
          <div class="text-3xl font-bold text-green-600">{{ taskStatus?.crawl_count || 0 }}</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">错误次数</div>
          <div class="text-3xl font-bold" [class]="(taskStatus?.error_count || 0) > 0 ? 'text-red-600' : 'text-gray-400'">
            {{ taskStatus?.error_count || 0 }}
          </div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">最后更新</div>
          <div class="text-lg font-bold text-gray-600">
            {{ taskStatus?.last_crawl_time ? (taskStatus!.last_crawl_time | date:'HH:mm:ss') : '从未' }}
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-bold mb-4">⚡ 快速操作</h2>
        <div class="flex flex-wrap gap-3">
          <a routerLink="/vip" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            + 添加大V
          </a>
          <button 
            (click)="toggleTask()"
            [class]="taskStatus?.running ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'"
            class="px-4 py-2 rounded-lg transition">
            {{ taskStatus?.running ? '⏹️ 停止任务' : '▶️ 启动任务' }}
          </button>
          <button 
            (click)="manualCrawl()"
            [disabled]="crawling"
            class="bg-purple-100 text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-200 transition disabled:opacity-50">
            {{ crawling ? '🔄 爬取中...' : '🔄 立即爬取' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 大V列表 -->
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">👤 监听的大V</h2>
            <a routerLink="/vip" class="text-blue-500 text-sm hover:underline">查看全部 →</a>
          </div>
          
          @if (loading) {
            <div class="text-center py-8 text-gray-400">加载中...</div>
          } @else if (vips.length === 0) {
            <div class="text-center py-8 text-gray-400">
              <p>暂无大V</p>
              <a routerLink="/vip" class="text-blue-500 hover:underline mt-2 inline-block">添加大V →</a>
            </div>
          } @else {
            <div class="space-y-3">
              @for (vip of vips.slice(0, 5); track vip.id) {
                <a [routerLink]="['/vip', vip.id]" class="flex items-center gap-3 p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg overflow-hidden">
                    @if (vip.avatar) {
                      <img [src]="vip.avatar" [alt]="vip.nickname" class="w-full h-full object-cover">
                    } @else {
                      👤
                    }
                  </div>
                  <div class="flex-1">
                    <div class="font-medium">{{ vip.nickname }}</div>
                    <div class="text-sm text-gray-500">{{ vip.followers | number }} 粉丝</div>
                  </div>
                </a>
              }
            </div>
          }
        </div>

        <!-- 系统状态 -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-bold mb-4">📈 系统状态</h2>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">爬取间隔</span>
              <span class="font-medium">{{ (taskStatus?.interval || 900) / 60 }} 分钟</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">数据库</span>
              <span class="text-green-600 font-medium">✓ 正常</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">RSSHub API</span>
              <span [class]="rsshubStatus ? 'text-green-600' : 'text-red-600'" class="font-medium">
                {{ rsshubStatus ? '✓ 可用' : '✗ 不可用' }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Cookie 状态</span>
              <span [class]="cookieStatus ? 'text-green-600' : 'text-yellow-600'" class="font-medium">
                {{ cookieStatus ? '✓ 已配置' : '⚠️ 未配置' }}
              </span>
            </div>
          </div>
          
          <div class="mt-6 p-4 bg-gray-50 rounded text-sm text-gray-600">
            <p class="font-medium mb-2">💡 使用说明</p>
            <ol class="list-decimal list-inside space-y-1">
              <li>添加大V后系统会自动爬取信息</li>
              <li>定时任务每15分钟自动更新</li>
              <li>点击大V查看详情和调仓记录</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  vips: VIPUser[] = [];
  taskStatus: TaskStatus | null = null;
  loading = true;
  crawling = false;
  rsshubStatus = false;
  cookieStatus = false;

  constructor(
    private vipService: VipService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadData();
    this.checkServices();
  }

  loadData() {
    this.loading = true;
    
    // 加载大V列表
    this.vipService.getVipList().subscribe({
      next: (vips) => {
        this.vips = vips;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    // 加载任务状态
    this.http.get<TaskStatus>('/api/tasks/status').subscribe({
      next: (status) => {
        this.taskStatus = status;
      }
    });
  }

  checkServices() {
    // 检查 RSSHub
    this.http.get('https://rsshub.app', { responseType: 'text' }).subscribe({
      next: () => this.rsshubStatus = true,
      error: () => this.rsshubStatus = false
    });

    // 检查 Cookie
    this.http.get<{ has_cookie: boolean }>('/api/vip/check-cookie').subscribe({
      next: (res) => this.cookieStatus = res.has_cookie,
      error: () => this.cookieStatus = false
    });
  }

  refresh() {
    this.loadData();
    this.checkServices();
  }

  toggleTask() {
    if (this.taskStatus?.running) {
      this.http.post('/api/tasks/stop', {}).subscribe({
        next: () => this.loadData()
      });
    } else {
      this.http.post('/api/tasks/start', {}).subscribe({
        next: () => this.loadData()
      });
    }
  }

  manualCrawl() {
    this.crawling = true;
    
    // 爬取所有大V
    Promise.all(this.vips.map(vip => 
      this.http.post(`/api/tasks/crawl/${vip.id}`, {}).toPromise()
    )).then(() => {
      this.crawling = false;
      this.loadData();
    }).catch(() => {
      this.crawling = false;
    });
  }
}