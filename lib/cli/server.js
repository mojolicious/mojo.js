import nopt from 'nopt';
import Server from '../server.js';

export default function serverCommand (app, args) {
  const parsed = nopt({
    cluster: Boolean,
    listen: [String, Array],
    proxy: Boolean,
    workers: Number
  }, {c: '--cluster', l: '--listen', p: '--proxy', w: '--workers'}, args, 1);

  const server = new Server(app, {
    cluster: parsed.cluster,
    listen: parsed.listen,
    reverseProxy: parsed.proxy,
    workers: parsed.workers
  });
  server.start();
}

serverCommand.description = 'Start application with HTTP server';
serverCommand.usage = `Usage: APPLICATION server [OPTIONS]

  node index.js server
  node index.js server --cluster
  node index.js server -l http://*:8080
  node index.js server -l 'https://*:443?cert=./server.crt&key=./server.key'

Options:
  -c, --cluster             Run in cluster mode with multiple processes
  -h, --help                Show this summary of available options
  -l, --listen <location>   One or more locations you want to listen on,
                            defaults to "http://*:3000"
  -p, --proxy               Activate reverse proxy support
  -w, --workers <num>       Number of workers to spawn in cluster mode,
                            defaults to the number of available CPUs
`;
