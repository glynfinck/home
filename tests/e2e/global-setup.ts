import { spawn, type ChildProcess } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

// Minimal valid PDF so the download route has a real object to sign.
const SAMPLE_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

const BASE = "http://localhost:3000";

async function waitForServer(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`server did not become ready within ${timeoutMs}ms`);
}

// Vitest globalSetup: upload the fixture PDF, boot the production server,
// and return a teardown that stops it. Requires `npm run build` first.
export default async function () {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const upload = await admin.storage
    .from("research")
    .upload("papers/momentum-decay-crypto.pdf", Buffer.from(SAMPLE_PDF), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upload.error) {
    throw new Error(`fixture PDF upload failed: ${upload.error.message}`);
  }

  const server: ChildProcess = spawn("npm", ["run", "start"], {
    env: process.env,
    stdio: "ignore",
  });

  try {
    await waitForServer(90_000);
  } catch (err) {
    server.kill("SIGKILL");
    throw err;
  }

  return async () => {
    server.kill("SIGTERM");
  };
}
