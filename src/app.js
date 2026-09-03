import {loadData} from "./data.js";
import {createTheme} from "./theme.js";
import {createMapRenderer} from "./map.js";
import {createPanel} from "./panel.js";
import {createTimeline} from "./timeline.js";
import {createThemeSwitcher} from "./theme-switcher.js";

async function main(){
  const {REGIONS,EVENTS}=await loadData();
  const Theme=createTheme(REGIONS,EVENTS);
  let Panel,ThemeSwitcher;
  const MapRenderer=createMapRenderer({REGIONS,EVENTS,Theme});
  Panel=createPanel({REGIONS,EVENTS,Theme,MapRenderer,activeSnapshot});
  ThemeSwitcher=createThemeSwitcher({REGIONS,EVENTS,Theme,MapRenderer,activeSnapshot,Panel});
  const Timeline=createTimeline({MapRenderer,ThemeSwitcher,Panel});
  MapRenderer.init(
    regionId=>Panel.showRegionOrGroup(regionId),
    eventIdx=>{const e=EVENTS[eventIdx];const context=Theme.current==="territory"?{type:"region",id:e.regionId}:{type:"group",mode:Theme.current,value:e[Theme.current]};Panel.showEvent(eventIdx,context);}
  );
  ThemeSwitcher.init();
  Timeline.init();
}

main().catch(error=>{
  console.error(error);
  const hint=document.getElementById("empty-hint");
  if(hint) hint.textContent="Erreur de chargement des données. Utilisez un serveur local (ex. GitHub Pages, VS Code Live Server ou python -m http.server).";
});
