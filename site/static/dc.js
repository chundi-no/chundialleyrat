/* Moteur des pages du site : lit le gabarit <x-dc> d'une page et le rend avec React.
   Holes {{chemin}}, <sc-for list as>, <sc-if value>, événements onClick…, styles en ligne. */
(function () {
  "use strict";
  var h = React.createElement;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g, WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var EVT = { onclick: "onClick", onchange: "onChange", oninput: "onChange", onkeydown: "onKeyDown", onkeyup: "onKeyUp", onsubmit: "onSubmit",
    onblur: "onBlur", onfocus: "onFocus", onmouseenter: "onMouseEnter", onmouseleave: "onMouseLeave", onscroll: "onScroll", onended: "onEnded",
    onplay: "onPlay", onpause: "onPause", ontimeupdate: "onTimeUpdate", onpointerdown: "onPointerDown", onload: "onLoad", onerror: "onError" };
  var ATTR = { "class": "className", "for": "htmlFor", tabindex: "tabIndex", readonly: "readOnly", maxlength: "maxLength", colspan: "colSpan",
    rowspan: "rowSpan", autocomplete: "autoComplete", autofocus: "autoFocus", inputmode: "inputMode", spellcheck: "spellCheck", novalidate: "noValidate",
    crossorigin: "crossOrigin", allowfullscreen: "allowFullScreen", frameborder: "frameBorder", defaultvalue: "defaultValue", defaultchecked: "defaultChecked",
    viewbox: "viewBox", preserveaspectratio: "preserveAspectRatio", "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin", "stroke-dasharray": "strokeDasharray", "fill-rule": "fillRule", "clip-rule": "clipRule", "clip-path": "clipPath",
    srcset: "srcSet", enctype: "encType", playsinline: "playsInline", contenteditable: "contentEditable", "accept-charset": "acceptCharset" };
  var BOOL = { disabled: 1, hidden: 1, checked: 1, loop: 1, readOnly: 1, required: 1, multiple: 1, controls: 1, autoPlay: 1, muted: 1, selected: 1, open: 1, playsInline: 1, autoFocus: 1, noValidate: 1, allowFullScreen: 1 };
  function look(path, sc) {
    if (path === "true") return true; if (path === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var v = sc, parts = path.split(".");
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(s, sc) { return s.replace(HOLE, function (_, p) { var v = look(p, sc); return v == null ? "" : String(v); }); }
  function styleObj(str) {
    var out = {}, imp = {}, depth = 0, cur = "", parts = [];
    for (var i = 0; i < str.length; i++) { var c = str[i]; if (c === "(") depth++; if (c === ")") depth--; if (c === ";" && depth === 0) { parts.push(cur); cur = ""; } else cur += c; }
    parts.push(cur);
    parts.forEach(function (d) {
      var k = d.indexOf(":"); if (k < 0) return;
      var prop = d.slice(0, k).trim(), val = d.slice(k + 1).trim(); if (!prop || !val) return;
      var important = /!\s*important\s*$/.test(val); val = val.replace(/!\s*important\s*$/, "").trim();
      var key = prop.indexOf("--") === 0 ? prop : prop.toLowerCase().replace(/^-ms-/, "ms-").replace(/-([a-z])/g, function (_, l) { return l.toUpperCase(); });
      if (imp[key] && !important) return;
      if (important) imp[key] = 1;
      // une propriété raccourcie écrite après une propriété « importante » ne doit pas l'écraser
      if (!important) { for (var kk in imp) if (kk.indexOf(key) === 0 && kk !== key) { out[key] = val; var keep = out[kk]; delete out[kk]; out[kk] = keep; return; } }
      if (key in out) delete out[key];
      out[key] = val;
    });
    return out;
  }
  function kids(node, sc, keyBase) {
    var list = node.content ? node.content.childNodes : node.childNodes, out = [];
    for (var i = 0; i < list.length; i++) { var r = rend(list[i], sc, keyBase + "." + i); if (r !== null && r !== undefined && r !== "") out.push(r); }
    return out;
  }
  function rend(n, sc, key) {
    if (n.nodeType === 3) { var t = n.nodeValue; if (!/\S/.test(t)) return t.indexOf("\n") >= 0 ? null : " "; return interp(t, sc); }
    if (n.nodeType !== 1) return null;
    var tag = n.localName;
    if (tag === "template" && n.hasAttribute("data-sc-for")) {
      var m = WHOLE.exec(n.getAttribute("list") || ""), list = (m && look(m[1], sc)) || [], as = n.getAttribute("as") || "item";
      return list.map(function (it, i) { var s2 = Object.assign({}, sc); s2[as] = it; s2.$index = i; return h(React.Fragment, { key: key + ":" + i }, kids(n, s2, key + ":" + i)); });
    }
    if (tag === "template" && n.hasAttribute("data-sc-if")) {
      var mv = WHOLE.exec(n.getAttribute("value") || "");
      return mv && look(mv[1], sc) ? h(React.Fragment, { key: key }, kids(n, sc, key)) : null;
    }
    var props = { key: key };
    for (var a = 0; a < n.attributes.length; a++) {
      var at = n.attributes[a], name = at.name, raw = at.value;
      if (name.indexOf("hint-") === 0) continue;
      var whole = WHOLE.exec(raw);
      if (EVT[name]) { var f = whole && look(whole[1], sc); if (typeof f === "function") props[EVT[name]] = f; continue; }
      var pname = ATTR[name] || name;
      if (pname === "style") { props.style = styleObj(interp(raw, sc)); continue; }
      var val = whole ? look(whole[1], sc) : interp(raw, sc);
      if (BOOL[pname]) { if (whole) { if (val) props[pname] = true; } else props[pname] = true; continue; }
      if (val === undefined || val === null || val === false && pname.indexOf("aria-") !== 0) continue;
      if ((pname === "value" || pname === "checked") && !whole) { props[pname === "value" ? "defaultValue" : "defaultChecked"] = val; continue; }
      props[pname] = typeof val === "boolean" ? String(val) : val;
    }
    if (("value" in props || "checked" in props) && !props.onChange) props.readOnly = props.readOnly || ("value" in props && tag !== "select" && !props.onChange);
    if (tag === "select" && "value" in props && !props.onChange) { props.defaultValue = props.value; delete props.value; delete props.readOnly; }
    var c = kids(n, sc, key);
    if (tag === "textarea") { if (!("value" in props) && c.length) props.defaultValue = c.join(""); return h(tag, props); }
    return h.apply(null, [tag, props].concat(c));
  }
  window.DCLogic = class extends React.Component {
    constructor(props) { super(props); this.state = {}; }
    render() { return h(React.Fragment, null, kids(window.__DC_TPL, this.renderVals() || {}, "r")); }
  };
  window.DCMonter = function (Component, props) {
    var src = document.getElementById("dc-template").textContent;
    src = src.replace(/<sc-for\b/g, "<template data-sc-for").replace(/<\/sc-for>/g, "</template>")
             .replace(/<sc-if\b/g, "<template data-sc-if").replace(/<\/sc-if>/g, "</template>");
    var doc = new DOMParser().parseFromString("<!doctype html><body>" + src, "text/html");
    window.__DC_TPL = doc.body;
    var root = ReactDOM.createRoot(document.getElementById("racine"));
    root.render(h(Component, props || {}));
  };
})();
