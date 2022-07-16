import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': 12});
  res.end('Hello World!');
});
server.listen(3000);
