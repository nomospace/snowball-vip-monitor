import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VersionService {
  private currentVersion = '';
  private versionUrl = '/assets/version.json';
  
  constructor(private http: HttpClient) {
    this.init();
  }
  
  private init() {
    // 获取当前版本
    this.http.get<any>(this.versionUrl).subscribe({
      next: (data) => {
        this.currentVersion = data.version;
        console.log('当前版本:', this.currentVersion);
      },
      error: () => {
        // 首次加载可能没有版本文件
        this.currentVersion = this.getBuildTime();
      }
    });
    
    // 每 5 分钟检查一次版本
    interval(5 * 60 * 1000).pipe(
      switchMap(() => this.http.get<any>(this.versionUrl))
    ).subscribe({
      next: (data) => {
        if (data.version && data.version !== this.currentVersion) {
          this.promptUpdate();
        }
      },
      error: () => {}
    });
  }
  
  private getBuildTime(): string {
    // 从 meta 标签获取构建时间
    const meta = document.querySelector('meta[name="build-time"]');
    return meta?.getAttribute('content') || new Date().toISOString();
  }
  
  private promptUpdate() {
    if (confirm('检测到新版本，是否立即刷新？')) {
      window.location.reload();
    }
  }
}
