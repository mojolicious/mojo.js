import {on} from 'events';
import {promisify} from 'util';

export function decodeURIComponentSafe (value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return null;
  }
}

export const sleep = promisify(setTimeout);

export function tablify (rows = []) {
  const spec = [];

  const table = rows.map(row => {
    return row.map((col, i) => {
      col = (col == null ? '' : typeof col === 'string' ? col : '' + col).replace(/[\r\n]/g, '');
      if (col.length >= (spec[i] || 0)) spec[i] = col.length;
      return col;
    });
  });

  const lines = table.map(row => row.map((col, i) => i === row.length - 1 ? col : col.padEnd(spec[i])).join('  '));
  return lines.join('\n') + '\n';
}

export function websocketMessageIterator (ws) {
  /* global AbortController */
  /* eslint no-undef: "error" */
  const ac = new AbortController();
  ws.on('close', () => ac.abort());
  const messages = on(ws, 'message', {signal: ac.signal});
  return (async function * () {
    try {
      for await (const [message] of messages) {
        yield message;
      }
    } catch (e) {
      if (e.code !== 'ABORT_ERR') throw e;
    }
  })();
}
