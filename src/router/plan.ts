import type {MojoStash} from '../types.js';
import Route from './route.js';

export default class Plan {
  endpoint: Route = undefined;
  steps: MojoStash[] = [];
  stops: boolean[] = [];

  render (values: MojoStash = {}) : {path: string, websocket: boolean} {
    const merged = [...this.steps, values].reduce((result, current) => Object.assign(result, current), {});
    const endpoint = this.endpoint;
    return {path: endpoint.render(merged), websocket: endpoint.hasWebSocket()};
  }
}
