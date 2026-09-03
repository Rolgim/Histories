// Chargement des données éditoriales.
// Les événements sont volontairement séparés : une contribution = un fichier JSON.
export async function loadData() {
  const [regionsResponse, manifestResponse] = await Promise.all([
    fetch("data/regions.json"),
    fetch("data/events/manifest.json")
  ]);

  if (!regionsResponse.ok) throw new Error(`Impossible de charger data/regions.json (${regionsResponse.status})`);
  if (!manifestResponse.ok) throw new Error(`Impossible de charger le manifeste des événements (${manifestResponse.status})`);

  const regions = await regionsResponse.json();
  const manifest = await manifestResponse.json();

  const eventResponses = await Promise.all(
    manifest.files.map(async (file) => {
      const response = await fetch(`data/events/${file}`);
      if (!response.ok) throw new Error(`Impossible de charger data/events/${file} (${response.status})`);
      return response.json();
    })
  );

  return { regions, events: eventResponses };
}

export function activeSnapshot(region, year) {
  // Trouver le snapshot le plus récent avant ou égal à l'année donnée
  const snapshots = region.snapshots.sort((a, b) => a.year - b.year);
  let active = snapshots[0]; 

  for (const snap of snapshots) {
    if (snap.year <= year) {
      active = snap;
    } else {
      break;
    }
  }

  return active;
}