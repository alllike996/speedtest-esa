/**
 * 部署：阿里云 ESA / Cloudflare Workers
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ==========================================
    // 通用 CORS 头
    // ==========================================
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Pragma, Cache-Control",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ==========================================
    // 路由 1: 下载接口 (16MB Buffer)
    // ==========================================
    if (url.pathname === "/api/down") {
      const chunkSize = 16 * 1024 * 1024; 
      const buffer = new Uint8Array(chunkSize);
      
      const stream = new ReadableStream({
        pull(controller) {
          controller.enqueue(buffer);
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      });
    }

    // ==========================================
    // 路由 2: 上传接口 (丢弃数据)
    // ==========================================
    if (url.pathname === "/api/up") {
      if (request.body) {
          const reader = request.body.getReader();
          while (true) {
              const { done } = await reader.read();
              if (done) break;
          }
      }
      return new Response("ok", { headers: corsHeaders });
    }

    // ==========================================
    // 路由 3: 延迟探测
    // ==========================================
    if (url.pathname === "/api/ping") {
        return new Response("pong", { 
            headers: { 
                ...corsHeaders,
                "Cache-Control": "no-store, no-cache" 
            } 
        });
    }

    // ==========================================
    // 路由 4: 前端界面
    // ==========================================
    return new Response(HTML_CONTENT, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
      },
    });
  },
};

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PRO SPEEDTEST</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg-color: #0b0c15;
            --card-bg: rgba(21, 25, 43, 0.6);
            --primary: #00f2ff;   /* 下载色 */
            --secondary: #bd00ff; /* 上传色 */
            --accent: #f39c12;    /* 延迟色 */
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
            max-width: 800px; /* 加宽以容纳3个卡片 */
            border: 1px solid rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            position: relative;
        }

        h1 {
            font-size: 1.8rem; margin-bottom: 2rem; letter-spacing: 3px;
            text-transform: uppercase; font-weight: 800;
            color: #fff;
        }

        /* 三卡片布局网格 */
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

        /* 卡片标题 */
        .stat-label {
            font-size: 0.9rem; color: var(--text-muted); 
            text-transform: uppercase; letter-spacing: 1px;
            margin-bottom: 0.5rem; display: block;
        }

        /* 卡片数值 */
        .stat-value {
            font-size: 2.2rem; font-weight: 700; color: #fff;
            display: block; line-height: 1.2;
        }

        /* 卡片单位 */
        .stat-unit {
            font-size: 0.9rem; color: var(--text-muted); font-weight: normal;
        }

        /* --- 激活状态样式 --- */
        
        /* 默认未激活状态：稍微暗一点 */
        .stat-card { opacity: 0.5; transform: scale(0.95); }

        /* 激活状态：完全不透明，放大，发光 */
        .stat-card.active {
            opacity: 1; transform: scale(1);
            background: rgba(255,255,255,0.05);
            border-color: rgba(255,255,255,0.2);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        /* 特定颜色的激活光效 */
        .stat-card.active.ping-card { border-bottom: 3px solid var(--accent); box-shadow: 0 10px 30px rgba(243, 156, 18, 0.15); }
        .stat-card.active.down-card { border-bottom: 3px solid var(--primary); box-shadow: 0 10px 30px rgba(0, 242, 255, 0.15); }
        .stat-card.active.up-card   { border-bottom: 3px solid var(--secondary); box-shadow: 0 10px 30px rgba(189, 0, 255, 0.15); }
        
        /* 对应的数值颜色 */
        .ping-card .stat-value { color: var(--accent); }
        .down-card .stat-value { color: var(--primary); }
        .up-card .stat-value   { color: var(--secondary); }
        
        /* 结束后保持高亮但去掉缩放效果 */
        .stat-card.finished { opacity: 1; transform: scale(1); }


        /* 底部控制区 */
        .controls-area {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255,255,255,0.05);
        }

        /* 进度条 */
        .progress-track {
            height: 4px; background: #2a3b55; width: 100%;
            margin-bottom: 1.5rem; overflow: hidden; position: relative;
        }
        .progress-bar {
            height: 100%; width: 0%;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            box-shadow: 0 0 10px var(--primary);
            transition: width 0.1s linear;
        }

        /* 按钮组 */
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

        /* 移动端适配 */
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
        <span>作者：饭奇骏</span>
        <a href="https://www.youtube.com/@frankiejun8965" target="_blank"><i class="fab fa-youtube"></i></a>
        <a href="https://github.com/frankiejun" target="_blank"><i class="fab fa-github"></i></a>
    </div>
</div>

