import {HttpError} from './validation.mjs';

export function mediaError(status){
  const error=new HttpError(status,status===410?'Эта картинка удалена. Обновите арену.':'Картинка не найдена. Обновите арену.');
  error.publicCode=status===410?'media_gone':'media_missing';
  return error;
}

/** Inspect indexed metadata before loading a BLOB or evaluating conditional cache headers. */
export function mediaResource(db,id,authorize,appId=''){
  if(typeof id!=='string'||id.length<1||id.length>50||!/^[a-zA-Z0-9_-]+$/.test(id))throw mediaError(404);
  const row=db.prepare('SELECT id,kind,mime,status,bytes,length(image) AS imageBytes,image IS NOT NULL AS hasImage FROM posts WHERE id=?').get(id);
  if(!row){
    const removed=db.prepare('SELECT kind FROM public_media_gone WHERE id=?').get(id);
    throw mediaError(removed&&(!appId||removed.kind===appId)?410:404);
  }
  if(appId&&row.kind!==appId)throw mediaError(404);
  if(row.status!=='approved')authorize();
  if(!row.hasImage)throw mediaError(row.status==='approved'&&row.bytes>0?410:404);
  if(row.imageBytes>500000)throw new Error('Stored media exceeds the upload contract');
  return row;
}
