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

test("pasted bare URLs inside formatted HTML become clickable without nested links or changed code", () => {
  const html = rich.richTextHtml(
    '<p><strong>Read:</strong> https://drive.google.com/file/d/example123/view</p><ul><li>www.example.com/lesson?a=1&amp;b=2.</li></ul><p><a href="https://example.com/original"><u>https://example.com/label</u></a></p><pre><code>https://example.com/code</code></pre>',
  );
  assert.match(
    html,
    /href="https:\/\/drive.google.com\/file\/d\/example123\/view"/,
  );
  assert.match(html, /href="https:\/\/www.example.com\/lesson\?a=1&amp;b=2"/);
  assert.equal((html.match(/<a\b/g) || []).length, 3);
  assert.match(html, /<code>https:\/\/example.com\/code<\/code>/);
  assert.doesNotMatch(html, /<a[^>]*>[^<]*<a/);
  assert.doesNotMatch(
    rich.richTextHtml("<p>https://user:password@example.com/path</p>"),
    /<a/,
  );
});
test("inline images retain safe file references, reject embedded data and make image-only work nonempty", () => {
  const inline =
    '<p><img src="/api/files/drive_file_123?inline=1" alt="Sketch" onerror="bad()"></p>';
  const html = rich.sanitizeRichText(inline);
  assert.match(html, /src="\/api\/files\/drive_file_123\?inline=1"/);
  assert.doesNotMatch(html, /onerror/);
  assert.equal(rich.hasRichTextContent(inline), true);
  assert.equal(
    rich.hasRichTextContent(
      '<p><img src="data:image/png;base64,anything"></p>',
    ),
    false,
  );
  assert.equal(rich.hasRichTextContent('<img src="javascript:bad()">'), false);
  assert.equal(
    rich.hasRichTextContent('<img src="//foreign.test/a.png">'),
    false,
  );
  assert.equal(rich.safeInlineImage("/api/files/../../secrets?inline=1"), null);
  assert.equal(
    rich.safeInlineImage("https://user:pass@example.com/a.png"),
    null,
  );
  assert.equal(
    rich.safeInlineImage("https://example.com/a.png"),
    "https://example.com/a.png",
  );
});
