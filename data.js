"use strict";
window.Archive = (() => {
  const storageKey = "academic-archive:draft:v1:" + location.pathname;
  const kinds = { research: "研究成果", notes: "学术笔记", education: "教育经历", experience: "科研与工作经历" };
  const sections = { research: "研究成果", notes: "学术笔记", cv: "学术简历" };
  const researchTypes = { other:"其他成果", journal:"期刊论文", conference:"会议论文", preprint:"预印本", project:"科研项目" };
  function el(tag, cls, value) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function link(text, href, cls) {
    const node = el("a", cls, text);
    node.href = href;
    return node;
  }
  function button(text, action, cls) {
    const node = el("button", cls, text);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }
  function textFields(obj, keys) {
    return Object.fromEntries(keys.map(key => [key, typeof obj?.[key] === "string" ? obj[key] : ""]));
  }
  function clean(raw) {
    const profile = textFields(raw?.profile, ["name","headline","bio","email","pdf","affiliation","interests","scholar","github"]);
    const seen = new Set();
    const entries = [];
    for (const item of Array.isArray(raw?.entries) ? raw.entries : []) {
      if (!item || !Object.hasOwn(kinds,item.kind) || typeof item.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      const record=textFields(item, ["id","kind","title","date","meta","body","url","images","authors","venue","abstract","code","citation"]);
      record.type=Object.hasOwn(researchTypes,item.type)?item.type:"other";
      record.featured=item.featured==="yes"?"yes":"no";
      record.visibility=item.visibility==="draft"?"draft":"public";
      entries.push(record);
    }
    return {profile, entries};
  }
  function publicData() { return clean(window.ARCHIVE_CONTENT); }
  function draft() {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return publicData();
    const raw = JSON.parse(saved);
    if (!raw?.profile || !Array.isArray(raw.entries)) throw Error("草稿格式无法识别");
    return clean(raw);
  }
  function save(data) {
    const previous=JSON.parse(localStorage.getItem(storageKey) || "null");
    const retired=(previous?.entries || []).filter(entry=>entry?.kind==="photos");
    localStorage.setItem(storageKey,JSON.stringify({...data,entries:[...data.entries,...retired]}));
  }
  function resource(value) {
    const s = (value || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) {
      try { return new URL(s).href; } catch { return ""; }
    }
    if (/^assets\/(?!\/)/.test(s) && !/(?:^|\/)\.\.(?:\/|$)|[\\%?#]/.test(s)) return s;
    return "";
  }
  function pictures(entry) {
    return entry.images.split(/\r?\n/).map(line => {
      const [src, ...caption] = line.split("|");
      return {src:resource(src), caption:caption.join("|").trim()};
    }).filter(pic => pic.src);
  }
  function paragraphs(text, node) {
    for (const part of text.trim().split(/\n\s*\n/)) if (part) node.append(el("p","paragraph",part));
  }
  return { kinds,sections,researchTypes,el,link,button,clean,publicData,draft,save,resource,pictures,paragraphs };
})();
