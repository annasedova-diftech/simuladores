// Собирает сайт: копирует simulators/** в _site/ и генерирует главную страницу-каталог.
// Ничего не требует, кроме Node 18+. Никаких зависимостей.
import { readdir, readFile, mkdir, cp, writeFile, stat, rm } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "simulators");
const OUT = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(ROOT, "_site");

const pick = (html, re) => (html.match(re)?.[1] ?? "").trim();
const strip = (s) => s.replace(/<[^>]*>/g, "").trim();
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function collect(dir, category = "") {
  const items = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      items.push(...(await collect(full, category ? `${category} / ${entry.name}` : entry.name)));
      continue;
    }
    if (!entry.name.toLowerCase().endsWith(".html")) continue;

    const html = await readFile(full, "utf8");
    const info = await stat(full);
    const rel = path.relative(SRC, full).split(path.sep).join("/");

    items.push({
      href: `simulators/${rel}`,
      file: entry.name,
      category: pick(html, /<meta\s+name=["']sim:category["']\s+content=["']([^"']*)["']/i) || category || "Sin categoría",
      title:
        pick(html, /<meta\s+name=["']sim:title["']\s+content=["']([^"']*)["']/i) ||
        strip(pick(html, /<title>([\s\S]*?)<\/title>/i)) ||
        entry.name.replace(/\.html$/i, ""),
      description:
        pick(html, /<meta\s+name=["']sim:description["']\s+content=["']([^"']*)["']/i) ||
        pick(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
      updated: info.mtime.toISOString().slice(0, 10),
    });
  }
  return items;
}

const sims = (await collect(SRC)).sort(
  (a, b) => a.category.localeCompare(b.category, "es") || a.title.localeCompare(b.title, "es")
);

const groups = new Map();
for (const s of sims) {
  if (!groups.has(s.category)) groups.set(s.category, []);
  groups.get(s.category).push(s);
}

const cards = (list) =>
  list
    .map(
      (s) => `        <a class="card" href="${esc(s.href)}" data-search="${esc((s.title + " " + s.description + " " + s.file).toLowerCase())}">
          <h3>${esc(s.title)}</h3>
          ${s.description ? `<p>${esc(s.description)}</p>` : ""}
          <footer><span class="file">${esc(s.file)}</span><time>${esc(s.updated)}</time></footer>
        </a>`
    )
    .join("\n");

const sections = [...groups]
  .map(
    ([cat, list]) => `      <section class="group">
        <h2>${esc(cat)} <span class="count">${list.length}</span></h2>
        <div class="grid">
${cards(list)}
        </div>
      </section>`
  )
  .join("\n");

const page = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simuladores</title>
<style>
  :root { --bg:#0d0d0f; --card:#17171b; --line:#2a2a31; --text:#f2f2f4; --muted:#9a9aa6; --accent:#c8f751; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; }
  .wrap { max-width:1120px; margin:0 auto; padding:56px 24px 96px; }
  header h1 { margin:0 0 8px; font-size:40px; letter-spacing:-.02em; }
  header p { margin:0 0 28px; color:var(--muted); }
  input { width:100%; padding:14px 16px; margin-bottom:40px; border-radius:12px;
          border:1px solid var(--line); background:var(--card); color:var(--text); font-size:15px; }
  input:focus { outline:none; border-color:var(--accent); }
  .group { margin-bottom:44px; }
  .group h2 { font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted);
              margin:0 0 16px; font-weight:600; }
  .count { display:inline-block; margin-left:6px; color:var(--accent); }
  .grid { display:grid; gap:14px; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); }
  .card { display:flex; flex-direction:column; gap:8px; padding:20px; border-radius:14px;
          background:var(--card); border:1px solid var(--line); text-decoration:none; color:inherit;
          transition:border-color .15s, transform .15s; }
  .card:hover { border-color:var(--accent); transform:translateY(-2px); }
  .card h3 { margin:0; font-size:17px; line-height:1.3; }
  .card p { margin:0; color:var(--muted); font-size:14px; }
  .card footer { margin-top:auto; padding-top:10px; display:flex; justify-content:space-between;
                 gap:12px; font-size:12px; color:var(--muted); }
  .file { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .empty { color:var(--muted); }
  .hidden { display:none !important; }
  .foot { margin-top:56px; color:var(--muted); font-size:13px; }
  .foot code { background:var(--card); padding:2px 6px; border-radius:5px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Simuladores</h1>
    <p>${sims.length} simulador${sims.length === 1 ? "" : "es"} · actualizado ${new Date().toISOString().slice(0, 10)}</p>
  </header>
  <input id="q" type="search" placeholder="Buscar simulador…" autocomplete="off">
${sections || '  <p class="empty">Todavía no hay simuladores. Añade un .html en <code>simulators/</code>.</p>'}
  <p class="foot">Para añadir uno nuevo: sube el <code>.html</code> a <code>simulators/</code> y haz push. La página se regenera sola.</p>
</div>
<script>
  const q = document.getElementById('q');
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase();
    for (const card of document.querySelectorAll('.card'))
      card.classList.toggle('hidden', v && !card.dataset.search.includes(v));
    for (const g of document.querySelectorAll('.group'))
      g.classList.toggle('hidden', !g.querySelector('.card:not(.hidden)'));
  });
</script>
</body>
</html>
`;

await rm(OUT, { recursive: true, force: true }).catch(() => {});
await mkdir(OUT, { recursive: true });
await cp(SRC, path.join(OUT, "simulators"), { recursive: true });
await writeFile(path.join(OUT, "index.html"), page);
await writeFile(path.join(OUT, ".nojekyll"), "");
await writeFile(path.join(OUT, "simulators.json"), JSON.stringify(sims, null, 2));

console.log(`✓ ${sims.length} simuladores → _site/`);
for (const s of sims) console.log(`  · [${s.category}] ${s.title}`);
