"use strict";
window.Research = (() => {
  const {el,link,button,resource,researchTypes} = Archive;
  function year(entry) {
    return entry.date.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/)?.[1] || "";
  }
  function citation(entry) {
    if (entry.citation.trim()) return entry.citation.trim();
    return [entry.authors,entry.title,entry.venue,entry.date,entry.meta].filter(Boolean).join(". ");
  }
  function resources(entry) {
    const group=el("div","paper-actions"), status=el("span","meta");
    status.setAttribute("role","status");
    for(const [label,url] of [["成果原文",entry.url],["代码",entry.code]]){
      if(resource(url))group.append(link(label,resource(url),"paper-action"));
    }
    const manual=el("textarea","manual-citation");
    manual.readOnly=true;manual.hidden=true;manual.rows=3;
    manual.setAttribute("aria-label","引用文本");manual.value=citation(entry);
    group.append(button("复制引用",async()=>{
      try {
        await navigator.clipboard.writeText(manual.value);
        status.textContent="已复制";manual.hidden=true;
      } catch {
        manual.hidden=false;manual.focus();manual.select();status.textContent="请选择并复制引用文本";
      }
    },"paper-action"),status,manual);
    return group;
  }
  function paper(entry,r) {
    const article=el("article","paper"), title=el("h3");
    title.append(link(entry.title,r.href("research/"+entry.id)));
    const line=el("div","paper-meta");
    if(entry.date)line.append(el("span","paper-date",entry.date));
    if(entry.type!=="other")line.append(el("span","",researchTypes[entry.type]));
    if(entry.venue)line.append(el("span","",entry.venue));
    if(line.childElementCount)article.append(line);
    article.append(title);
    if(entry.authors)article.append(el("p","paper-authors",entry.authors));
    if(entry.meta)article.append(el("p","meta",entry.meta));
    if(entry.abstract.trim()){
      const details=el("details","abstract"), summary=el("summary","","摘要");
      const text=el("div","abstract-text");Archive.paragraphs(entry.abstract,text);
      details.append(summary,text);article.append(details);
    }
    article.append(resources(entry));return article;
  }
  function catalogue(entries,r) {
    const layout=el("div","catalogue sheet");
    if(!entries.length){
      layout.append(el("h2","section-label","成果目录"),el("p","empty","尚未收录研究成果。"));return layout;
    }
    const filters=el("form","filters"), results=el("section","paper-results");
    filters.addEventListener("submit",event=>event.preventDefault());
    filters.setAttribute("aria-label","筛选研究成果");
    filters.append(el("h2","section-label","筛选成果"));
    const saved=history.state?.researchFilters || {};
    function control(label,key,options) {
      const wrap=el("label","filter-label",label);
      const input=el(options?"select":"input");
      input.name=key;
      input.setAttribute("aria-label",label);
      if(options){
        for(const [value,name] of options){
          const option=el("option","",name);option.value=value;input.append(option);
        }
      } else {input.type="search";input.placeholder="标题、作者或关键词";}
      input.value=saved[key] || "";
      if(options && input.selectedIndex<0)input.selectedIndex=0;
      wrap.append(input);filters.append(wrap);return input;
    }
    const search=control("搜索","query");
    const years=[...new Set(entries.map(year).filter(Boolean))].sort().reverse();
    const dates=control("年份","year",[["","全部年份"],...years.map(y=>[y,y])]);
    const types=Object.entries(researchTypes).filter(([t])=>entries.some(e=>e.type===t));
    const type=control("类型","type",[["","全部类型"],...types]);
    const count=el("p","result-count");count.setAttribute("role","status");
    const list=el("div","paper-list");results.append(count,list);
    const reset=button("清除筛选",()=>{
      search.value="";dates.value="";type.value="";refresh();search.focus();
    },"text-link plain");
    function refresh(){
      const needle=search.value.trim().toLocaleLowerCase();
      const filtered=entries.filter(e=>
        (!dates.value || year(e)===dates.value) && (!type.value || e.type===type.value) &&
        [e.title,e.authors,e.venue,e.meta,e.abstract,e.body].join(" ").toLocaleLowerCase().includes(needle)
      );
      const values={query:search.value,year:dates.value,type:type.value};
      history.replaceState({...history.state,researchFilters:values},"");
      count.textContent="共 "+filtered.length+" 项成果";
      reset.hidden=!Object.values(values).some(Boolean);
      list.replaceChildren(...filtered.map(e=>paper(e,r)));
      if(!filtered.length)list.append(el("p","empty","没有找到匹配的成果。"));
    }
    filters.addEventListener("input",refresh);
    filters.append(reset);layout.append(filters,results);refresh();return layout;
  }
  return {paper,resources,catalogue};
})();
