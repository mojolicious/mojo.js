import type {Route} from './route.js';

/**
 * Router plan class.
 */
export class Plan {
  /**
   * Route endpoint.
   */
  endpoint: Route | undefined = undefined;
  /**
   * Steps in route.
   */
  steps: Record<string, any>[] = [];
  /**
   * Dispatch stops in route.
   */
  stops: boolean[] = [];

  /**
   * Render route.
   */
  render(values: Record<string, any> = {}): {path: string; websocket: boolean} {
    const merged = [...this.steps, values].reduce((result, current) => Object.assign(result, current), {});

    const {endpoint} = this;
    if (endpoint === undefined) return {path: '', websocket: false};

    return {path: endpoint.render(merged), websocket: endpoint.hasWebSocket()};
  }
}
