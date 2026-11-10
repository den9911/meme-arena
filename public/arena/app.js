import { $, $$, api, action, memeCard, uploadForm, wireUpload, reportButton, wireReports } from '/shared/ui.js';
import {wireMedia} from '/shared/media-state.js';
export async function mount() {
  let loading=false,voting=false,disposeMedia=()=>{};
  $('#app').innerHTML=`<section><div class="section-head"><h2>Выбирай, не раздумывая</h2><span class="small muted">Один голос на каждую пару</span></div><div id="arena-status" class="note stack" role="status" hidden></div><div id="battle"></div></section><section class="section-gap"><div class="section-head"><h2>Таблица побед</h2><button id="refresh" class="secondary">Обновить</button></div><div class="leader-grid" id="leaders"></div></section><section class="section-gap split"><div class="stack"><h2>Выйди на арену</h2><p class="muted">Добавь свой мем. После проверки он начнёт участвовать в дуэлях.</p><p class="small muted">Считаем победы в парах. Это простая таблица голосов, без скрытого рейтинга.</p></div>${uploadForm('arena')}</section>`;
  function lock(){const blocked=loading||voting;$$('.pick,#refresh,#retry-arena,.media-failure button').forEach(button=>button.disabled=blocked||button.dataset.lock==='true');}
  async function load(){
    if(loading)return false;loading=true;lock();
    try{
      const {pair,leaders}=await api('/api/arena');disposeMedia();
      $('#battle').innerHTML=pair?`<div class="grid-two">${pair.map(post=>memeCard(post)).join('')}</div>`:'<div class="empty panel"><h3>Все доступные пары пройдены</h3><p class="muted">Добавь новый мем или загляни позже — появятся новые соперники.</p></div>';
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
      status.innerHTML='<p>Не удалось обновить арену. Проверьте соединение и повторите; предыдущие карточки сохранены.</p><button id="retry-arena" class="secondary">Повторить обновление</button>';
      action($('#retry-arena'),load);return false;
    }finally{loading=false;lock();}
  }
  window.addEventListener('pagehide',()=>disposeMedia(),{once:true});
  wireUpload('arena');action($('#refresh'),load);await load();
}
