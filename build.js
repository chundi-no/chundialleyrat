// Construit le site dans dist/ à partir des gabarits (site/pages) et du contenu (content/),
// celui que l'administration (/admin) modifie. Lancé par Netlify à chaque publication : node build.js
const fs = require("fs"), path = require("path");
const R = __dirname, OUT = path.join(R, "dist");
const lireJSON = p => JSON.parse(fs.readFileSync(p, "utf8"));
const dossier = d => fs.existsSync(path.join(R, d)) ? fs.readdirSync(path.join(R, d)).filter(f => f.endsWith(".json")).map(f => ({ id: f.replace(/\.json$/, ""), ...lireJSON(path.join(R, d, f)) })) : [];
const parOrdre = (a, b) => (a.ordre ?? 9999) - (b.ordre ?? 9999) || String(a.id).localeCompare(String(b.id));
const nettoie = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));

// ——— Contenu ———
const reglages = lireJSON(path.join(R, "content/reglages.json"));
const FAMS = reglages.familles.map(f => ({ name: f.nom, disc: f.disciplines || [] }));
const DISC = FAMS.flatMap(f => f.disc);
const W = dossier("content/oeuvres").map(w => ({ ...w, themes: w.themes || [], disc: (w.disc || []).filter(d => DISC.includes(d)), y: typeof w.y === "number" ? w.y : (parseFloat(w.y) || parseInt(w.date, 10) || 2026), date: String(w.date ?? "") })).sort(parOrdre);
const INSPI = dossier("content/inspirations").map(i => nettoie({ ...i, oeuvre: i.oeuvre || null })).map(i => ({ oeuvre: null, ...i })).sort(parOrdre);
const PROJ = dossier("content/projets").map(p => ({ tags: [], visuels: [], ...p })).sort(parOrdre);
const PLAYLIST = dossier("content/playlist").filter(t => t.fichier).sort(parOrdre).map((t, k) => ({ id: t.id, title: t.title || t.id, fichier: t.fichier, ordre: k + 1 }));
const accueil = lireJSON(path.join(R, "content/pages/accueil.json"));
const chundi = lireJSON(path.join(R, "content/pages/chundi.json"));

const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined && o[k] !== "").map(k => [k, o[k]]));
const CORE = ["id", "artist", "work", "date", "y", "type", "fav", "themes", "disc"];
const EXTRA = ["avisDate", "citation", "citationSrc", "pourquoi", "by", "url"];
const resumeOK = w => w.resume && (w.resume.ctx || w.resume.recap);

