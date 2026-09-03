export async function loadData(){
  const [regionsResponse, eventsResponse] = await Promise.all([
    fetch("data/regions.json"),
    fetch("data/events.json")
  ]);
  if(!regionsResponse.ok || !eventsResponse.ok){
    throw new Error("Impossible de charger les données historiques.");
  }
  const [REGIONS, EVENTS] = await Promise.all([regionsResponse.json(), eventsResponse.json()]);
  return {REGIONS, EVENTS};
}

export function activeSnapshot(region, year){
  return region.snapshots.find(s => year >= s.from && year < s.to) || region.snapshots[region.snapshots.length-1];
}
