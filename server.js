const http = require('http');
const https = require('https');
const url = require('url');

const TARGET = 'https://pucheng-backend.pages.dev';
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const targetUrl = TARGET + parsed.pathname + (parsed.search || '');

  // 收集请求体
  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    body = Buffer.concat(body);

    // 构建转发请求的 headers
    const headers = { ...req.headers };
    delete headers.host;
    headers.host = 'pucheng-backend.pages.dev';

    const options = {
      hostname: 'pucheng-backend.pages.dev',
      path: parsed.pathname + (parsed.search || ''),
      method: req.method,
      headers: headers,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      // 处理重定向
      let location = proxyRes.headers.location;
      if (location) {
        if (location.startsWith('https://pucheng-backend.pages.dev')) {
          location = location.replace('https://pucheng-backend.pages.dev', '');
        }
        proxyRes.headers.location = location;
      }

      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 502, message: '代理请求失败: ' + err.message }));
    });

    if (body.length > 0) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log('Proxy server running on port ' + PORT);
  console.log('Forwarding to ' + TARGET);
});
