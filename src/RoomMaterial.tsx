import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
import {materialUrl,startMaterial} from './startExperience';
import type {StartMaterial} from './startExperience';
import {defaultNightMaterial,findNightMaterial,isNightAtmosphere,nightMaterialUrl} from './nightMaterials';
import type {NightMaterial} from './nightMaterials';
import {decodeImage} from './imageResources';
export default function RoomMaterial({material,night,nightMaterial=defaultNightMaterial}:{material:StartMaterial;night:boolean;nightMaterial?:NightMaterial}){
 const id=night?nightMaterial:material,url=night?nightMaterialUrl(nightMaterial):materialUrl(material),[decoded,setDecoded]=useState('');
 const color=night?findNightMaterial(nightMaterial).color:startMaterial.color;
 const atmosphere=night&&isNightAtmosphere(nightMaterial);
 useEffect(()=>{
  const base=import.meta.env.BASE_URL;
  const assets=[materialUrl(material),nightMaterialUrl(nightMaterial)];
  if(isNightAtmosphere(nightMaterial))assets.push(`${base}night-materials/${nightMaterial}-portrait.webp`,`${base}night-materials/film-grain.webp`);
  void Promise.allSettled(assets.map(decodeImage));
 },[material,nightMaterial]);
 return <div className={`room-material ${atmosphere?'room-atmosphere':''}`} data-material={id} data-texture-ready={decoded===url} aria-hidden="true" style={{backgroundColor:color,backgroundImage:`url("${url}")`,'--night-grain':`url("${new URL(`${import.meta.env.BASE_URL}night-materials/film-grain.webp`,document.baseURI).href}")`} as CSSProperties}>
  {atmosphere&&<picture className="room-atmosphere-paint"><source media="(max-aspect-ratio: 4/5)" srcSet={`${import.meta.env.BASE_URL}night-materials/${id}-portrait.webp`}/><img src={url} alt="" decoding="async"/></picture>}
  <img className="room-material-loader" src={url} alt="" onLoad={()=>setDecoded(url)} decoding="async"/>
 </div>;
}
