import { $, $$, api, action, memeCard, uploadForm, wireUpload, reportButton, wireReports } from '/shared/ui.js';
export async function mount() {
  $('#app').innerHTML=`<section><div class="section-head"><h2>Выбирай, не раздумывая</h2><span class="small muted">Один голос на каждую пару</span></div><div id="battle"></div></section><section class="section-gap"><div class="section-head"><h2>Таблица побед</h2><button id="refresh" class="secondary">Обновить</button></div><div class="leader-grid" id="leaders"></div></section><section class="section-gap split"><div class="stack"><h2>Выйди на арену</h2><p class="muted">Добавь свой мем. После проверки он начнёт участвовать в дуэлях.</p><p class="small muted">Считаем победы в парах. Это простая таблица голосов, без скрытого рейтинга.</p></div>${uploadForm('arena')}</section>`;
  async function load(){
    const {pair,leaders}=await api('/api/arena');
    $('#battle').innerHTML=pair?`<div class="grid-two">${pair.map(post=>memeCard(post)).join('')}</div>`:'<div class="empty panel"><h3>Все доступные пары пройдены</h3><p class="muted">Добавь новый мем или загляни позже — появятся новые соперники.</p></div>';
    if(pair)$$('.pick').forEach(button=>action(button,async()=>{await api('/api/arena/vote',{a:pair[0].id,b:pair[1].id,winner:button.dataset.id});await load();}));
    $('#leaders').innerHTML=leaders.map(post=>`<div>${memeCard(post,false)}${reportButton(post.id)}</div>`).join('');wireReports();
  }
  wireUpload('arena');action($('#refresh'),load);await load();
}
