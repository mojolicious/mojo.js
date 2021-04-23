'use strict';

class Plan {
  constructor () {
    this.endpoint = undefined;
    this.steps = [];
  }

  render (values = {}) {
    const merged = [...this.steps, values].reduce((result, current) => Object.assign(result, current), {});
    return {path: this.endpoint.render(merged)};
  }
}

module.exports = Plan;
