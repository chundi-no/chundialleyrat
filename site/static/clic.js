/* Son de clic de souris rétro — « clic » à l’appui, « clac » au relâchement.
   Synthétisé à la volée (Web Audio), aucun fichier son à charger. */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  var ctx = null, bruit = null;
  var VOLUME = 0.35;

  function pret() {
    if (!ctx) {
      ctx = new AC();
      // 60 ms de bruit blanc, réutilisé pour chaque clic
      var n = Math.floor(ctx.sampleRate * 0.06);
      bruit = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = bruit.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Un « tic » mécanique : transitoire de bruit filtré + petit choc grave du boîtier
  function tic(aigu, grave, force, duree) {
    var c = pret(), t = c.currentTime;

    var src = c.createBufferSource();
    src.buffer = bruit;
    var bp = c.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = aigu; bp.Q.value = 1.6;
    var g = c.createGain();
    g.gain.setValueAtTime(VOLUME * force, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + duree + 0.01);

    var osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(grave, t);
    osc.frequency.exponentialRampToValueAtTime(grave * 0.5, t + 0.03);
    var g2 = c.createGain();
    g2.gain.setValueAtTime(VOLUME * force * 0.6, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    osc.connect(g2); g2.connect(c.destination);
    osc.start(t); osc.stop(t + 0.04);
  }

  var appuye = false;
  document.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    appuye = true;
    tic(2600, 190, 1, 0.022);          // clic
  }, true);
  document.addEventListener("pointerup", function (e) {
    if (!appuye) return;
    appuye = false;
    tic(3400, 260, 0.55, 0.016);       // clac, plus léger
  }, true);
  window.addEventListener("blur", function () { appuye = false; });
})();

/* Pour celles et ceux qui ouvrent la console. */
try {
  console.log("%cVous fouillez jusque dans le code ?%c\nOn devrait bien s’entendre. Il reste quelques détails à trouver sur le site : essayez la touche / , les flèches, et cochez ce que vous connaissez.\n— Chundi",
    "font: 800 18px Archivo, sans-serif; color: #1428D8", "font: 13px Georgia, serif; color: #0B1040");
} catch (e) {}

/* Partition : la page réserve en bas exactement la hauteur de la bande,
   pour que les derniers cartels ne passent jamais dessous. */
(function () {
  if (!window.ResizeObserver) return;
  var root = document.documentElement, vue = null;
  var ro = new ResizeObserver(function () {
    root.style.setProperty("--part-h", (vue && vue.isConnected ? vue.offsetHeight : 0) + "px");
  });
  function guette() {
    var p = document.getElementById("partition");
    if (p === vue) return;
    if (vue) ro.unobserve(vue);
    vue = p;
    if (p) ro.observe(p);
    root.style.setProperty("--part-h", (p ? p.offsetHeight : 0) + "px");
  }
  new MutationObserver(guette).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", guette);
  guette();
})();

/* Bandeau : hauteur réelle exposée en --band-h (pour coller la barre de recherche dessous),
   et version compacte quand on descend dans la page, entière dès qu’on remonte. */
(function () {
  var root = document.documentElement, b = document.body, dernier = window.scrollY, band = null;
  function mesure() {
    band = band && band.isConnected ? band : document.getElementById("bandeau");
    if (band) root.style.setProperty("--band-h", band.offsetHeight + "px");
  }
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(mesure), vu = null;
    new MutationObserver(function () {
      var x = document.getElementById("bandeau");
      if (x && x !== vu) { if (vu) ro.unobserve(vu); vu = x; band = x; ro.observe(x); mesure(); }
    }).observe(root, { childList: true, subtree: true });
  }
  var pause = 0;
  window.addEventListener("scroll", function () {
    var y = window.scrollY, d = y - dernier;
    // Juste après une bascule, la page change de hauteur : on ignore ce faux défilement.
    if (Date.now() < pause) { dernier = y; return; }
    if (Math.abs(d) < 8) return;
    var avant = b.classList.contains("compact");
    if (y > 160 && d > 0) b.classList.add("compact");
    else if (d < 0 || y < 80) b.classList.remove("compact");
    if (avant !== b.classList.contains("compact")) pause = Date.now() + 350;
    dernier = y;
  }, { passive: true });
})();

/* Musique d’ambiance de secours : tant que la playlist est vide, le bouton son lance une
   nappe synthétisée (accords lents, filtre doux, quelques notes de célesta). Le choix est
   gardé d’une page à l’autre ; le navigateur exige un premier geste avant de jouer. */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var cle = "chundi-ambiance", ctx = null, sortie = null, minuterie = null, actif = false;
  function lu() { try { return localStorage.getItem(cle) === "on"; } catch (e) { return false; } }
  function ecrit(v) { try { localStorage.setItem(cle, v ? "on" : "off"); } catch (e) {} }
  var f = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
  // Fmaj7 – Em7 – Dm7 – Cmaj7, en voix serrées
  var ACCORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  var DUREE = 4.2;
  function note(freq, t, d, gain, type) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(1.2, d / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(sortie); o.start(t); o.stop(t + d + 0.05);
  }
  function cycle() {
    if (!actif) return;
    var t0 = ctx.currentTime + 0.05;
    ACCORDS.forEach(function (acc, k) {
      var t = t0 + k * DUREE;
      acc.forEach(function (n) { note(f(n), t, DUREE + 1.4, 0.05, "triangle"); note(f(n) * 1.003, t, DUREE + 1.4, 0.025, "sine"); });
      note(f(acc[0] - 12), t, DUREE + 0.6, 0.06, "sine");
      for (var i = 0; i < 3; i++) if (Math.random() < 0.7) note(f(acc[(i * 2 + k) % 4] + 24), t + 0.6 + i * 1.2 + Math.random() * 0.3, 1.6, 0.02, "sine");
    });
    minuterie = setTimeout(cycle, (ACCORDS.length * DUREE - 0.2) * 1000);
  }
  function on() {
    if (!AC) return;
    if (!ctx) {
      ctx = new AC();
      var filtre = ctx.createBiquadFilter(); filtre.type = "lowpass"; filtre.frequency.value = 1800;
      sortie = ctx.createGain(); sortie.gain.value = 0.0001;
      sortie.connect(filtre); filtre.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    if (actif) return;
    actif = true; ecrit(true);
    sortie.gain.cancelScheduledValues(ctx.currentTime);
    sortie.gain.setValueAtTime(Math.max(sortie.gain.value, 0.0001), ctx.currentTime);
    sortie.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 2);
    cycle();
  }
  function off() {
    ecrit(false);
    if (!actif) return;
    actif = false; clearTimeout(minuterie);
    if (ctx) { sortie.gain.cancelScheduledValues(ctx.currentTime); sortie.gain.setValueAtTime(sortie.gain.value, ctx.currentTime); sortie.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8); }
  }
  window.chundiAmbiance = { on: on, off: off, voulu: lu, joue: function () { return actif; } };
  // Reprise après changement de page : au premier geste, si la musique était lancée
  function reprise() {
    window.removeEventListener("pointerdown", reprise, true); window.removeEventListener("keydown", reprise, true);
    if (lu() && !actif && !document.querySelector("audio[src]:not([src=''])")) on();
  }
  window.addEventListener("pointerdown", reprise, true); window.addEventListener("keydown", reprise, true);
})();
