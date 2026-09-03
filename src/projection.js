export const Projection = (() => {
  function proj(lon, lat){
    return [Math.round((lon+180)/360*1000*10)/10, Math.round((90-lat)/180*500*10)/10];
  }
  function points(coords){ return coords.map(([lon,lat])=>proj(lon,lat).join(",")).join(" "); }
  function centroid(coords){
    const p=coords.map(([lon,lat])=>proj(lon,lat));
    return [p.reduce((s,q)=>s+q[0],0)/p.length,p.reduce((s,q)=>s+q[1],0)/p.length];
  }
  return {proj,points,centroid};
})();
