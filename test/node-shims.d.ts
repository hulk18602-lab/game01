declare module "node:assert/strict" {
  // `any` is isolated to this dependency shim because @types/node is intentionally
  // not a production dependency; application and domain sources remain strict.
  const assert: any;
  export default assert;
}
declare module "node:test" {
  // See above: the real runtime API is supplied by Node during the test command.
  const test: any;
  export default test;
}
