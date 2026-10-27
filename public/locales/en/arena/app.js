import { $, $$, api, action, memeCard, uploadForm, wireUpload, reportButton, wireReports } from '/locales/en/shared/ui.js';
export async function mount() {
  $('#app').innerHTML=`<section><div class="section-head"><h2>Go with your first laugh</h2><span class="small muted">One vote per pair</span></div><div id="battle"></div></section><section class="section-gap"><div class="section-head"><h2>The winners’ board</h2><button id="refresh" class="secondary">Refresh</button></div><div class="leader-grid" id="leaders"></div></section><section class="section-gap split"><div class="stack"><h2>Step into the arena</h2><p class="muted">Submit your meme. Once approved, it joins the battles.</p><p class="small muted">We count head-to-head wins. Simple votes, no hidden ranking.</p></div>${uploadForm('arena')}</section>`;
  async function load(){
    const {pair,leaders}=await api('/api/arena');
    $('#battle').innerHTML=pair?`<div class="grid-two">${pair.map(post=>memeCard(post)).join('')}</div>`:'<div class="empty panel"><h3>You have seen every available pair</h3><p class="muted">Add a meme or come back later for new contenders.</p></div>';
    if(pair)$$('.pick').forEach(button=>action(button,async()=>{await api('/api/arena/vote',{a:pair[0].id,b:pair[1].id,winner:button.dataset.id});await load();}));
    $('#leaders').innerHTML=leaders.map(post=>`<div>${memeCard(post,false)}${reportButton(post.id)}</div>`).join('');wireReports();
  }
  wireUpload('arena');action($('#refresh'),load);await load();
}
