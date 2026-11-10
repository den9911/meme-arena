// Called only after an image error. HTTP 200 here means decoding failed, not success.
export function mediaFailure(status){
  if(status===404)return {message:'Image not found. Refresh the arena.',retry:false};
  if(status===410)return {message:'This image was removed. Refresh the arena.',retry:false};
  if(status===200)return {message:'This image could not be decoded.',retry:true};
  return {message:'This image is temporarily unavailable. You can retry loading it.',retry:true};
}

/** At most eight visible images in the arena, one bounded HEAD per error, no automatic retries. */
export function wireMedia(root,onRefresh){
  const lifetime=new AbortController();
  function observe(img,attempt=0){
    img.addEventListener('error',async()=>{
      let status=0;
      try{status=(await fetch(img.currentSrc||img.src,{method:'HEAD',cache:'no-store',signal:AbortSignal.any([lifetime.signal,AbortSignal.timeout(4000)])})).status;}catch{}
      if(lifetime.signal.aborted||!img.isConnected)return;
      const state=mediaFailure(status),panel=document.createElement('div'),message=document.createElement('p'),button=document.createElement('button');
      panel.className='media-failure stack';panel.dataset.status=String(status);message.textContent=state.message;
      button.className='secondary';button.type='button';button.textContent=state.retry&&attempt<2?'Retry image':'Refresh arena';
      panel.append(message,button);img.replaceWith(panel);
      button.addEventListener('click',async()=>{
        if(button.disabled)return;button.disabled=true;
        try{
          if(state.retry&&attempt<2){const next=img.cloneNode(false);panel.replaceWith(next);observe(next,attempt+1);}
          else await onRefresh();
        }catch{message.textContent='Could not refresh. Check your connection and retry.';}
        finally{if(button.isConnected)button.disabled=false;}
      });
    },{once:true,signal:lifetime.signal});
    // A cached failure may have completed before handlers were attached.
    if(img.complete&&!img.naturalWidth)img.dispatchEvent(new Event('error'));
  }
  root.querySelectorAll('img[src^="/media/"]').forEach(img=>observe(img));
  return ()=>lifetime.abort();
}
