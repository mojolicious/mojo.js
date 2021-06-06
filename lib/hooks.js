export default class Hooks {
  constructor () {
    this._hooks = {};
  }

  addHook (name, fn) {
    if (this._hooks[name] === undefined) this._hooks[name] = [];
    this._hooks[name].push(fn);
  }

  runHook (name, ...args) {
    if (this._hooks[name] === undefined) return Promise.resolve();
    return this._prepareHook(this._hooks[name])(...args);
  }

  _prepareHook (chain) {
    return function hook (...args) {
      return next(0);

      function next (i, result) {
        const fn = chain[i];
        if (result !== undefined || fn === undefined) return result;
        return new Promise(resolve => resolve(fn(...args))).then(next.bind(null, i + 1));
      }
    };
  }
}
