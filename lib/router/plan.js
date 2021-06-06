export default class Plan {
  constructor () {
    this.endpoint = undefined;
    this.steps = [];
    this.stops = [];
  }

  render (values = {}) {
    const merged = [...this.steps, values].reduce((result, current) => Object.assign(result, current), {});
    const endpoint = this.endpoint;
    return {path: endpoint.render(merged), websocket: endpoint.hasWebSocket()};
  }
}
