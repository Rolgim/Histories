export function createTimeline({MapRenderer,ThemeSwitcher,Panel}){
  const slider=document.getElementById("year-slider"), yearNum=document.getElementById("year-num"), playBtn=document.getElementById("play-btn");
  let playing=false,timer=null;
  function setYear(y){yearNum.textContent=y;MapRenderer.setYear(y);ThemeSwitcher.renderLegend();Panel.refreshOpenPanel();}
  slider.addEventListener("input",()=>setYear(parseInt(slider.value,10)));
  playBtn.addEventListener("click",function(){
    if(playing){clearInterval(timer);playing=false;this.textContent="▶ parcourir 700→1400";return;}
    playing=true;this.textContent="❚❚ pause"; if(parseInt(slider.value,10)>=1395)slider.value=700;
    timer=setInterval(()=>{let y=parseInt(slider.value,10)+5;if(y>1400){y=1400;clearInterval(timer);playing=false;playBtn.textContent="▶ parcourir 700→1400";}slider.value=y;setYear(y);},180);
  });
  return {init:()=>setYear(parseInt(slider.value,10))};
}
