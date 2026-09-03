export function createTimeline({ MapRenderer, ThemeSwitcher, Panel }) {
  const slider = document.getElementById("year-slider");
  const yearNum = document.getElementById("year-num");
  const playBtn = document.getElementById("play-btn");

  let playing = false;
  let timer = null;

  function setYear(y) {
    yearNum.textContent = y;
    MapRenderer.setYear(y);
    ThemeSwitcher.renderLegend();
    Panel.refreshOpenPanel();
  }

  slider.addEventListener("input", () => setYear(parseInt(slider.value, 10)));

  playBtn.addEventListener("click", function() {
    if (playing) {
      clearInterval(timer);
      playing = false;
      this.textContent = "▶ parcourir -2000→2000";
      return;
    }

    playing = true;
    this.textContent = "❚❚ pause";

    // Si on est déjà à la fin, on recommence depuis -2000
    if (parseInt(slider.value, 10) >= 2000) {
      slider.value = -2000;
    }

    timer = setInterval(() => {
      let y = parseInt(slider.value, 10) + 50; // Incrémentation de 50
      if (y > 2000) {
        y = 2000;
        clearInterval(timer);
        playing = false;
        playBtn.textContent = "▶ parcourir -2000→2000";
      }
      slider.value = y;
      setYear(y);
    }, 360); // Intervalle de 180ms (ajustable si nécessaire)
  });

  return { init: () => setYear(parseInt(slider.value, 10)) };
}