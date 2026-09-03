export function createTheme(REGIONS, EVENTS){
  if (!REGIONS || !EVENTS) {
    throw new Error("REGIONS et EVENTS doivent être définis pour créer le thème.");
  }
  const MODES=[
    {key:"territory",label:"Entités politiques"},
    {key:"religion",label:"Religions"},
    {key:"language",label:"Langues"},
    {key:"ethnicity",label:"Peuples / ethnies"}
  ];
  let current="territory";
  const cache={};
  function allValues(key){
    const s=new Set();
    REGIONS.forEach(r => {
      if (r.snapshots && Array.isArray(r.snapshots)) {  // Vérification défensive
        r.snapshots.forEach(sn => s.add(sn[key]));
      }
    });
    EVENTS.forEach(e=>s.add(e[key]));
    return [...s].sort();
  }
  const categories={};
  MODES.forEach(m=>categories[m.key]=allValues(m.key));
  function colorFor(key,value){
    const cacheKey=key+"|"+value;
    if(cache[cacheKey]) return cache[cacheKey];
    const idx=categories[key].indexOf(value);
    const hue=(idx*137.508)%360;
    const c=`hsl(${hue.toFixed(0)}, 42%, ${key==='territory'?58:54}%)`;
    cache[cacheKey]=c;
    return c;
  }
  return {MODES,categories,colorFor,get current(){return current;},set current(v){current=v;}};
}