<script>
    // API 配置
    const API_DOWN = "/api/down";
    const API_UP = "/api/up";
    const API_PING = "/api/ping";

    // 测试参数
    const THREADS = 6;
    const DURATION = 10000; // 10秒

    // 状态
    let isRunning = false;
    let abortController = null;
    let xhrPool = [];
    
    // 统计
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
            // 1. 延迟测试
            highlightCard('ping');
            await runLatencyTest();
            markCardFinished('ping');
            
            // 2. 下载测试
            highlightCard('down');
            await runDownloadTest();
            markCardFinished('down');
            
            // 3. 上传测试
            highlightCard('up');
            await runUploadTest();
            markCardFinished('up');
            
            finishTest(true);

        } catch (error) {
            if (error.message !== 'STOPPED') {
                console.error(error);
                alert('测试中断');
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

    // ==========================================
    // 核心测试逻辑
    // ==========================================

    async function runLatencyTest() {
        const pings = [];
        for(let i=0; i<3; i++) {
            if(!isRunning) throw new Error('STOPPED');
            const start = performance.now();
            await fetch(API_PING + '?t=' + Date.now(), { cache: 'no-store' });
            const end = performance.now();
            pings.push(end - start);
            
            // 实时显示当前 Ping 值
            document.getElementById('val-ping').innerText = (end-start).toFixed(0);
            await new Promise(r => setTimeout(r, 200));
        }
        // 显示平均值
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

        await Promise.race([
            new Promise(r => setTimeout(r, DURATION)),
            Promise.all(promises)
        ]);

        abortController.abort();
        stopUILoop();
        
        // 计算最终精确平均速度
        const finalDuration = (performance.now() - phaseStartTime) / 1000;
        const finalSpeed = (totalBytes * 8 / 1024 / 1024) / finalDuration;
        document.getElementById('val-down').innerText = finalSpeed.toFixed(2);
        
        document.getElementById('progressBar').style.width = '50%';
    }

    async function downloadWorker(signal) {
        while (isRunning && !signal.aborted) {
            try {
                const response = await fetch(API_DOWN + '?t=' + Math.random(), { 
                    signal, cache: 'no-store', headers: {'Pragma':'no-cache'}
                });
                const reader = response.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    totalBytes += value.length;
                }
            } catch (e) { if(signal.aborted) return; }
        }
    }

    async function runUploadTest() {
        if (!isRunning) throw new Error('STOPPED');
        testPhase = 'UPLOAD';
        totalBytes = 0;
        phaseStartTime = performance.now();
        xhrPool = [];

        const chunkSize = 2 * 1024 * 1024; 
        const dummyData = new Uint8Array(chunkSize); 

        startUILoop();

        for (let i = 0; i < THREADS; i++) {
            uploadWorker(dummyData);
        }

        await new Promise(r => setTimeout(r, DURATION));

        xhrPool.forEach(xhr => xhr.abort());
        stopUILoop();

        // 计算最终精确平均速度
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
            const diff = e.loaded - lastLoaded;
            if (diff > 0) { totalBytes += diff; lastLoaded = e.loaded; }
        };
        xhr.onload = () => {
            if(isRunning) {
                const idx = xhrPool.indexOf(xhr);
                if(idx > -1) xhrPool.splice(idx, 1);
                uploadWorker(data); 
            }
        };
        xhr.onerror = () => { if(isRunning) setTimeout(() => uploadWorker(data), 100); };
        xhr.send(data);
    }

    // ==========================================
    // UI 控制
    // ==========================================

    function startUILoop() {
        if (uiTimer) clearInterval(uiTimer);
        uiTimer = setInterval(() => {
            if (!isRunning) return;
            const now = performance.now();
            const duration = (now - phaseStartTime) / 1000;
            
            // 实时速度显示
            let speed = 0;
            if (duration > 0) speed = (totalBytes * 8) / (1024 * 1024) / duration;
            
            if (testPhase === 'DOWNLOAD') {
                document.getElementById('val-down').innerText = speed.toFixed(2);
                let p = (duration / 10) * 50;
                if(p>50) p=50;
                document.getElementById('progressBar').style.width = p + '%';
            } else if (testPhase === 'UPLOAD') {
                document.getElementById('val-up').innerText = speed.toFixed(2);
                let p = 50 + (duration / 10) * 50;
                if(p>100) p=100;
                document.getElementById('progressBar').style.width = p + '%';
            }
        }, 100);
    }

    function stopUILoop() {
        if (uiTimer) clearInterval(uiTimer);
    }

    // 高亮当前正在测试的卡片
    function highlightCard(type) {
        // 重置所有
        ['ping','down','up'].forEach(k => {
            document.getElementById('card-'+k).classList.remove('active');
        });
        // 激活当前
        document.getElementById('card-'+type).classList.add('active');
    }

    // 标记卡片为完成状态（保持高亮，但不发光/跳动）
    function markCardFinished(type) {
        document.getElementById('card-'+type).classList.add('finished');
    }

    function resetUI() {
        document.getElementById('val-ping').innerText = '--';
        document.getElementById('val-down').innerText = '--';
        document.getElementById('val-up').innerText = '--';
        document.getElementById('progressBar').style.width = '0%';
        
        // 重置卡片状态
        ['ping','down','up'].forEach(k => {
            const cl = document.getElementById('card-'+k).classList;
            cl.remove('active', 'finished');
            // 默认让 Ping 激活一下显得准备好了
            if(k === 'ping') cl.add('active'); 
        });
    }

    function finishTest(success) {
        isRunning = false;
        stopUILoop();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        
        if(success) {
            // 全部点亮
            ['ping','down','up'].forEach(k => {
                document.getElementById('card-'+k).classList.add('active', 'finished');
            });
        }
    }
</script>
</body>
</html>
`;
