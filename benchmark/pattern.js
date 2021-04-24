'use strict';

import {Pattern} from '../lib/index.js';

const pattern = new Pattern('/foo/:bar/baz');
for (let i = 0; i < 10000000; i++) {
  pattern.match('/test/bar/baz', {isEndpoint: true});
  pattern.match('/foo/bar/baz', {isEndpoint: true});
}
