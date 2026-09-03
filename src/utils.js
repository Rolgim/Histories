// On stocke les couleurs déjà attribuées pour éviter les doublons visuels
const colorRegistry = new Map();

// Fonction utilitaire pour calculer la distance visuelle entre deux couleurs RVB
function getColorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) * 0.3 + 
    Math.pow(g1 - g2, 2) * 0.59 + 
    Math.pow(b1 - b2, 2) * 0.11
  );
}

export function getDeterministicColor(str) {
  // 1. Si le texte a déjà été traité, on renvoie sa couleur unique
  if (colorRegistry.has(str)) {
    return colorRegistry.get(str);
  }

  // 2. Génération d'un hash de base stable (FNV-1a)
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // 3. Extraction de la base de couleur
  let r = (hash & 0xFF0000) >> 16;
  let g = (hash & 0x00FF00) >> 8;
  let b = hash & 0x0000FF;

  // 4. Boucle anti-collision : si la couleur est trop proche d'une couleur existante,
  // on modifie légèrement le spectre jusqu'à trouver une place libre et distincte
  let attempts = 0;
  let isTooClose = true;
  const minVisualDistance = 45; // Seuil de perception visuelle (plus il est haut, plus les couleurs sont différentes)

  while (isTooClose && attempts < 100) {
    isTooClose = false;
    
    for (let existingColor of colorRegistry.values()) {
      // Extraction des composants HEX existants
      const exR = parseInt(existingColor.slice(1, 3), 16);
      const exG = parseInt(existingColor.slice(3, 5), 16);
      const exB = parseInt(existingColor.slice(5, 7), 16);

      // Calcul de la ressemblance visuelle
      if (getColorDistance(r, g, b, exR, exG, exB) < minVisualDistance) {
        isTooClose = true;
        break;
      }
    }

    if (isTooClose) {
      // Décalage déterministe pour explorer une autre zone du spectre de couleur
      r = (r + 45) % 256;
      g = (g + 85) % 256;
      b = (b + 125) % 256;
      attempts++;
    }
  }

  // 5. Conversion finale en HEX
  const toHex = (c) => c.toString(16).padStart(2, '0');
  const finalHex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  // Enregistrement pour les prochains appels
  colorRegistry.set(str, finalHex);
  return finalHex;
}

export function escapeHtml(value) {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  