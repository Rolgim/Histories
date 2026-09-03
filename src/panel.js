export function createPanel({REGIONS,EVENTS,Theme,MapRenderer,activeSnapshot}){
  const panel=document.getElementById("panel"), body=document.getElementById("panel-body"), closeBtn=document.getElementById("panel-close"), backBtn=document.getElementById("panel-back"), emptyHint=document.getElementById("empty-hint");
  let lastContext=null;
  function tagsHTML(obj){return ["territory","religion","language","ethnicity"].map(k=>`<span class="tag${k===Theme.current?' tag-active':''}">${obj[k]}</span>`).join("");}
  function open(){panel.classList.add("open");emptyHint.style.display="none";}
  function close(){panel.classList.remove("open");emptyHint.style.display="block";MapRenderer.setSelectedEvent(null);}
  function showEvent(i,cameFromContext){
    const e=EVENTS[i]; if(cameFromContext) lastContext=cameFromContext;
    body.innerHTML=`<div id="panel-year">An ${e.year}</div><div id="panel-title">${e.title}</div><div id="panel-tags">${tagsHTML(e)}</div><div id="panel-desc"><p>${e.desc}</p></div>`;
    backBtn.style.display=lastContext?"block":"none"; open(); MapRenderer.setSelectedEvent(i);
  }
  function eventRowsHTML(related){return related.map(({e,i})=>`<div class="event-row ${e.year>MapRenderer.year?'future':''}" data-i="${i}"><div class="event-row-year">An ${e.year}</div><div class="event-row-title">${e.title}</div></div>`).join("")||"<p style='font-size:13px;font-style:italic;'>Aucun événement enregistré pour l'instant.</p>";}
  function wireEventRows(){body.querySelectorAll(".event-row").forEach(row=>row.addEventListener("click",()=>showEvent(parseInt(row.dataset.i,10),lastContext)));}
  function showRegion(regionId){
    lastContext={type:"region",id:regionId}; const region=REGIONS.find(r=>r.id===regionId); const snap=activeSnapshot(region,MapRenderer.year);
    const related=EVENTS.map((e,i)=>({e,i})).filter(x=>x.e.regionId===regionId).sort((a,b)=>a.e.year-b.e.year);
    body.innerHTML=`<div id="panel-year">${snap.territory}</div><div id="panel-title">${region.name}</div><div id="panel-tags">${tagsHTML(snap)}</div>${snap.note?`<div id="panel-desc" style="margin-bottom:14px;"><p><em>${snap.note}</em></p></div>`:""}<div style="font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);margin:6px 0 4px;">Événements liés</div>${eventRowsHTML(related)}`;
    wireEventRows(); backBtn.style.display="none"; open(); MapRenderer.setSelectedEvent(null);
  }
  function showGroup(mode,value){
    lastContext={type:"group",mode,value}; const year=MapRenderer.year; const memberRegions=REGIONS.filter(r=>activeSnapshot(r,year)[mode]===value);
    const related=EVENTS.map((e,i)=>({e,i})).filter(x=>x.e[mode]===value).sort((a,b)=>a.e.year-b.e.year); const modeLabel=Theme.MODES.find(m=>m.key===mode).label;
    body.innerHTML=`<div id="panel-year">${modeLabel}</div><div id="panel-title">${value}</div><div id="panel-tags">${memberRegions.map(r=>`<span class="tag">${r.name}</span>`).join("")}</div><div id="panel-desc" style="margin-bottom:14px;"><p>${memberRegions.length} zone${memberRegions.length>1?'s':''} actuellement associée${memberRegions.length>1?'s':''} à « ${value} », en l'an ${year}.</p></div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);margin:6px 0 4px;">Événements liés</div>${eventRowsHTML(related)}`;
    wireEventRows(); backBtn.style.display="none"; open(); MapRenderer.setSelectedEvent(null);
  }
  function showRegionOrGroup(regionId){if(Theme.current==="territory")showRegion(regionId);else{const region=REGIONS.find(r=>r.id===regionId);showGroup(Theme.current,activeSnapshot(region,MapRenderer.year)[Theme.current]);}}
  closeBtn.addEventListener("click",close);
  backBtn.addEventListener("click",()=>{if(!lastContext)return;if(lastContext.type==="region")showRegion(lastContext.id);else showGroup(lastContext.mode,lastContext.value);});
  return {showEvent,showRegion,showGroup,showRegionOrGroup,close,refreshOpenPanel:()=>{if(!panel.classList.contains("open")||!lastContext)return;if(lastContext.type==="region")showRegion(lastContext.id);else showGroup(lastContext.mode,lastContext.value);}};
}
