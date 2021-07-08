import type {Route} from './route.js';

export class Plan {
  endpoint: Route | undefined = undefined;
  steps: Array<Record<string, any>> = [];
  stops: boolean[] = [];

  render (values: Record<string, any> = {}): {path: string, websocket: boolean} {
    const merged = [...this.steps, values].reduce((result, current) => Object.assign(result, current), {});

    const endpoint = this.endpoint;
    if (endpoint === undefined) return {path: '', websocket: false};

    return {path: endpoint.render(merged), websocket: endpoint.hasWebSocket()};
  }
}
