const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  Module = require("module"),
  path = require("path"),
  ts = require("typescript");
const filename = path.resolve(__dirname, "../lib/rich-text.ts"),
  mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText,
  filename,
);
const rich = mod.exports;
test("rich text strips executable HTML and unsafe links while retaining supported formatting", () => {
  const html = rich.sanitizeRichText(
    '<h2>Topic</h2><p style="text-align:center;color:red" onmouseover="bad()"><u>Read</u> <a href="javascript:alert(1)">bad</a><a href="https://example.com">safe</a></p><iframe src="https://evil.test"></iframe><script>alert(1)</script>',
  );
  assert.match(html, /<h2>Topic<\/h2>/);
  assert.match(html, /text-align:center/);
  assert.match(html, /<u>Read<\/u>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.doesNotMatch(
    html,
    /javascript:|onmouseover|color:red|iframe|script|alert/,
  );
});
test("legacy plain text stays literal, gets safe clickable URLs, and formatted emptiness is detected", () => {
  const input = "2 < 3\nhttps://example.com/path";
  assert.equal(rich.sanitizeRichText(input), input);
  const html = rich.richTextHtml(input);
  assert.match(html, /2 &lt; 3<br>/);
  assert.match(html, /<a href="https:\/\/example.com\/path"/);
  assert.equal(rich.hasRichTextContent("<p><br></p>"), false);
  assert.equal(rich.hasRichTextContent("<p>&nbsp;</p>"), false);
  assert.equal(
    rich.richTextPlainText("<p><b>Hello</b></p><ul><li>World</li></ul>"),
    "Hello World",
  );
});
