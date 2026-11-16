// Node.js 24 runs the repository's TypeScript migration module directly.
import { migrate, getClient, SCHEMA_VERSION } from "../lib/db.ts";
try {
  await migrate();
  console.log(`Database schema ${SCHEMA_VERSION} is ready.`);
} finally {
  getClient().close();
}
