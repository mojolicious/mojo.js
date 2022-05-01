import type {MojoApp} from '../types.js';
import {Server} from '../server.js';
import nopt from 'nopt';

const EVENTS = ['SIGINT', 'SIGTERM', 'SIGUSR2'];

/**
 * Server command.
 */
export default async function serverCommand(app: MojoApp, args: string[]): Promise<void> {
  const parsed = nopt(
    {
      cluster: Boolean,
      'headers-timeout': Number,
      'keep-alive-timeout': Number,
      level: String,
      listen: [String, Array],
      proxy: Boolean,
      'request-timeout': Number,
      workers: Number
    },
    {c: '--cluster', L: '--level', l: '--listen', p: '--proxy', w: '--workers'},
    args,
    1
  );

  if (parsed.level !== undefined) app.log.level = parsed.level;

  const server = new Server(app, {
    cluster: parsed.cluster,
    headersTimeout: parsed['headers-timeout'],
    keepAliveTimeout: parsed['keep-alive-timeout'],
    listen: parsed.listen,
    requestTimeout: parsed['request-timeout'],
    reverseProxy: parsed.proxy,
    workers: parsed.workers
  });

  const listener = (): void => {
    EVENTS.forEach(signal => process.removeListener(signal, listener));
    server.stop().catch(error => app.log.error(error));
  };
  EVENTS.forEach(signal => process.on(signal, listener));

  await server.start();
}

serverCommand.description = 'Start application with HTTP server';
serverCommand.usage = `Usage: APPLICATION server [OPTIONS]

  node index.js server
  node index.js server --level trace
  node index.js server --cluster
  node index.js server --keep-alive-timeout 30000
  node index.js server -l http://[::1]:3000
  node index.js server -l http://*:8080 -l http://*:8081
  node index.js server -l 'https://*:443?cert=./server.crt&key=./server.key'

  # Run server in production mode
  NODE_ENV=production node index.js server

Options:
  -c, --cluster                   Run in cluster mode with multiple processes
      --headers-timeout <ms>      Limit the amount of time the parser will
                                  wait to receive the complete HTTP headers
  -h, --help                      Show this summary of available options
      --keep-alive-timeout <ms>   Limit the amount of time of inactivity a
                                  server needs to wait for additional incoming
                                  data, after it has finished writing the last
                                  response, before a socket will be destroyed
  -L, --level <level>             Log level for application
  -l, --listen <location>         One or more locations you want to listen on,
                                  defaults to "http://*:3000"
  -p, --proxy                     Activate reverse proxy support
      --request-timeout <ms>      Limit the amount of time for receiving the
                                  entire request from the client
  -w, --workers <num>             Number of workers to spawn in cluster mode,
                                  defaults to the number of available CPUs
`;
