import { $, $$, api, action, memeCard, uploadForm, wireUpload, reportButton, wireReports } from '/locales/es/shared/ui.js';
export async function mount() {
  $('#app').innerHTML=`<section><div class="section-head"><h2>Elige sin pensarlo demasiado</h2><span class="small muted">Un voto por pareja</span></div><div id="battle"></div></section><section class="section-gap"><div class="section-head"><h2>Tabla de victorias</h2><button id="refresh" class="secondary">Actualizar</button></div><div class="leader-grid" id="leaders"></div></section><section class="section-gap split"><div class="stack"><h2>Sal a la arena</h2><p class="muted">Envía tu meme. Tras la revisión participará en los duelos.</p><p class="small muted">Contamos victorias por parejas. Votos simples, sin clasificación oculta.</p></div>${uploadForm('arena')}</section>`;
  async function load(){
    const {pair,leaders}=await api('/api/arena');
    $('#battle').innerHTML=pair?`<div class="grid-two">${pair.map(post=>memeCard(post)).join('')}</div>`:'<div class="empty panel"><h3>Ya has visto todas las parejas</h3><p class="muted">Añade un meme o vuelve más tarde para ver nuevos rivales.</p></div>';
    if(pair)$$('.pick').forEach(button=>action(button,async()=>{await api('/api/arena/vote',{a:pair[0].id,b:pair[1].id,winner:button.dataset.id});await load();}));
    $('#leaders').innerHTML=leaders.map(post=>`<div>${memeCard(post,false)}${reportButton(post.id)}</div>`).join('');wireReports();
  }
  wireUpload('arena');action($('#refresh'),load);await load();
}
