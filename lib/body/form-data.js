import File from '../file.js';

export default class FormData extends URLSearchParams {
  constructor (fields, files) {
    super(fields);
    this._files = files;
  }

  getUpload (name) {
    if (this._files[name] == null) return null;
    const upload = this._files[name];
    return {file: new File(upload.path), filename: upload.name, size: upload.size, type: upload.type};
  }
}
