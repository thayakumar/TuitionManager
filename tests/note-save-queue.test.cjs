const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const filename = require("node:path").join(
  __dirname,
  "../components/note-save-queue.ts",
);
const m = new Module(filename, module);
m.filename = filename;
m._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  filename,
);
const { NoteSaveQueue } = m.exports;
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
test("old acknowledgement cannot mark newer notes saved; leave waits for latest write", async () => {
  const a = deferred(),
    b = deferred();
  const calls = [],
    states = [];
  const q = new NoteSaveQueue("", async (value) => {
    calls.push(value);
    await (value === "A" ? a.promise : b.promise);
  });
  q.update("A");
  const save = q.flush((current) => states.push(current));
  q.update("B");
  let left = false;
  const leave = q.flush().then(() => {
    left = true;
  });
  a.resolve();
  await new Promise(setImmediate);
  assert.deepEqual(calls, ["A", "B"]);
  assert.equal(q.dirty, true);
  assert.equal(left, false);
  assert.deepEqual(states, [false]);
  b.resolve();
  await Promise.all([save, leave]);
  assert.equal(left, true);
  assert.equal(q.dirty, false);
  assert.deepEqual(states, [false, true]);
});
test("failed save preserves dirty draft and retry writes latest text", async () => {
  let fail = true;
  const calls = [];
  const q = new NoteSaveQueue("old", async (value) => {
    calls.push(value);
    if (fail) throw Error("offline");
  });
  q.update("new");
  await assert.rejects(q.flush(), /offline/);
  assert.equal(q.dirty, true);
  q.update("newer");
  fail = false;
  await q.flush();
  assert.equal(q.dirty, false);
  assert.deepEqual(calls, ["new", "newer"]);
});
