import EventEmitter from 'events';
import defaultHelpersPlugin from './plugins/default-helpers.js';
import mock from '../lib/client/mock.js';
import CLI from './cli.js';
import Client from './client.js';
import File from './file.js';
import HTTPContext from './context/http.js';
import Renderer from './renderer.js';
import Router from './router.js';
import WebSocketContext from './context/websocket.js';

export default class App extends EventEmitter {
  constructor () {
    super();

    this.cli = new CLI(this);
    this.client = new Client();
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

  delete (...args) {
    return this.router.delete(...args);
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

  newMockClient (...args) {
    return mock(this, ...args);
  }

  newWebSocketContext (...args) {
    return new WebSocketContext(this, ...args);
  }

  options (...args) {
    return this.router.options(...args);
  }

  patch (...args) {
    return this.router.patch(...args);
  }

  plugin (plugin, ...args) {
    return plugin(this, ...args);
  }

  post (...args) {
    return this.router.post(...args);
  }

  put (...args) {
    return this.router.put(...args);
  }

  start () {
    return this.cli.start();
  }

  under (...args) {
    return this.router.under(...args);
  }

  websocket (...args) {
    return this.router.websocket(...args);
  }
}
