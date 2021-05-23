import File from '../file.js';

export default class FormData extends URLSearchParams {
  constructor (fields, files = {}) {
    super(fields);
    this.files = files;
  }

  getUpload (name) {
    if (this.files[name] == null) return null;
    const upload = this.files[name];
    return {file: new File(upload.path), filename: upload.name, size: upload.size, type: upload.type};
  }
}
