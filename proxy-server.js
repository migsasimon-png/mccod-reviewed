const http = require('http');
const httpProxy = require('http-proxy');
require('dotenv').config({ path: '.env.development.local' });
require('dotenv').config({ path: '.env.development' });

// Target Configuration
const TARGET_URL = process.env.DHIS2_PROXY_TARGET || 'https://hmis.health.go.ug';
const LOCAL_PORT = 5002;
const authHeader = process.env.DHIS2_PROXY_AUTHORIZATION;

// Create Proxy Server
const proxy = httpProxy.createProxyServer({
    target: TARGET_URL,
    changeOrigin: true, // Changes the origin of the host header to the target URL
    secure: true,
    prependPath: true,  // Ensure the path from target is prepended (default is true, but being explicit)
});

// Listen for the `proxyReq` event to add headers
proxy.on('proxyReq', function (proxyReq, req, res, options) {
    if (authHeader) proxyReq.setHeader('Authorization', authHeader);
});

// Error handling
proxy.on('error', function (err, req, res) {
    console.error('Proxy Error:', err);
    if (res.writeHead) {
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
    }
    res.end('Proxy Error: ' + err.message);
});

// Create HTTP Server
const server = http.createServer(function (req, res) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} -> ${TARGET_URL}`);

    // Forward to proxy
    proxy.web(req, res);
});

// Start listening
server.listen(LOCAL_PORT, () => {
    console.log(`Proxy server listening on http://localhost:${LOCAL_PORT}`);
    console.log(`Proxing requests to: ${TARGET_URL}`);
});
