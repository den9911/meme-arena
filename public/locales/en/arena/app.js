import { $, $$, api, action, memeCard, uploadForm, wireUpload, reportButton, wireReports } from '/locales/en/shared/ui.js';
import {wireMedia} from '/locales/en/shared/media-state.js';
export async function mount() {
  let loading=false,voting=false,disposeMedia=()=>{};
  $('#app').innerHTML=`<section><div class="section-head"><h2>Go with your first laugh</h2><span class="small muted">One vote per pair</span></div><div id="arena-status" class="note stack" role="status" hidden></div><div id="battle"></div></section><section class="section-gap"><div class="section-head"><h2>The winners’ board</h2><button id="refresh" class="secondary">Refresh</button></div><div class="leader-grid" id="leaders"></div></section><section class="section-gap split"><div class="stack"><h2>Step into the arena</h2><p class="muted">Submit your meme. Once approved, it joins the battles.</p><p class="small muted">We count head-to-head wins. Simple votes, no hidden ranking.</p></div>${uploadForm('arena')}</section>`;
  function lock(){const blocked=loading||voting;$$('.pick,#refresh,#retry-arena,.media-failure button').forEach(button=>button.disabled=blocked);}
  async function load(){
    if(loading)return false;loading=true;lock();
    try{
      const {pair,leaders}=await api('/api/arena');disposeMedia();
      $('#battle').innerHTML=pair?`<div class="grid-two">${pair.map(post=>memeCard(post)).join('')}</div>`:'<div class="empty panel"><h3>You have seen every available pair</h3><p class="muted">Add a meme or come back later for new contenders.</p></div>';
      if(pair)$$('.pick').forEach(button=>action(button,async()=>{
        if(voting||loading)return;voting=true;lock();
        try{await api('/api/arena/vote',{a:pair[0].id,b:pair[1].id,winner:button.dataset.id});await load();}
        finally{voting=false;lock();}
      }));
      $('#leaders').innerHTML=leaders.map(post=>`<div>${memeCard(post,false)}${reportButton(post.id)}</div>`).join('');wireReports();
      disposeMedia=wireMedia($('#app'),()=>voting?false:load());$('#arena-status').hidden=true;return true;
    }catch{
      // Keep the previous cards and upload form; an unavailable database is not an empty arena.
      const status=$('#arena-status');status.hidden=false;
      status.innerHTML='<p>Could not refresh the arena. Check your connection and retry; previous cards are preserved.</p><button id="retry-arena" class="secondary">Retry refresh</button>';
      action($('#retry-arena'),load);return false;
    }finally{loading=false;lock();}
  }
  window.addEventListener('pagehide',()=>disposeMedia(),{once:true});
  wireUpload('arena');action($('#refresh'),load);await load();
}
