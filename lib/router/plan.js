export default class Plan {
  constructor () {
    this.endpoint = undefined;
    this.steps = [];
    this.stops = [];
  }

  render (values = {}) {
    const merged = [...this.steps, values].reduce((result, current) => Object.assign(result, current), {});
    return {path: this.endpoint.render(merged), websocket: this.endpoint.hasWebSocket()};
  }
}
