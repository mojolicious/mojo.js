
# FAQ

This document contains answers for the most frequently asked questions about [mojo.js](https://mojojs.org).

### What about backwards compatibility?

We strictly follow [Semantic Versioning](https://semver.org) for all changes. New features can however be marked as
experimental to explicitly exclude them from the rules. This gives us the necessary freedom to ensure a healthy future
for [mojo.js](https://mojojs.org). So, as long as you are not using anything marked experimental, untested or
undocumented, you can always count on backwards compatibility, everything else would be considered a bug. However, to
completely avoid any risk of accidental breakage, we do recommend following current best practices for version pinning
with `package-lock.json` files.

### How do i get my IDE to autocomplete helpers?

Of course you want your IDE to autocomplete helpers when you start typing `ctx.`. Helpers are very dynamic code
however, so the IDE will need a little help. For this purpose TypeScript supports a feature called
[declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html). With it you can add your
helpers to the `MojoContext` interface, which is exported by `@mojojs/core`.

```
declare module '@mojojs/core' {
  interface MojoContext {
    myHelper: (foo: string, bar: number) => boolean;
  }
}
```

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), on [Matrix](https://matrix.to/#/#mojo:matrix.org), or
[IRC](https://web.libera.chat/#mojo).
