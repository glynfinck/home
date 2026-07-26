// Stands in for the `server-only` package under vitest (see vitest.config.ts).
// The real module throws when imported outside a server bundle, which is what
// keeps `vega` out of the client; that guarantee belongs to the bundler, so
// here it is simply a no-op.
export {};
