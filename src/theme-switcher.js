import { escapeHtml } from "./utils.js";

export function createThemeSwitcher({REGIONS,EVENTS,Theme,MapRenderer,activeSnapshot,Panel}){
  const modeRow=document.getElementById("mode-row"), legendRow=document.getElementById("legend-row"), chips={};

  function renderLegend(){
    const year=MapRenderer.year;

    // Entités politiques : la légende vient du GeoJSON historique
    if (Theme.current === "territory") {
      const active = MapRenderer.getHistoricalLegend(); // active est maintenant un tableau de {value, color}

      legendRow.innerHTML = "";
      active.forEach(({ value, color }) => {
        const s = document.createElement("div");
        s.className = "swatch";
        s.innerHTML = `<i style="background:${color}"></i>${escapeHtml(value)}`;
        legendRow.appendChild(s);
      });

      return;
    }

    // Religion / langue / ethnie : logique actuelle
    const active=new Set();
    REGIONS.forEach(r=>active.add(activeSnapshot(r,year)[Theme.current]));
    EVENTS
      .filter(e=>e.year<=year)
      .forEach(e=>active.add(e[Theme.current]));

    legendRow.innerHTML="";
    Theme.categories[Theme.current]
      .filter(v=>active.has(v))
      .forEach(val=>{
        const s=document.createElement("div");
        s.className="swatch";
        s.innerHTML=`<i style="background:${Theme.colorFor(Theme.current,val)}"></i>${val}`;
        legendRow.appendChild(s);
      });
  }

  function init(){
    Theme.MODES.forEach(m=>{
      const chip=document.createElement("button");
      chip.className="chip"+(m.key===Theme.current?" active":"");
      chip.textContent=m.label;

      chip.addEventListener("click",()=>{
        Theme.current=m.key;
        Object.values(chips).forEach(c=>c.classList.remove("active"));
        chip.classList.add("active");
        renderLegend();
        MapRenderer.refresh();
        Panel.refreshOpenPanel();
      });

      modeRow.appendChild(chip);
      chips[m.key]=chip;
    });

    renderLegend();
  }

  return {init,renderLegend};
}