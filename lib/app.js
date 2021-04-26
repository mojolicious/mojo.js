import EventEmitter from 'events';
import CLI from './cli.js';
import File from './file.js';
import HTTPContext from './context/http.js';
import Renderer from './renderer.js';
import Router from './router.js';
import WebSocketContext from './context/websocket.js';
import defaultHelpersPlugin from './plugins/default-helpers.js';

export default class App extends EventEmitter {
  constructor () {
    super();

    this.cli = new CLI(this);
    this.helpers = {};
    this.home = new File(process.argv[1]).dirname();
    this.renderer = new Renderer();
    this.router = new Router();

    this.plugin(defaultHelpersPlugin);
  }

  addHelper (name, fn) {
    this.helpers[name] = fn;
    return this;
  }

  any (...args) {
    return this.router.any(...args);
  }

  get (...args) {
    return this.router.get(...args);
  }

  handleRequest (ctx) {
    this.router.dispatch(ctx);
  }

  newHTTPContext (...args) {
    return new HTTPContext(this, ...args);
  }

  newWebSocketContext (...args) {
    return new WebSocketContext(this, ...args);
  }

  plugin (plugin) {
    return plugin(this);
  }

  start () {
    return this.cli.start();
  }
}
