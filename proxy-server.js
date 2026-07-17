const http = require('http');
const httpProxy = require('http-proxy');

// Target Configuration
const TARGET_URL = 'https://hmis-tests.health.go.ug';
const LOCAL_PORT = 5002;
const USERNAME = 'insert_username';
const PASSWORD = 'insert_password';

// Create Auth Header
const authHeader = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

// Create Proxy Server
const proxy = httpProxy.createProxyServer({
    target: TARGET_URL,
    changeOrigin: true, // Changes the origin of the host header to the target URL
    secure: false,      // Accept self-signed certificates
    prependPath: true,  // Ensure the path from target is prepended (default is true, but being explicit)
});

// Listen for the `proxyReq` event to add headers
proxy.on('proxyReq', function (proxyReq, req, res, options) {
    proxyReq.setHeader('Authorization', authHeader);
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
    console.log(`Using credentials: ${USERNAME}:******`);
});
