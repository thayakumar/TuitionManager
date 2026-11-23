const target = new URL(process.env.TEST_BASE || "http://localhost:4710");
if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) throw new Error("Audit harness only accepts a loopback TEST_BASE; never run these mutations against production.");
