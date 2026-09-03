import {Projection} from "./projection.js";
import {activeSnapshot} from "./data.js";

export function createMapRenderer({REGIONS,EVENTS,Theme}){
  const ns="http://www.w3.org/2000/svg";
  const svg=document.getElementById("worldmap");
  const regionEls={}; const dotEls={};
  let currentYear=1000, selectedEventId=null;
  let onRegionClick=null,onEventClick=null;
  // zoom
  let zoomLevel = 1; // Niveau de zoom (1 = 100%)
  let isDragging = false;
  let startPoint = { x: 0, y: 0 };
  let offset = { x: 0, y: 0 };
  let isDraggable = true; // Variable pour activer/désactiver le drag

  // Appliquer le zoom et le décalage à la carte
  function applyTransform() {
    svg.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${zoomLevel})`;
  }

  // Zoom molette 
  svg.addEventListener("wheel", (evt) => {
    evt.preventDefault();
    const delta = evt.deltaY > 1.1 ? -0.1 : 1; // Delta pour le zoom
    const newZoom = zoomLevel + delta;

    // Limiter le zoom (entre 1 et 5)
    if (newZoom >= 1 && newZoom <= 5) {
      zoomLevel = newZoom;

      // Ajuster le décalage pour zoomer vers le curseur
      const rect = svg.getBoundingClientRect();
      const mouseX = evt.clientX - rect.left;
      const mouseY = evt.clientY - rect.top;

      // Calculer le nouveau décalage pour centrer le zoom sur le curseur
      offset.x = mouseX - (mouseX - offset.x) * (zoomLevel / (zoomLevel + delta));
      offset.y = mouseY - (mouseY - offset.y) * (zoomLevel / (zoomLevel + delta));

      applyTransform();
    }
  });

  // Déplacement de la carte (drag)
  svg.addEventListener("mousedown", (evt) => {
    if (evt.button === 0) { // Clic gauche
      isDragging = true;
      startPoint = { x: evt.clientX - offset.x, y: evt.clientY - offset.y };
      svg.style.cursor = "grabbing";
    }
  });

  window.addEventListener("mousemove", (evt) => {
    if (isDragging) {
      offset.x = evt.clientX - startPoint.x;
      offset.y = evt.clientY - startPoint.y;
      applyTransform();
    }
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    svg.style.cursor = "grab";
  });

  document.getElementById("zoom-in").addEventListener("click", () => {
    zoomLevel = Math.min(zoomLevel + 0.5, 5); // Limite max à 5x
    applyTransform();
  });

  document.getElementById("zoom-out").addEventListener("click", () => {
    zoomLevel = Math.max(zoomLevel - 0.5, 1); // Limite min à 1x 
    applyTransform();
  });

  document.getElementById("zoom-reset").addEventListener("click", () => {
    zoomLevel = 1;
    offset = { x: 0, y: 0 };
    applyTransform();
  });

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

