#!/bin/sh
# Install the packed package into an empty project and use it the way consumers will
set -eu

root=$(pwd)
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT

npm run clean
npm run build
npm pack --pack-destination "$dir"

cp test/support/package/app.js test/support/package/app.ts test/support/package/tsconfig.json "$dir"
cd "$dir"
npm init -y > /dev/null
npm pkg set type=module
npm install --no-audit --no-fund ./mojojs-core-*.tgz "@types/node@$(node -p 'process.versions.node.split(".")[0]')" \
  "typescript@$(node -p "require('$root/node_modules/typescript/package.json').version")"

npx tsc -p tsconfig.json
npx tsc -p tsconfig.json --module preserve --moduleResolution bundler
node app.js
node app.ts
npx mojo version
