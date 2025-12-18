🚀 更新主要改动细节解析（性能与稳定性优化）

本次更新重点围绕 内存占用控制、带宽吞吐能力、Worker 运行时规范 以及 前端测速稳定性 进行了系统性优化，以下为核心改动说明。

🧠 Buffer 外部化（CHUNK_BUFFER）

📌 关键改动点

将 Buffer 的创建 移出 fetch() 函数，改为全局常量：

👉 所有请求 共享同一块内存

避免了每个请求都新建 Buffer 所带来的 内存线性增长问题

📏 参数设置

CHUNK_SIZE = 1MB

🎯 优化效果

1MB 对 ReadableStream pull() 来说 吞吐足够大

又不会像 8MB / 16MB 那样占用过多内存

在 性能与内存占用之间取得最佳平衡

🌊 无限流下载接口（/api/down）

📌 实现方式

使用 ReadableStream 的 pull(controller) 方法

采用 被动拉取（Pull-based）模型

⚙️ 机制优势

只有在 客户端准备好接收数据 时，Worker 才会 enqueue

天然支持 背压（Backpressure）

避免：

数据推送过快

内存堆积

Worker 被动 OOM 或限流

💡 前端并发策略调整

并发连接数调整为：4 个线程

每个连接通过 reader.read() 持续读取数据

🎯 实际收益

消除频繁 TCP 握手开销

单连接长时间复用

在 CDN / Worker 环境下可稳定跑满 1000Mbps+ 吞吐

🧯 防止 CDN 压缩（Content-Encoding: identity）

📌 问题背景

CDN 默认可能会启用 gzip / br 压缩

这会导致测速结果混入 CPU 解压性能

🛠 解决方案

强制返回：

Content-Encoding: identity


🎯 最终效果

禁用压缩

测试结果只反映：

👉 纯粹的网络传输带宽

而不是浏览器或节点的解压能力。

⬆️ 上传接口优化（request.body.cancel()）

📌 原问题

使用 while (reader.read()) 手动丢弃数据

不够优雅，且不完全符合 Worker Stream 规范

🛠 改进方案

直接调用：

request.body.cancel()


🎯 优势

使用标准 Stream API

立即释放资源

更符合 Cloudflare / ESA Worker 的运行时模型

减少不必要的 CPU 消耗

🎨 前端 UI 与测速逻辑微调
🕒 Ping 测试优化

Ping 次数由 3 次 → 5 次

取平均值，结果更稳定

有效减少偶发网络抖动影响

🖥 UI 刷新频率调整

📌 调整内容

UI 更新频率：

100ms → 200ms


🎯 优化效果

降低 JS 主线程渲染压力

避免 UI 频繁重绘影响网络 IO

提升测速过程中的整体稳定性




# speedtest-esa

本项目是一个基于网络的测速应用程序，旨在测量网络性能：延迟（ping）、下载速度和上传速度。它针对阿里云函数计算（ESA）和 Cloudflare Workers 等无服务器平台进行了优化部署。

## 主要功能

✅ **延迟测试：** 测量到服务器的往返时间（ping）。  
✅ **下载测试：** 通过从服务器流式传输数据来执行下载速度测试。  
✅ **上传测试：** 通过向服务器发送虚拟数据块来执行上传速度测试。  
✅ **交互式 Web 界面：** 提供一个简洁且响应迅速的用户界面，用于启动和停止测试，并显示实时和最终结果。  
✅ **支持 CORS：** 包含通用的 CORS（跨域资源共享）标头，以实现广泛的兼容性。  
✅ **部署灵活性：** 针对无服务器边缘计算平台进行优化部署。  

## 使用技术

### 服务器端（JavaScript/Worker 环境）

*   **JavaScript (ES Modules)：** 核心逻辑采用现代 JavaScript 编写。
*   **`fetch` API：** 用于处理传入的 HTTP 请求和构建响应。
*   **`ReadableStream`：** 在下载测试期间用于高效的数据流传输。
*   **`AbortController`：** 管理正在进行的测试操作的取消。

### 客户端（HTML、CSS、JavaScript）

*   **HTML5：** 提供 Web 界面的结构。
*   **CSS：** 样式化应用程序，包括深色主题、使用媒体查询的响应式设计以及测试状态的视觉效果。
*   **Font Awesome：** 集成了 UI 中使用的各种图标。
*   **原生 JavaScript：** 处理客户端测试逻辑、UI 更新以及与后端 API 的交互。
*   **`XMLHttpRequest` (XHR)：** 用于上传测试，以更有效地跟踪进度。
*   **`performance.now()`：** 用于高分辨率时间测量，以确保准确的速度计算。
