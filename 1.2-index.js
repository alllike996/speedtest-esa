/**
 * 部署：阿里云 ESA / Cloudflare Workers
 * 功能：SpeedTest 测速 + 内置 Base64 PNG 图标
 */

// 1. 定义下载测速用的数据块 (1MB)
const CHUNK_SIZE = 1 * 1024 * 1024;
const CHUNK_BUFFER = new Uint8Array(CHUNK_SIZE); 
// 填充随机数据，防止被网络设备压缩导致测速不准
for (let i = 0; i < CHUNK_SIZE; i++) {
    CHUNK_BUFFER[i] = i % 256;
}

// 2. 你的图标数据 (PNG 格式)
// 这就是你的图片文件，现在它是一段存在内存里的文本
const ICON_DATA = "图片base64位编码放这里";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 通用 CORS 头 (允许跨域)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Pragma, Cache-Control",
    };

    // 处理预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ==========================================
    // 路由 1: 网站图标 /favicon.ico
    // 浏览器访问这个地址时，代码会将上面的文本解码成图片文件返回
    // ==========================================
    if (url.pathname === "/favicon.ico") {
      // 将 Base64 文本还原为二进制数据
      const binaryString = atob(ICON_DATA);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Response(bytes, {
        headers: {
          "Content-Type": "image/png", // 告诉浏览器这是PNG图片
          "Cache-Control": "public, max-age=86400", // 让浏览器缓存一天，减少请求
        },
      });
    }

    // ==========================================
    // 路由 2: 下载接口 (无限流)
    // ==========================================
    if (url.pathname === "/api/down") {
      const stream = new ReadableStream({
        start(controller) {
          // 初始不做操作
        },
        pull(controller) {
          // 只要客户端要数据，就一直推入内存块
          controller.enqueue(CHUNK_BUFFER);
        },
        cancel() {
          // 连接断开
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
          "Content-Encoding": "identity", // 禁止压缩，保证测速准确
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      });
    }

    // ==========================================
    // 路由 3: 上传接口 (快速丢弃)
    // ==========================================
    if (url.pathname === "/api/up") {
      try {
        if (request.body) {
          // 快速读取并丢弃数据流，计算上传速度由客户端统计发送量，
          // 服务端只需尽快接收。cancel() 是最快的方式。
          await request.body.cancel(); 
        }
      } catch (e) {}
      
      return new Response("ok", { headers: corsHeaders });
    }

    // ==========================================
    // 路由 4: 延迟探测 (Ping)
    // ==========================================
    if (url.pathname === "/api/ping") {
        return new Response("pong", { 
            headers: { 
                ...corsHeaders,
                "Cache-Control": "no-store, no-cache",
                "Content-Type": "text/plain"
            } 
        });
    }

    // ==========================================
    // 路由 5: 默认返回 HTML 界面
    // ==========================================
    return new Response(HTML_CONTENT, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
      },
    });
  },
};

