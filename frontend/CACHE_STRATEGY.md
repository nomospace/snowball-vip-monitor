# 前端缓存最佳实践

## 问题背景

前端更新后，用户浏览器可能仍加载旧版本文件，导致功能异常。

---

## 缓存策略总览

| 文件类型 | 缓存策略 | 原因 |
|---------|---------|------|
| `index.html` | **不缓存** | 入口文件，必须最新 |
| `main.js` | 1 分钟 | 入口 JS，短期缓存 |
| `chunk-xxx.js` | **1 年** | 带 hash，内容变文件名就变 |
| `styles.css` | 5 分钟 | 可接受短暂过期 |
| `version.json` | **不缓存** | 版本检测用 |
| 图片/字体 | **1 年** | 静态资源，长期缓存 |

---

## 最佳实践

### 1. 文件名 Hash（核心）

**原理**：内容变化 → Hash 变化 → 文件名变化 → 强制刷新

```
chunk-ZSKCQRVS.js  →  chunk-4CZD44PR.js
     ↑                      ↑
   旧版本                  新版本
```

Angular 默认已实现，无需额外配置。

### 2. 入口文件禁用缓存

```nginx
location = /index.html {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```

### 3. 版本检测机制

- 定期检查 `/assets/version.json`
- 发现新版本提示用户刷新
- 避免用户使用旧版本

### 4. 构建脚本

使用 `npm run build:version` 自动：
- 生成版本号
- 创建 version.json
- 更新资源引用时间戳

---

## 部署流程

### 正常更新

```bash
cd /home/admin/.openclaw/workspace/xueqiu-vip-tracker/frontend
npm run build:version
```

### 紧急修复缓存问题

如果用户反馈页面异常：

```bash
# 1. 更新版本号文件
echo "{\"version\": \"$(date +%Y%m%d.%H%M)\", \"buildTime\": \"$(date -Iseconds)\"}" \
  > dist/snowball-vip/browser/assets/version.json

# 2. 用户刷新页面即可
```

---

## 验证缓存配置

```bash
# 检查 HTML 缓存头
curl -I http://localhost:3007/ | grep -i cache

# 检查 chunk 文件缓存头（应该是 1 年）
curl -I http://localhost:3007/chunk-ZSKCQRVS.js | grep -i cache
```

---

## 常见问题

### Q: 为什么 chunk 文件缓存 1 年？

因为 chunk 文件名包含内容 hash，内容变化文件名就会变化，所以可以放心长期缓存。

### Q: 为什么还是有些用户看到旧版本？

可能原因：
1. 浏览器缓存了旧的 index.html
2. Service Worker 缓存了旧版本
3. CDN 缓存（如果用了 CDN）

解决：强制刷新 `Ctrl+Shift+R` 或清除浏览器缓存。

### Q: 如何强制所有用户更新？

1. 更新构建（生成新的 chunk hash）
2. 在应用中添加版本检测
3. 发布公告提示用户刷新

---

## 参考资料

- [Web Caching Basics](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [HTTP Caching FAQ](https://www.nginx.com/blog/nginx-caching-guide/)
- [Angular Build Configuration](https://angular.io/guide/build)