import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
const bucket = process.env.STORAGE_PUBLIC_BUCKET?.trim() || "anna-site-images";

const apiKey = serviceKey || anonKey;
if (!url || !apiKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in .env.");
  process.exit(1);
}

if (!serviceKey && anonKey) {
  console.warn("Using anon key for uploads (bucket policies must allow anon writes).");
}

const extMime = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".JPG": "image/jpeg",
  ".PNG": "image/png",
  ".JPEG": "image/jpeg",
};

function guessMime(filePath) {
  return extMime[path.extname(filePath)] || "application/octet-stream";
}

function walkFiles(dir, baseRel) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    const rel = path.join(baseRel, ent.name).split(path.sep).join("/");
    if (ent.isDirectory()) out.push(...walkFiles(abs, rel));
    else if (ent.isFile()) out.push({ abs, rel });
  }
  return out;
}

const supabase = createClient(url, apiKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tasks = [];

if (fs.existsSync(path.join(root, "assets"))) {
  tasks.push(...walkFiles(path.join(root, "assets"), "assets"));
}

const MEDIA_EXT = /\.(jpe?g|png|gif|webp|svg|mp4|webm)$/i;
for (const name of fs.readdirSync(root)) {
  const abs = path.join(root, name);
  if (!fs.statSync(abs).isFile()) continue;
  if (!MEDIA_EXT.test(name)) continue;
  tasks.push({ abs, rel: name });
}

let ok = 0;
let fail = 0;

for (const { abs, rel } of tasks) {
  const body = fs.readFileSync(abs);
  const contentType = guessMime(abs);
  const { error } = await supabase.storage.from(bucket).upload(rel, body, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.error(`FAIL ${rel}:`, error.message);
    fail++;
  } else {
    console.log(`OK   ${rel}`);
    ok++;
  }
}

console.log(`\nDone. ${ok} uploaded, ${fail} failed.`);
console.log(`${url.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/`);
