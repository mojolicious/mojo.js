'use strict';

class Controller {
  test (ctx) {
    return ctx.render({text: 'Multiple levels'});
  }
}

module.exports = Controller;
