/**
 * Class representing query or form parameters.
 * @extends URLSearchParams
 */
export default class Params extends URLSearchParams {
  /**
   * Turn parameters into a plain object.
   * @returns {object} - Plain object.
   */
  toObject () {
    return Object.fromEntries(this);
  }
}
