const http = require('http');
const { exec } = require('child_process');

const PORT = 9000;
const SECRET = 'kimbor_auto_deploy_secret_2026';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook/deploy') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      console.log('🚀 GitHub Push notification received! Deploying to Hostinger VPS...');
      exec('cd /root/kimbor && git pull origin main && docker compose -f docker-compose.prod.yml up -d --build', (err, stdout, stderr) => {
        if (err) {
          console.error('❌ Deploy failed:', err);
          res.writeHead(500);
          return res.end('Deploy Error');
        }
        console.log('✅ Deploy successful:\n', stdout);
        res.writeHead(200);
        res.end('Deploy Success');
      });
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`⚡ Auto-deploy webhook listener running on port ${PORT}`);
});
