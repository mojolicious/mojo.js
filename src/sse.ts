import type {SSEEvent} from './types.ts';

const SPLIT_RE = /\r\n|(?<!\r)\n|\r(?!\n)/;
const EVENT_RE = /^([\s\S]*?)(?:\r\n|(?<!\r)\n|\r(?!\n)){2}/;

/**
 * Build Server-Sent Event. Note that this function is EXPERIMENTAL and might change without warning!
 */
export function buildEvent(event: SSEEvent): Buffer {
  const data = splitLines(event.text);
  const comment = splitLines(event.comment);

  const parts: string[] = [];
  if (comment.length > 0) {
    for (const line of comment) parts.push(`: ${line}`);
  } else {
    if (event.type !== undefined) parts.push(`event: ${event.type}`);
    for (const line of data) parts.push(`data: ${line}`);
    if (event.id !== undefined && event.id !== null) parts.push(`id: ${event.id}`);
  }

  return Buffer.from([...parts, '', ''].join('\r\n'));
}

/**
 * Parse Server-Sent Event, returns the event (or `null` if no complete event was found) and the remaining buffer. Note
 * that this function is EXPERIMENTAL and might change without warning!
 */
export function parseEvent(buffer: string): [SSEEvent | null, string] {
  const event: SSEEvent = {id: null, type: 'message', text: ''};

  for (let match = buffer.match(EVENT_RE); match !== null; match = buffer.match(EVENT_RE)) {
    buffer = buffer.slice(match[0].length);

    // Skip comments
    const lines = match[1];
    if (/^\s*:/.test(lines) === true) continue;

    let first = true;
    for (const line of lines.split(SPLIT_RE)) {
      let field: RegExpMatchArray | null;
      if ((field = line.match(/^event(?::\s*(\S.*))?$/)) !== null) {
        event.type = field[1] ?? 'message';
      } else if ((field = line.match(/^data(?::\s*(.*))?$/)) !== null) {
        event.text += (first === true ? '' : '\n') + (field[1] ?? '');
        first = false;
      } else if ((field = line.match(/^id(?::\s*(.*))?$/)) !== null) {
        event.id = field[1] ?? null;
      }
    }

    return [event, buffer];
  }

  return [null, buffer];
}

// Split like Perl, without trailing empty lines
function splitLines(value: string | undefined): string[] {
  if (value === undefined) return [];
  const lines = value.split(SPLIT_RE);
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}
