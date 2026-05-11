import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "out");

const MEDIA_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".mp4",
  ".webm",
  ".JPG",
  ".JPEG",
  ".PNG",
]);

function resolveMediaBase() {
  const explicit = process.env.PUBLIC_SITE_IMAGES_BASE?.trim();
  if (explicit) {
    return explicit.endsWith("/") ? explicit : `${explicit}/`;
  }
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const bucket = process.env.STORAGE_PUBLIC_BUCKET?.trim();
  if (url && bucket) {
    return `${url}/storage/v1/object/public/${bucket}/`;
  }
  return null;
}

function listRootMediaFiles() {
  const names = [];
  for (const name of fs.readdirSync(root)) {
    const full = path.join(root, name);
    if (!fs.statSync(full).isFile()) continue;
    if (MEDIA_EXT.has(path.extname(name))) names.push(name);
  }
  return names;
}

function rewriteHtml(html, base) {
  let out = html;
  out = out.replaceAll("assets/", `${base}assets/`);
  for (const name of listRootMediaFiles()) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`src="${esc}"`, "g"), `src="${base}${name}"`);
    out = out.replace(new RegExp(`src='${esc}'`, "g"), `src='${base}${name}'`);
    out = out.replace(new RegExp(`href="${esc}"`, "g"), `href="${base}${name}"`);
    out = out.replace(new RegExp(`href='${esc}'`, "g"), `href='${base}${name}'`);
  }
  return out;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const base = resolveMediaBase();
if (!base) {
  console.error(
    "Missing media CDN base. Vercel: vercel.json build.env should set SUPABASE_URL + STORAGE_PUBLIC_BUCKET, or add PUBLIC_SITE_IMAGES_BASE in Project → Environment variables."
  );
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const htmlFiles = fs
  .readdirSync(root)
  .filter((f) => f.endsWith(".html") && fs.statSync(path.join(root, f)).isFile());

for (const file of htmlFiles) {
  const srcPath = path.join(root, file);
  const html = rewriteHtml(fs.readFileSync(srcPath, "utf8"), base);
  fs.writeFileSync(path.join(outDir, file), html, "utf8");
  console.log(`Wrote out/${file}`);
}

for (const dir of ["js", "fonts"]) {
  copyDir(path.join(root, dir), path.join(outDir, dir));
  console.log(`Copied ${dir}/`);
}

console.log(`Build complete (${htmlFiles.length} HTML). Media from ${base}`);
