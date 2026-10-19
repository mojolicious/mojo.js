import {Pattern} from '../../src/router/pattern.ts';

for (let i = 0; i < 1000000; i++) {
  const pattern = new Pattern('/foo/:bar/baz');
  pattern.match('/test/bar/baz', {isEndpoint: true});
}
