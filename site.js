"use strict";
(() => {
  const {el,link,button,sections,kinds,paragraphs,resource,pictures} = Archive;
  const main = document.querySelector("main");
  const menu = document.querySelector(".menu-button");
  const nav = document.querySelector("#primary-nav");
  const dialog = document.querySelector("#viewer");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let album = [], photo = 0, request = 0, transition, observer, activeKey;
  const positions = new Map();
  history.scrollRestoration = "manual";
  function route() {
    const parts = location.hash.slice(1).split("/").filter(Boolean);
    const preview = parts[0] === "preview";
    if (preview) parts.shift();
    const [section = "home", id] = parts;
    return {section,id,preview, invalid:parts.length > 2, href:path => "#" + (preview ? "/preview" : "") + "/" + path};
  }
  function closeMenu() {
    nav.classList.remove("open");
    menu.setAttribute("aria-expanded","false");
  }
  menu.onclick = () => menu.setAttribute("aria-expanded",String(nav.classList.toggle("open")));
  nav.addEventListener("click",closeMenu);
  document.addEventListener("keydown",event => {
    if (event.key === "Escape" && nav.classList.contains("open")) {closeMenu();menu.focus();}
  });
  document.querySelector(".skip").onclick = event => {event.preventDefault();main.focus();};
  function displayPhoto(next) {
    photo = (next + album.length) % album.length;
    const pic = album[photo];
    const img = dialog.querySelector("img");
    img.src = pic.src; img.alt = pic.caption || "研究配图 " + (photo+1);
    dialog.querySelector("#viewer-count").textContent = (photo+1) + " / " + album.length;
    dialog.querySelector("#viewer-caption").textContent = pic.caption || img.alt;
    for (const b of dialog.querySelectorAll('[data-action="prev"],[data-action="next"]')) b.disabled = album.length < 2;
  }
  dialog.querySelector('[data-action="close"]').onclick = () => dialog.close();
  dialog.querySelector('[data-action="prev"]').onclick = () => displayPhoto(photo-1);
  dialog.querySelector('[data-action="next"]').onclick = () => displayPhoto(photo+1);
  dialog.addEventListener("keydown",event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();displayPhoto(photo + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  dialog.addEventListener("click",event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  const empty = text => el("p","empty",text);
  function titleBlock(title, sub) {
    const h = el("header","sheet-head"); h.append(el("h1","",title));
    if (sub) h.append(el("p","intro",sub));
    return h;
  }
  function row(title, url, description, date) {
    const a = link("",url,"index-row"), info = el("div","row-info");
    const line = el("div"); line.append(el("span","row-title",title));info.append(line);
    if (description) info.append(el("span","meta",description));
    a.append(info);
    if (date) a.append(el("span","meta row-date",date));
    return a;
  }
  function entryList(entries,r) {
    const list = el("div");
    for (const e of entries) list.append(row(e.title,r.href(e.kind+"/"+e.id),e.meta,e.date));
    return list;
  }
  function home(data,r) {
    const profile=data.profile, layout=el("div","home-layout");
    const identity=el("header","identity"), reading=el("div","home-reading");
    identity.append(el("h1","",profile.name || "学术档案"));
    if(profile.affiliation)identity.append(el("p","affiliation",profile.affiliation));
    if(profile.headline)identity.append(el("p","research-focus",profile.headline));
    if(profile.bio)paragraphs(profile.bio,identity);
    const interests=profile.interests.split(/[,，、;；\n]+/).map(s=>s.trim()).filter(Boolean);
    if(interests.length){
      const group=el("ul","interests");group.setAttribute("aria-label","研究兴趣");
      for(const interest of interests)group.append(el("li","",interest));identity.append(group);
    }
    const actions=el("div","profile-links");
    actions.append(link("查看简历",r.href("cv"),"primary-link"));
    for(const [label,url] of [["Google Scholar",profile.scholar],["GitHub",profile.github]]){
      if(resource(url))actions.append(link(label,resource(url),"text-link"));
    }
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))actions.append(link("邮件联系","mailto:"+profile.email,"text-link"));
    identity.append(actions);
    const featured=data.entries.filter(e=>e.kind==="research" && e.featured==="yes");
    if(featured.length){
      const selected=el("section","home-featured"), heading=el("div","shelf-title");
      heading.append(el("h2","","代表成果"),link("全部成果",r.href("research"),"text-link"));
      selected.append(heading,...featured.map(e=>Research.paper(e,r)));reading.append(selected);
    }
    const activity=data.entries.filter(e=>e.kind==="education" || e.kind==="experience").slice(0,3);
    if(!featured.length && !activity.length){
      const contents=el("section","home-directory");
      contents.append(el("h2","directory-title","内容索引"));
      for(const [key,title,description] of [
        ["research","研究成果","论文、项目与引用资料"],
        ["cv","学术简历","教育背景与科研经历"],
        ["notes","学术笔记","文献阅读、研究方法与推导"]
      ])contents.append(row(title,r.href(key),description));
      reading.append(contents);
    }
    if(activity.length){
      const history=el("section","home-history"),heading=el("div","shelf-title");
      heading.append(el("h2","","学术经历"),link("完整简历",r.href("cv"),"text-link"));
      history.append(heading);
      for(const item of activity){
        const line=el("div","milestone");
        if(item.date)line.append(el("span","meta",item.date));line.append(el("h3","",item.title));
        history.append(line);
      }
      reading.append(history);
    }
    const notes=data.entries.filter(e=>e.kind==="notes").slice(0,2);
    if(notes.length){
      const recent=el("section","home-history"), heading=el("div","shelf-title");
      heading.append(el("h2","","近期笔记"),link("全部笔记",r.href("notes"),"text-link"));
      recent.append(heading,entryList(notes,r));reading.append(recent);
    }
    layout.append(identity,reading);main.append(layout);
  }
  const descriptions = {research:"尚未收录研究成果。",notes:"尚未收录学术笔记。"};
  function collection(data,r) {
    const items=data.entries.filter(e=>e.kind===r.section);
    main.append(titleBlock(kinds[r.section]));
    if(r.section==="research"){main.append(Research.catalogue(items,r));return;}
    const section=el("section","sheet spread");
    section.append(el("h2","section-label","笔记目录"),
      items.length ? entryList(items,r) : empty(descriptions[r.section]));
    main.append(section);
  }
  function gallery(entry) {
    const images=pictures(entry), grid=el("div","gallery-grid");
    images.forEach((pic,i)=>{
      const fig=el("figure"), open=button("",()=>{
        album=images; displayPhoto(i);dialog.showModal();
        if(!reduced.matches) dialog.animate([{opacity:0,transform:"scale(.985)"},{opacity:1,transform:"scale(1)"}],{duration:180});
      });
      const label=pic.caption || entry.title+" · 第 "+(i+1)+" 张";
      open.setAttribute("aria-label","放大查看 "+label);
      const img=el("img"); img.alt=label; img.loading="lazy"; img.src=pic.src;
      open.append(img);fig.append(open);
      if(pic.caption)fig.append(el("figcaption","",pic.caption));grid.append(fig);
    });
    return grid;
  }
  function detail(data,r,entry) {
    const siblings=data.entries.filter(e=>e.kind===r.section);
    const next=siblings[siblings.indexOf(entry)+1], back=el("nav","detail-nav");
    back.setAttribute("aria-label","文章导航");back.append(link("返回"+kinds[r.section],r.href(r.section)));
    if(next)back.append(link("下一篇",r.href(r.section+"/"+next.id)));
    main.append(back,titleBlock(entry.title));
    const spread=el("div","detail sheet"),body=el("article","article-body"), aside=el("aside");
    if(r.section==="research" && entry.abstract){
      const summary=el("section","detail-abstract");summary.append(el("h2","section-label","摘要"));
      paragraphs(entry.abstract,summary);body.append(summary);
    }
    paragraphs(entry.body,body);body.append(gallery(entry));
    const kind=r.section==="research" && entry.type!=="other"?Archive.researchTypes[entry.type]:kinds[r.section];
    aside.append(el("h2","section-label","档案信息"),el("p","aside-value",kind));
    const fields=[["时间",entry.date],["说明",entry.meta]];
    if(r.section==="research")fields.unshift(["作者",entry.authors],["出处",entry.venue]);
    for(const [name,value] of fields) {
      if(value)aside.append(el("div","meta",name),el("p","aside-value",value));
    }
    if(r.section==="research")aside.append(Research.resources(entry));
    else if(resource(entry.url))aside.append(link("查看相关资料",resource(entry.url),"underlink"));
    spread.append(body,aside);main.append(spread);
  }
  function cv(data,r) {
    const p=data.profile,h=titleBlock(p.name ? p.name+" · 学术简历":"学术简历",p.headline);
    const actions=el("div","actions no-print");
    actions.append(button("打印 / 存为 PDF",()=>window.print(),"btn"));
    if(resource(p.pdf))actions.append(link("打开简历 PDF",resource(p.pdf),"text-link"));
    h.append(actions);main.append(h);
    const layout=el("div","sheet detail"),body=el("article"),aside=el("aside");
    if(p.bio)paragraphs(p.bio,body);
    for(const kind of ["education","experience","research"]){
      const entries=data.entries.filter(e=>e.kind===kind);
      if(!entries.length)continue;
      const block=el("section","cv-section");block.append(el("h2","",kinds[kind]));
      for(const entry of entries) {
        const item=el("div",kind==="research"?"cv-item":"cv-item timeline-item"),title=el("h3");
        if(kind==="research")title.append(link(entry.title,r.href("research/"+entry.id),"underlink"));
        else title.textContent=entry.title;
        item.append(title);
        const info=[entry.date,kind==="research"?entry.venue:"",entry.meta].filter(Boolean);
        if(info.length)item.append(el("p","meta",info.join(" · ")));
        if(kind!=="research")paragraphs(entry.body,item);block.append(item);
      }
      body.append(block);
    }
    if(!body.childElementCount)body.append(empty("个人简介与履历待补充。"));
    if(p.affiliation)aside.append(el("h2","section-label","机构"),el("p","aside-value",p.affiliation));
    aside.append(el("h2","section-label","联系"));
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))aside.append(link(p.email,"mailto:"+p.email,"underlink aside-value"));
    else aside.append(empty("尚未提供联系方式。"));
    layout.append(body,aside);main.append(layout);
  }
  function notFound(r) { main.append(titleBlock("找不到这份档案"),link("返回首页",r.href(""),"underlink")); }
  function render(r) {
    let data=Archive.publicData(), error="";
    if(r.preview) try { data=Archive.draft(); } catch { error="无法读取本机草稿。请返回工作台检查浏览器存储。"; }
    data.entries=data.entries.filter(e=>e.title.trim() && (r.preview || e.visibility!=="draft"));
    main.replaceChildren();closeMenu();if(dialog.open)dialog.close();
    const brand=document.querySelector(".brand");
    brand.textContent=data.profile.name || "学术主页";brand.href=r.href("");
    document.querySelector("#signature").textContent=data.profile.name || "个人学术档案";
    document.querySelector("#preview-bar").hidden=!r.preview;
    nav.replaceChildren();
    for(const [key,label] of Object.entries({home:"首页",...sections})){
      const a=link(label,r.href(key==="home"?"":key));
      if(r.section===key)a.setAttribute("aria-current",r.id?"location":"page");
      nav.append(a);
    }
    if(error) main.append(titleBlock("草稿预览"),empty(error));
    else if(r.invalid)notFound(r);
    else if(r.id && ["research","notes"].includes(r.section)){
      const entry=data.entries.find(e=>e.id===r.id && e.kind===r.section);
      if(entry)detail(data,r,entry);else notFound(r);
    } else if(r.id)notFound(r);
    else if(r.section==="home")home(data,r);
    else if(Object.hasOwn(descriptions,r.section))collection(data,r);
    else if(r.section==="cv")cv(data,r);
    else if(r.section==="studio"&&!r.preview)window.renderStudio(main,titleBlock);
    else notFound(r);
    document.title=(main.querySelector("h1")?.textContent || "首页")+" | "+(data.profile.name || "个人学术档案");
  }
  function observeRows() {
    observer?.disconnect();
    if(reduced.matches||!window.IntersectionObserver)return;
    observer=new IntersectionObserver(entries=>{
      for(const {isIntersecting,target} of entries) if(isIntersecting){
        observer.unobserve(target);
        if(!reduced.matches)target.animate([{transform:"translateY(8px)",opacity:.62},{transform:"none",opacity:1}],{duration:330,easing:"ease-out"});
      }
    });
    for(const row of main.querySelectorAll(".index-row,.paper,.cv-section,figure"))observer.observe(row);
  }
  async function navigate(initial=false) {
    const token=++request;
    transition?.cancel();
    if(activeKey)positions.set(activeKey,window.scrollY);
    if(!initial && !reduced.matches){
      transition=main.animate([{opacity:1},{opacity:0,transform:"translateY(-4px)"}],{duration:110,fill:"forwards"});
      try{await transition.finished;}catch{return;}
    }
    if(token!==request)return;
    transition?.cancel();render(route());
    activeKey=history.state?.archiveKey || Math.random().toString(36).slice(2);
    history.replaceState({...history.state,archiveKey:activeKey},"");
    if(!initial)main.focus({preventScroll:true});
    window.scrollTo({top:positions.get(activeKey)||0,behavior:"instant"});
    if(!reduced.matches){
      transition=main.animate([{opacity:.14,transform:"translateY(9px)"},{opacity:1,transform:"none"}],{duration:300,easing:"cubic-bezier(.2,.7,.25,1)"});
    }
    observeRows();
  }
  window.addEventListener("hashchange",()=>navigate());
  window.addEventListener("storage",()=>{if(route().preview && !dialog.open)navigate(true);});
  navigate(true);
})();
