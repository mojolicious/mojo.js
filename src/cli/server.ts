import type {MojoApp} from '../types.ts';
import {parseArgs} from 'node:util';
import {Server} from '../server.ts';

const EVENTS = ['SIGINT', 'SIGTERM', 'SIGUSR2'];

/**
 * Server command.
 */
export default async function serverCommand(app: MojoApp, args: string[]): Promise<void> {
  const {values} = parseArgs({
    args: args.slice(1),
    options: {
      cluster: {type: 'boolean', short: 'c'},
      'headers-timeout': {type: 'string'},
      'keep-alive-timeout': {type: 'string'},
      level: {type: 'string', short: 'L'},
      listen: {type: 'string', short: 'l', multiple: true},
      proxy: {type: 'boolean', short: 'p'},
      requests: {type: 'string', short: 'r'},
      'request-timeout': {type: 'string'},
      workers: {type: 'string', short: 'w'}
    },
    allowPositionals: true,
    allowNegative: true
  });

  if (values.level !== undefined) app.log.level = values.level;

  const server = new Server(app, {
    cluster: values.cluster,
    headersTimeout: toNumber(values['headers-timeout']),
    keepAliveTimeout: toNumber(values['keep-alive-timeout']),
    listen: values.listen,
    maxRequestsPerSocket: toNumber(values.requests),
    requestTimeout: toNumber(values['request-timeout']),
    reverseProxy: values.proxy,
    workers: toNumber(values.workers)
  });

  const listener = (): void => {
    EVENTS.forEach(signal => process.removeListener(signal, listener));
    server.stop().catch(error => app.log.error(error));
  };
  EVENTS.forEach(signal => process.on(signal, listener));

  await server.start();
}

serverCommand.description = 'Start application with HTTP and WebSocket server';
serverCommand.usage = `Usage: APPLICATION server [OPTIONS]

  node index.js server
  node index.js server --level trace
  node index.js server --cluster
  node index.js server --requests 10 --keep-alive-timeout 30000
  node index.js server -l http://*:4000

  # Run server in production mode
  NODE_ENV=production node index.js server

  # Listen on all interfaces
  node index.js server -l http://*:3000

  # Listen only on IPv6 interfaces
  node index.js server -l http://[::1]:3000

  # Listen on two ports
  node index.js server -l http://127.0.0.1:3000 -l http://*:4000

  # Listen on UNIX domain socket
  node index.js server -l http+unix:///var/run/myapp.sock

  # File descriptor, as used by systemd
  node index.js server -l http://127.0.0.1?fd=3

  # Listen on two ports with HTTP and HTTPS at the same time
  node index.js server -l http://*:3000 -l https://*:4000

  # Use a custom certificate and key
  node index.js server -l 'https://*:443?cert=./server.crt&key=./server.key'

Options:
  -c, --cluster                   Run in cluster mode with multiple processes
      --headers-timeout <ms>      Limit the amount of time the parser will
                                  wait to receive the complete HTTP headers,
                                  defaults to 60000
  -h, --help                      Show this summary of available options
      --keep-alive-timeout <ms>   Limit the amount of time of inactivity a
                                  server needs to wait for additional incoming
                                  data, after it has finished writing the last
                                  response, before a socket will be destroyed,
                                  defaults to 5000
  -L, --level <level>             Log level for application
  -l, --listen <location>         One or more locations you want to listen on,
                                  defaults to "http://*:3000"
  -p, --proxy                     Activate reverse proxy support
  -r, --requests <num>            Maximum number of requests socket can handle
                                  before closing keep alive connection,
                                  defaults to 0
      --request-timeout <ms>      Limit the amount of time for receiving the
                                  entire request from the client, defaults to
                                  300000
  -w, --workers <num>             Number of workers to spawn in cluster mode,
                                  defaults to the number of available CPUs
`;

function toNumber(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}
