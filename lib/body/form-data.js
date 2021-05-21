import File from '../file.js';

export default class FormData extends URLSearchParams {
  constructor (fields, files) {
    super(fields);
    this._files = files;
  }

  getUpload (name) {
    if (this._files[name] == null) return null;
    if (this._files[name].file === undefined) this._files[name].file = new File(this._files[name].path);
    return this._files[name];
  }
}
