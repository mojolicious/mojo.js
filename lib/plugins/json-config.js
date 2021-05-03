import File from '../file.js';

export default function jsonConfigPlugin (app, options = {}) {
  const filename = new File(options.file ?? 'config.json');
  const filePath = filename.isAbsolute() === true ? filename : app.home.child(filename.toString());
  Object.assign(app.config, JSON.parse(filePath.readFileSync()));

  const fileParts = filePath.toString().split('.');
  fileParts.splice(-1, 0, app.mode);
  const modeFilePath = new File(fileParts.join('.'));
  if (modeFilePath.existsSync() === true) Object.assign(app.config, JSON.parse(modeFilePath.readFileSync()));
}