// ——— Outils ———
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\{\{/g, "{&#8203;{");
const texte = s => esc(s).replace(/\*([^*]+)\*/g, "<i>$1</i>");
const lit = v => JSON.stringify(v).replace(/<\//g, "<\\/");
function remplaceConst(src, name, value) {
  const tag = "const " + name + " = ", i = src.indexOf(tag);
  if (i < 0) throw new Error("constante absente : " + name);
  const start = i + tag.length, open = src[start], close = open === "[" ? "]" : "}";
  let depth = 0, j = start, inStr = false, q = "";
  for (; j < src.length; j++) {
    const c = src[j];
    if (inStr) { if (c === "\\") { j++; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = true; q = c; continue; }
    if (c === open) depth++;
    if (c === close) { depth--; if (depth === 0) break; }
  }
  return src.slice(0, start) + lit(value) + src.slice(j + 1);
}

// ——— Données par page ———
const themes = [...new Set(W.flatMap(w => w.themes))];
const remplaceTokens = s => s.replace(/\{oeuvres\}/g, W.length).replace(/\{themes\}/g, themes.length).replace(/\{familles\}/g, FAMS.length)
  .replace(/\{liste_familles\}/g, FAMS.map(f => f.name.toLowerCase()).join(", ")).replace(/\{inspirations\}/g, INSPI.length).replace(/\{projets\}/g, PROJ.length);
const DONNEES = {
  bibliotheque: s => {
    s = remplaceConst(s, "DISC", DISC); s = remplaceConst(s, "FAMS", FAMS);
    s = remplaceConst(s, "CITED", W.map(w => ({ ...pick(w, CORE), note: w.avis || "", ...pick(w, EXTRA) })));
    return remplaceConst(s, "INSPIRATIONS", INSPI.map(i => pick(i, ["id", "type", "title", "oeuvre"])));
  },
  explorer: s => {
    s = remplaceConst(s, "DISC", DISC);
    s = remplaceConst(s, "CITED", W.map(w => ({ ...pick(w, CORE), ...pick(w, EXTRA) })));
    s = remplaceConst(s, "AVIS", Object.fromEntries(W.filter(w => w.avis).map(w => [w.id, w.avis])));
    s = remplaceConst(s, "RESUMES", Object.fromEntries(W.filter(resumeOK).map(w => [w.id, { ctx: w.resume.ctx || "", recap: w.resume.recap || "" }])));
    return remplaceConst(s, "INSPIRATIONS", INSPI.map(i => pick(i, ["id", "type", "title", "source", "note"])));
  },
  inspirations: s => {
    s = remplaceConst(s, "ITEMS", INSPI);
    return remplaceConst(s, "OEUVRES", W.map(w => pick(w, ["id", "work", "artist"])));
  },
  projets: s => remplaceConst(s, "PROJETS", PROJ),
  accueil: s => s.replace(/%%(\w+)%%/g, (_, k) => {
    const n = { nb_oeuvres: W.length, nb_themes: themes.length, nb_inspirations: INSPI.length, nb_projets: PROJ.length };
    if (k in n) return String(n[k]);
    return texte(remplaceTokens(accueil[k] ?? ""));
  }),
  "chundi-alleyrat": s => {
    const H2 = "margin: 0 0 4px; font-family: Archivo, 'Arial Narrow', sans-serif; font-stretch: 62%; font-weight: 800; font-size: 28px; line-height: 1; text-transform: uppercase";
    const bonjour = `<section aria-labelledby="bonjour" style="display: flex; flex-direction: column; gap: 12px">
<h2 id="bonjour" style="margin: 0; font-family: 'DM Mono', ui-monospace, monospace; font-size: 12px; font-weight: 400; text-transform: uppercase">Bonjour</h2>
${(chundi.bonjour || []).map((p, k) => `<p style="margin: 0; ${k === 0 ? "font-size: clamp(22px, 2.1vw, 30px); line-height: 1.25" : "line-height: 1.4"}; text-wrap: pretty">${texte(p)}</p>`).join("\n")}
</section>`;
    const sections = (chundi.sections || []).map((sec, k) => `<section aria-labelledby="cv-${k}" style="display: flex; flex-direction: column; gap: 8px">
<h2 id="cv-${k}" style="${H2}">${esc(sec.titre)}</h2>
${(sec.lignes || []).map(l => `<div style="display: flex; flex-wrap: wrap; gap: 0 24px"><span style="flex: 0 0 190px; font-family: 'DM Mono', ui-monospace, monospace; font-size: 14px; padding-top: 4px">${esc(l.quand)}</span><span style="flex: 1 1 360px">${texte(l.quoi)}</span></div>`).join("\n")}
</section>`).join("\n\n");
    const c = chundi.contact || {};
    const lignes = [c.ville, c.email && `<a href="mailto:${esc(c.email)}" style="color: inherit">${esc(c.email)}</a>`, c.telephone && `<a href="tel:${esc(String(c.telephone).replace(/\s/g, ""))}" style="color: inherit">${esc(c.telephone)}</a>`]
      .filter(Boolean).map(x => `<p style="margin: 0">${x.startsWith("<a") ? x : esc(x)}</p>`).join("\n");
    const liens = (c.liens || []).filter(l => l.nom).map(l => l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener" style="color: inherit">${esc(l.nom)}</a>` : `<span>${esc(l.nom)}</span>`).join("\n");
    const contact = `${lignes}
${liens ? `<div style="display: flex; flex-direction: column; gap: 2px; border-top: 1px solid var(--encre); padding-top: 10px; font-family: 'DM Mono', ui-monospace, monospace; font-size: 13px">\n${liens}\n</div>` : ""}
${c.disponibilite ? `<p style="margin: 0; border-top: 1px solid var(--encre); padding-top: 10px; font-size: 16px; font-style: italic">${texte(c.disponibilite)}</p>` : ""}`;
    return s.replace("<!--CHUNDI_SECTIONS-->", bonjour + "\n\n" + sections).replace("<!--CHUNDI_CONTACT-->", contact);
  }
};

// ——— Pages ———
const PAGES = { accueil: "index.html", bibliotheque: "bibliotheque/index.html", explorer: "explorer/index.html", inspirations: "inspirations/index.html", projets: "projets/index.html", "chundi-alleyrat": "chundi-alleyrat/index.html" };
const DESCRIPTION = "Bibliothèque personnelle de Chundi Alleyrat : œuvres, thèmes, inspirations et projets.";
const FORMULAIRE = `<form name="proposition" data-netlify="true" netlify-honeypot="bot-field" hidden><input name="bot-field"><input name="reference"><input name="pourquoi"><input name="prenom"></form>`;
fs.rmSync(OUT, { recursive: true, force: true });
const copie = (a, b) => { if (!fs.existsSync(a)) return; fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) { const s = path.join(a, f), d = path.join(b, f); fs.statSync(s).isDirectory() ? copie(s, d) : fs.copyFileSync(s, d); } };
copie(path.join(R, "site/static"), OUT);
for (const [nom, sortie] of Object.entries(PAGES)) {
  let src = fs.readFileSync(path.join(R, "site/pages", nom + ".dc.html"), "utf8");
  src = remplaceConst(src, "PLAYLIST", PLAYLIST);
  if (DONNEES[nom]) src = DONNEES[nom](src);
  const titre = (src.match(/<title>([^<]*)<\/title>/) || [, "Chundi Alleyrat"])[1];
  const xdc = src.slice(src.indexOf("<x-dc>") + 6, src.indexOf("</x-dc>"));
  const helmet = (xdc.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ""])[1];
  const gabarit = xdc.replace(/<helmet>[\s\S]*?<\/helmet>/, "").replace(/<\/script/gi, "<\\/script");
  const m = src.match(/<script type="text\/x-dc" data-dc-script(?: data-props='([^']*)')?>([\s\S]*?)<\/script>/);
  const code = m[2];
  const props = { bandeau: reglages.bandeau, cartelsTest: 0 };
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(DESCRIPTION)}">
<link rel="icon" href="/img/fleche-retro.png">
${helmet.trim()}
</head>
<body>
<div id="racine"></div>
<noscript>Ce site a besoin de JavaScript pour s’afficher.</noscript>
${nom === "bibliotheque" ? FORMULAIRE : ""}
<script type="text/x-dc-template" id="dc-template">${gabarit}</script>
<script src="/vendor/react.production.min.js"></script>
<script src="/vendor/react-dom.production.min.js"></script>
<script src="/dc.js"></script>
<script>
${code}
DCMonter(Component, ${lit(props)});
</script>
</body>
</html>
`;
  fs.mkdirSync(path.dirname(path.join(OUT, sortie)), { recursive: true });
  fs.writeFileSync(path.join(OUT, sortie), html);
}

// ——— Administration ———
const depot = (process.env.REPOSITORY_URL || "").replace(/^.*github\.com[/:]/, "").replace(/\.git$/, "") || (fs.existsSync(path.join(R, "depot.txt")) ? fs.readFileSync(path.join(R, "depot.txt"), "utf8").trim() : "PSEUDO-GITHUB/chundialleyrat-site");
const yamlListe = (arr, indent) => arr.map(x => " ".repeat(indent) + "- " + JSON.stringify(x)).join("\n");
const config = fs.readFileSync(path.join(R, "admin/config.modele.yml"), "utf8")
  .replace("__DEPOT__", depot).replace("__DISCIPLINES__", yamlListe(DISC, 14));
fs.mkdirSync(path.join(OUT, "admin"), { recursive: true });
fs.writeFileSync(path.join(OUT, "admin/config.yml"), config);
fs.copyFileSync(path.join(R, "admin/index.html"), path.join(OUT, "admin/index.html"));
fs.writeFileSync(path.join(OUT, "robots.txt"), "User-agent: *\nDisallow: /admin/\n");
console.log(`Site construit : ${W.length} œuvres, ${INSPI.length} inspirations, ${PROJ.length} projets, ${PLAYLIST.length} morceaux · dépôt ${depot}`);
