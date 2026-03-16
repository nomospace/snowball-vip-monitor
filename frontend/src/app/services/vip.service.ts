import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VIPUser {
  id: number;
  xueqiu_id: string;
  nickname: string;
  avatar: string | null;
  followers: number;
  description: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class VipService {
  private apiUrl = '/api/vip';

  constructor(private http: HttpClient) {}

  /**
   * 获取大V列表
   */
  getVipList(skip: number = 0, limit: number = 20): Observable<VIPUser[]> {
    return this.http.get<VIPUser[]>(`${this.apiUrl}?skip=${skip}&limit=${limit}`);
  }

  /**
   * 添加大V
   * @param xueqiuId 雪球用户ID
   */
  addVip(xueqiuId: string): Observable<VIPUser> {
    return this.http.post<VIPUser>(this.apiUrl, { xueqiu_id: xueqiuId });
  }

  /**
   * 获取大V详情
   */
  getVipDetail(id: number): Observable<VIPUser> {
    return this.http.get<VIPUser>(`${this.apiUrl}/${id}`);
  }

  /**
   * 删除大V
   */
  deleteVip(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}