// HTML 页面内容
// 我们也在 HTML 头部直接嵌入了图标数据，确保万无一失
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PRO SPEEDTEST</title>
    <!-- 核心：直接嵌入 Base64 图标 -->
    <link rel="icon" type="image/png" href="data:image/png;base64,${ICON_DATA}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg-color: #0b0c15;
            --card-bg: rgba(21, 25, 43, 0.6);
            --primary: #00f2ff;
            --secondary: #bd00ff;
            --accent: #f39c12;
            --text-color: #ffffff;
            --text-muted: #8b9bb4;
            --danger: #ff0055;
        }

        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: radial-gradient(circle at center, #1b2038 0%, var(--bg-color) 100%);
            color: var(--text-color);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }

        .container {
            background: rgba(15, 19, 30, 0.85);
            padding: 2rem;
            border-radius: 20px;
            box-shadow: 0 0 60px rgba(0, 0, 0, 0.5);
            text-align: center;
            width: 95%;
            max-width: 800px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            position: relative;
        }

        h1 {
            font-size: 1.8rem; margin-bottom: 2rem; letter-spacing: 3px;
            text-transform: uppercase; font-weight: 800;
            color: #fff;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--card-bg);
            border-radius: 15px;
            padding: 1.5rem 1rem;
            border: 1px solid rgba(255,255,255,0.05);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .stat-label {
            font-size: 0.9rem; color: var(--text-muted); 
            text-transform: uppercase; letter-spacing: 1px;
            margin-bottom: 0.5rem; display: block;
        }

        .stat-value {
            font-size: 2.2rem; font-weight: 700; color: #fff;
            display: block; line-height: 1.2;
        }

        .stat-unit {
            font-size: 0.9rem; color: var(--text-muted); font-weight: normal;
        }

        .stat-card { opacity: 0.5; transform: scale(0.95); }

        .stat-card.active {
            opacity: 1; transform: scale(1);
            background: rgba(255,255,255,0.05);
            border-color: rgba(255,255,255,0.2);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .stat-card.active.ping-card { border-bottom: 3px solid var(--accent); box-shadow: 0 10px 30px rgba(243, 156, 18, 0.15); }
        .stat-card.active.down-card { border-bottom: 3px solid var(--primary); box-shadow: 0 10px 30px rgba(0, 242, 255, 0.15); }
        .stat-card.active.up-card   { border-bottom: 3px solid var(--secondary); box-shadow: 0 10px 30px rgba(189, 0, 255, 0.15); }
        
        .ping-card .stat-value { color: var(--accent); }
        .down-card .stat-value { color: var(--primary); }
        .up-card .stat-value   { color: var(--secondary); }
        
        .stat-card.finished { opacity: 1; transform: scale(1); }

        .controls-area {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255,255,255,0.05);
        }

        .progress-track {
            height: 4px; background: #2a3b55; width: 100%;
            margin-bottom: 1.5rem; overflow: hidden; position: relative;
            border-radius: 2px;
        }
        .progress-bar {
            height: 100%; width: 0%;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            box-shadow: 0 0 10px var(--primary);
            transition: width 0.1s linear;
        }

        .btn-group { display: flex; gap: 20px; justify-content: center; }
        .btn {
            border: none; padding: 0.8rem 2.5rem;
            font-size: 1rem; font-weight: bold; border-radius: 50px;
            cursor: pointer; text-transform: uppercase;
            transition: all 0.3s; color: #fff;
        }
        .btn-start {
            background: linear-gradient(90deg, var(--primary), #00a8ff);
            box-shadow: 0 5px 20px rgba(0, 242, 255, 0.2);
        }
        .btn-start:hover { box-shadow: 0 8px 25px rgba(0, 242, 255, 0.4); transform: translateY(-2px); }
        .btn-start:disabled { background: #2a3b55; color: #666; cursor: not-allowed; box-shadow: none; transform: none; }
        
        .btn-stop {
            background: transparent; border: 1px solid var(--danger); color: var(--danger);
        }
        .btn-stop:hover { background: var(--danger); color: #fff; box-shadow: 0 0 15px var(--danger); }
        .btn-stop:disabled { border-color: #444; color: #444; cursor: not-allowed; box-shadow: none; }

        .footer {
            margin-top: 2rem; font-size: 0.8rem; color: var(--text-muted);
            display: flex; justify-content: center; gap: 15px;
        }
        .footer a { color: inherit; text-decoration: none; transition: 0.3s; }
        .footer a:hover { color: #fff; }

        @media (max-width: 600px) {
            .stats-grid { grid-template-columns: 1fr; gap: 1rem; }
            .container { padding: 1.5rem; }
            .stat-card { display: flex; align-items: center; justify-content: space-between; padding: 1rem; }
            .stat-label { margin-bottom: 0; }
            .stat-value { font-size: 1.5rem; text-align: right; }
        }
    </style>
</head>
<body>

<div class="container">
    <h1><i class="fas fa-bolt"></i> SpeedTest</h1>

    <div class="stats-grid">
        <div id="card-ping" class="stat-card ping-card active">
            <span class="stat-label"><i class="fas fa-exchange-alt"></i> 延迟</span>
            <div class="stat-main">
                <span id="val-ping" class="stat-value">--</span>
                <span class="stat-unit">ms</span>
            </div>
        </div>

        <div id="card-down" class="stat-card down-card">
            <span class="stat-label"><i class="fas fa-download"></i> 下载</span>
            <div class="stat-main">
                <span id="val-down" class="stat-value">--</span>
                <span class="stat-unit">Mbps</span>
            </div>
        </div>

        <div id="card-up" class="stat-card up-card">
            <span class="stat-label"><i class="fas fa-upload"></i> 上载</span>
            <div class="stat-main">
                <span id="val-up" class="stat-value">--</span>
                <span class="stat-unit">Mbps</span>
            </div>
        </div>
    </div>

    <div class="controls-area">
        <div class="progress-track">
            <div id="progressBar" class="progress-bar"></div>
        </div>

        <div class="btn-group">
            <button id="startBtn" class="btn btn-start" onclick="startFullTest()">开始测速</button>
            <button id="stopBtn" class="btn btn-stop" onclick="stopTest()" disabled>停止</button>
        </div>
    </div>

    <div class="footer">
        <span>作者：饭奇骏       
        <a href="https://www.youtube.com/@frankiejun8965" target="_blank"><i class="fab fa-youtube"></i></a>
        <a href="https://github.com/frankiejun" target="_blank"><i class="fab fa-github"></i></a>
    </div>
</div>

<script>
    const API_DOWN = "/api/down";
    const API_UP = "/api/up";
    const API_PING = "/api/ping";

    // 使用 4 线程下载，浏览器负载较低且能跑满大部分家庭带宽
    const THREADS = 4; 
    const DURATION = 10000; // 测速时间 10秒

    let isRunning = false;
    let abortController = null;
    let xhrPool = [];
    
    let totalBytes = 0;
    let phaseStartTime = 0;
    let testPhase = 'IDLE'; 
    let uiTimer = null;

    async function startFullTest() {
        if (isRunning) return;
        resetUI();
        isRunning = true;
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;

        try {
            highlightCard('ping');
            await runLatencyTest();
            markCardFinished('ping');
            
            highlightCard('down');
            await runDownloadTest();
            markCardFinished('down');
            
            highlightCard('up');
            await runUploadTest();
            markCardFinished('up');
            
            finishTest(true);

        } catch (error) {
            if (error.message !== 'STOPPED') {
                console.error(error);
                alert('测试发生错误，请查看控制台');
            }
            finishTest(false);
        }
    }

    function stopTest() {
        if (!isRunning) return;
        isRunning = false;
        if (abortController) abortController.abort();
        xhrPool.forEach(xhr => xhr.abort());
        xhrPool = [];
    }

    async function runLatencyTest() {
        const pings = [];
        // 运行 5 次 Ping 采样
        for(let i=0; i<5; i++) {
            if(!isRunning) throw new Error('STOPPED');
            const start = performance.now();
            try {
                await fetch(API_PING + '?t=' + Date.now(), { cache: 'no-store' });
                const end = performance.now();
                const rtt = end - start;
                pings.push(rtt);
                document.getElementById('val-ping').innerText = rtt.toFixed(0);
            } catch (e) {
                // 忽略失败的 ping
            }
            await new Promise(r => setTimeout(r, 200));
        }
        if (pings.length === 0) throw new Error("网络连接失败");
        const avg = pings.reduce((a,b)=>a+b,0) / pings.length;
        document.getElementById('val-ping').innerText = avg.toFixed(0);
    }

    async function runDownloadTest() {
        testPhase = 'DOWNLOAD';
        totalBytes = 0;
        phaseStartTime = performance.now();
        abortController = new AbortController();

        startUILoop();

        const promises = [];
        for (let i = 0; i < THREADS; i++) {
            promises.push(downloadWorker(abortController.signal));
        }

        // 运行指定时间
        await new Promise(r => setTimeout(r, DURATION));
        
        // 时间到，停止所有任务
        abortController.abort(); 
        
        await Promise.allSettled(promises);
        stopUILoop();
        
        // 计算最终平均速度
        const finalDuration = (performance.now() - phaseStartTime) / 1000;
        const finalSpeed = (totalBytes * 8 / 1024 / 1024) / finalDuration;
        document.getElementById('val-down').innerText = finalSpeed.toFixed(2);
        document.getElementById('progressBar').style.width = '50%';
    }

    async function downloadWorker(signal) {
        try {
            // Fetch 一个无限流
            const response = await fetch(API_DOWN + '?t=' + Math.random(), { 
                signal, 
                cache: 'no-store', 
                headers: {'Pragma':'no-cache'}
            });
            
            const reader = response.body.getReader();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done || signal.aborted) break;
                totalBytes += value.length;
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.warn(e);
        }
    }

    async function runUploadTest() {
        if (!isRunning) throw new Error('STOPPED');
        testPhase = 'UPLOAD';
        totalBytes = 0;
        phaseStartTime = performance.now();
        xhrPool = [];

        // 2MB 的垃圾数据用于上传
        const chunkSize = 2 * 1024 * 1024; 
        const dummyData = new Uint8Array(chunkSize);
        for(let i=0; i<chunkSize; i+=1024) dummyData[i] = i%255;

        startUILoop();

        for (let i = 0; i < THREADS; i++) {
            uploadWorker(dummyData);
        }

        await new Promise(r => setTimeout(r, DURATION));

        xhrPool.forEach(xhr => xhr.abort());
        stopUILoop();

        const finalDuration = (performance.now() - phaseStartTime) / 1000;
        const finalSpeed = (totalBytes * 8 / 1024 / 1024) / finalDuration;
        document.getElementById('val-up').innerText = finalSpeed.toFixed(2);
        
        document.getElementById('progressBar').style.width = '100%';
    }

    function uploadWorker(data) {
        if (!isRunning) return;
        const xhr = new XMLHttpRequest();
        xhrPool.push(xhr);
        xhr.open('POST', API_UP + '?t=' + Math.random(), true);
        
        let lastLoaded = 0;
        xhr.upload.onprogress = (e) => {
            if (!isRunning) return;
            const diff = e.loaded - lastLoaded;
            if (diff > 0) { totalBytes += diff; lastLoaded = e.loaded; }
        };
        xhr.onload = () => {
            if(isRunning) {
                // 移除已完成的xhr
                const idx = xhrPool.indexOf(xhr);
                if(idx > -1) xhrPool.splice(idx, 1);
                // 立即开始下一次
                uploadWorker(data); 
            }
        };
        xhr.onerror = () => { 
            const idx = xhrPool.indexOf(xhr);
            if(idx > -1) xhrPool.splice(idx, 1);
            if(isRunning) setTimeout(() => uploadWorker(data), 100); 
        };
        
        try {
            xhr.send(data);
        } catch(e) {}
    }

    function startUILoop() {
        if (uiTimer) clearInterval(uiTimer);
        uiTimer = setInterval(() => {
            if (!isRunning) return;
            const now = performance.now();
            const duration = (now - phaseStartTime) / 1000;
            
            if (duration <= 0.1) return;

            // 实时计算 Mbps
            const speed = (totalBytes * 8) / (1024 * 1024) / duration;
            
            if (testPhase === 'DOWNLOAD') {
                document.getElementById('val-down').innerText = speed.toFixed(2);
                let p = Math.min(50, (duration / (DURATION/1000)) * 50);
                document.getElementById('progressBar').style.width = p + '%';
            } else if (testPhase === 'UPLOAD') {
                document.getElementById('val-up').innerText = speed.toFixed(2);
                let p = 50 + Math.min(50, (duration / (DURATION/1000)) * 50);
                document.getElementById('progressBar').style.width = p + '%';
            }
        }, 200); // 200ms 刷新一次 UI，避免卡顿
    }

    function stopUILoop() {
        if (uiTimer) clearInterval(uiTimer);
        uiTimer = null;
    }

    function highlightCard(type) {
        ['ping','down','up'].forEach(k => {
            document.getElementById('card-'+k).classList.remove('active');
        });
        document.getElementById('card-'+type).classList.add('active');
    }

    function markCardFinished(type) {
        document.getElementById('card-'+type).classList.add('finished');
    }

    function resetUI() {
        document.getElementById('val-ping').innerText = '--';
        document.getElementById('val-down').innerText = '--';
        document.getElementById('val-up').innerText = '--';
        document.getElementById('progressBar').style.width = '0%';
        
        ['ping','down','up'].forEach(k => {
            const cl = document.getElementById('card-'+k).classList;
            cl.remove('active', 'finished');
            if(k === 'ping') cl.add('active'); 
        });
    }

    function finishTest(success) {
        isRunning = false;
        stopUILoop();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        
        if(success) {
            ['ping','down','up'].forEach(k => {
                document.getElementById('card-'+k).classList.add('active', 'finished');
            });
        }
    }
</script>
</body>
</html>
`;
