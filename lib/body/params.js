export default class Params extends URLSearchParams {
  toObject () {
    return Object.fromEntries(this);
  }
}
