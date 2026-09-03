import {Projection} from "./projection.js";
import {activeSnapshot} from "./data.js";

export function createMapRenderer({REGIONS,EVENTS,Theme}){
  const ns="http://www.w3.org/2000/svg";
  const svg=document.getElementById("worldmap");
  const regionEls={}; const dotEls={};
  let currentYear=1000, selectedEventId=null;
  let onRegionClick=null,onEventClick=null;

  function init(regionClickHandler,eventClickHandler){
    onRegionClick=regionClickHandler; onEventClick=eventClickHandler;
    REGIONS.forEach(r=>{
      const poly=document.createElementNS(ns,"polygon");
      poly.setAttribute("class","region");
      poly.addEventListener("click",()=>onRegionClick(r.id));
      const title=document.createElementNS(ns,"title"); poly.appendChild(title); svg.appendChild(poly);
      const label=document.createElementNS(ns,"text"); label.setAttribute("class","region-label"); svg.appendChild(label);
      regionEls[r.id]={poly,label,title};
    });
    EVENTS.forEach((e,i)=>{
      const [ex,ey]=Projection.proj(e.lon,e.lat);
      const g=document.createElementNS(ns,"g");
      const dot=document.createElementNS(ns,"circle");
      dot.setAttribute("cx",ex); dot.setAttribute("cy",ey); dot.setAttribute("r",5); dot.setAttribute("class","event-dot");
      dot.addEventListener("click",evt=>{evt.stopPropagation();onEventClick(i);});
      g.appendChild(dot);
      const label=document.createElementNS(ns,"text"); label.setAttribute("x",ex+8); label.setAttribute("y",ey+3); label.setAttribute("class","event-label");
      label.textContent=e.title.length>24?e.title.slice(0,22)+"…":e.title; g.appendChild(label); svg.appendChild(g);
      dotEls[i]={dot,label};
    });
  }
  function setYear(year){currentYear=year;refresh();}
  function setSelectedEvent(i){selectedEventId=i;refresh();}
  function refresh(){
    REGIONS.forEach(r=>{
      const snap=activeSnapshot(r,currentYear), el=regionEls[r.id];
      el.poly.setAttribute("points",Projection.points(snap.geometry));
      el.poly.setAttribute("fill",Theme.colorFor(Theme.current,snap[Theme.current]));
      el.poly.setAttribute("stroke",Theme.current==="territory"?"var(--ink)":"none");
      el.title.textContent=r.name+(snap.note?" — "+snap.note:"");
      const [cx,cy]=Projection.centroid(snap.geometry); el.label.setAttribute("x",cx); el.label.setAttribute("y",cy);
      el.label.textContent=Theme.current==="territory"?r.name:snap[Theme.current];
    });
    EVENTS.forEach((e,i)=>{
      const {dot,label}=dotEls[i], visible=e.year<=currentYear;
      dot.classList.toggle("dim",!visible); label.classList.toggle("dim",!visible); dot.classList.toggle("active",i===selectedEventId);
      dot.setAttribute("r",i===selectedEventId?7:(visible&&(currentYear-e.year<=30)?6:4.5));
      dot.setAttribute("fill",Theme.colorFor(Theme.current,e[Theme.current]));
    });
  }
  return {init,setYear,setSelectedEvent,refresh,get year(){return currentYear;}};
}
