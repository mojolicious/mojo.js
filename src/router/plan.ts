import type {MojoStash} from '../types.js';
import type {Route} from './route.js';

export class Plan {
  endpoint: Route | undefined = undefined;
  steps: MojoStash[] = [];
  stops: boolean[] = [];

  render (values: MojoStash = {}): {path: string, websocket: boolean} {
    const merged = [...this.steps, values].reduce((result, current) => Object.assign(result, current), {});

    const endpoint = this.endpoint;
    if (endpoint === undefined) return {path: '', websocket: false};

    return {path: endpoint.render(merged), websocket: endpoint.hasWebSocket()};
  }
}
