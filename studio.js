"use strict";
window.renderStudio = (main,titleBlock) => {
  const {el,link,button,kinds} = Archive;
  main.append(titleBlock("创作工作台"));
  const toolbar=el("div","toolbar"), actions=el("div","toolbar-group"), status=el("p","status");
  status.setAttribute("role","status");
  const layout=el("div","studio-layout sheet"),sidebar=el("aside"),editor=el("section");
  sidebar.setAttribute("aria-label","草稿目录");
  let data, selected="profile";
  try { data=Archive.draft(); }
  catch { main.append(el("p","empty","无法读取本机草稿。请启用浏览器的本地存储，或使用本地服务器打开网站。"));return; }
  function commit(change) {
    try {
      const next=Archive.draft();
      change(next);Archive.save(next);data=next;status.textContent="已保存到此浏览器。";return true;
    } catch {
      status.textContent="保存失败。请检查浏览器存储后重试，或先复制正在编辑的文字。";return false;
    }
  }
  function download() {
    let latest;
    try {latest=Archive.draft();} catch {status.textContent="读取草稿失败，未导出。";return;}
    const publicCopy={profile:latest.profile,entries:latest.entries.filter(e=>e.title.trim() && e.visibility !== "draft")};
    const blob=new Blob(["window.ARCHIVE_CONTENT = ",JSON.stringify(publicCopy,null,2),";\n"],{type:"text/javascript;charset=utf-8"});
    const url=URL.createObjectURL(blob), a=link("下载内容文件",url);
    a.download="content.js";document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),15000);
    status.textContent="已导出公开内容。用下载的 content.js 替换项目中的同名文件即可更新正式页面。";
  }
  actions.append(link("预览草稿","#/preview/","btn"),button("导出公开内容",download,"btn"));
  toolbar.append(actions,status);layout.append(sidebar,editor);
  main.append(toolbar,layout);
  function drawSidebar() {
    sidebar.replaceChildren();
    function pick(id,label) {
      const b=button(label,()=>{selected=id;drawSidebar();drawEditor();},"record");
      if(selected===id)b.setAttribute("aria-current","true");sidebar.append(b);
    }
    pick("profile","个人资料");
    for(const e of data.entries)pick(e.id,(e.title || "未命名条目")+" · "+kinds[e.kind]);
    sidebar.append(button("新建条目",()=>{
      const id="entry-"+(globalThis.crypto?.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2)));
      const entry={id,kind:"research",title:"",date:"",meta:"",body:"",url:"",images:"",visibility:"draft"};
      if(!commit(next=>next.entries.unshift(entry)))return;
      selected=id;drawSidebar();drawEditor();editor.querySelector('[name="title"]').focus();
    },"btn"));
  }
  function drawEditor() {
    editor.replaceChildren();
    const profile=selected==="profile",record=profile?data.profile:data.entries.find(e=>e.id===selected);
    if(!record)return;
    editor.append(el("h2","",profile?"个人资料":kinds[record.kind]));
    editor.append(el("p","hint",profile?"修改会自动保存在当前浏览器。预览满意后，可导出内容文件。":"草稿只在本机预览。选择「纳入公开内容」后，该条目才会随文件导出。"));
    function field(key,label,{lines=0,options,hint}={}) {
      const wrapper=el("label","",label);
      const input=el(options?"select":lines?"textarea":"input");
      input.name=key;
      input.setAttribute("aria-label",label);
      if(lines)input.rows=lines;
      if(options)for(const [value,text] of Object.entries(options)){
        const option=el("option","",text);option.value=value;input.append(option);
      }
      input.value=record[key] || "";
      wrapper.append(input);if(hint)wrapper.append(el("small","hint",hint));editor.append(wrapper);
      input.addEventListener("input",()=>{
        const ok=commit(next=>{
          const target=profile?next.profile:next.entries.find(e=>e.id===selected);
          if(!target)throw Error("条目已移除");
          target[key]=input.value;
        });
        if(ok && (key==="title"||key==="kind")){
          drawSidebar();
          if(key==="kind")drawEditor();
        }
      });
    }
    if(profile){
      field("name","姓名或署名");field("affiliation","所在机构或院系");field("headline","一句话研究方向");
      field("interests","研究兴趣",{hint:"多个方向用逗号分隔。"});field("bio","个人简介",{lines:4});
      field("scholar","Google Scholar 主页");field("github","GitHub 主页");
      field("email","联系邮箱");field("pdf","简历 PDF",{hint:"填写 https 链接或项目内路径，例如 assets/cv.pdf。"});
    } else {
      field("kind","条目类型",{options:kinds});field("title","标题");
      field("date","日期或时间段");
      if(record.kind==="research"){
        field("type","成果类型",{options:Archive.researchTypes});
        field("authors","作者");field("venue","期刊、会议或平台");
        field("featured","首页展示",{options:{no:"仅收入成果目录",yes:"选为首页代表作"}});
        field("abstract","摘要",{lines:3});field("code","代码仓库链接");
        field("citation","引用文本或 BibTeX",{lines:3,hint:"可粘贴出版方提供的引用；留空时使用作者、标题、出处和日期生成文本引用。"});
      }
      field("meta","副标题或简短说明");
      field("body",record.kind==="research"?"研究问题、贡献与结果":"正文",{lines:7,hint:"空一行即可开始新段落。"});
      if(["research","notes"].includes(record.kind)){
        field("url","论文、演示或相关资料链接");
        field("images","研究配图与图注",{lines:3,hint:"每行一张，例如 assets/figure-1.png | 实验结果。也支持 https 图片链接。"});
      }
      field("visibility","导出设置",{options:{draft:"保留为草稿",public:"纳入公开内容"}});
      editor.append(button("删除此条目",()=>{
        if(!window.confirm("删除当前浏览器中的这条记录？"))return;
        if(!commit(next=>{next.entries=next.entries.filter(e=>e.id!==selected);}))return;
        selected="profile";drawSidebar();drawEditor();
      },"btn"));
    }
  }
  drawSidebar();drawEditor();
};
