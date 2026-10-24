// Retain decoded static assets across theme switches and the two mounted rooms.
// Failed requests can be retried; successful images live for this app session.
const decodedImages=new Map<string,Promise<HTMLImageElement>>();
export function decodeImage(url:string):Promise<HTMLImageElement>{
 const cached=decodedImages.get(url);if(cached)return cached;
 const image=new Image();image.decoding='async';image.src=url;
 const request=image.decode().then(()=>image).catch(error=>{decodedImages.delete(url);throw error;});
 decodedImages.set(url,request);return request;
}
