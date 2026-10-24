export const nightMaterials=[
 {id:'black-fog',title:'深黑雾幕',description:'细颗粒沉入黑色，远处的柔雾几乎消失在暗部。',color:'#080808',character:'柔雾 · 细颗粒'},
 {id:'obsidian',title:'曜石暗涌',description:'极深的黑底，一道克制的灰色反光沿曲面滑过。',color:'#050505',character:'曲面 · 微反光'},
 {id:'velvet',title:'黑绒静夜',description:'柔软的短绒起伏，哑光而浓黑，光线被轻轻吸收。',color:'#090909',character:'短绒 · 哑光'},
 {id:'inkstone',title:'墨岩微砂',description:'细密矿物颗粒与浅浅层理，像触手可及的黑色砚面。',color:'#0c0c0c',character:'微砂 · 层理'},
 {id:'graphite',title:'原版石墨',description:'原来的石墨颗粒背景，作为历史参照。',color:'#202122',character:'原版参照'},
] as const;
export type NightMaterial=typeof nightMaterials[number]['id'];
export const defaultNightMaterial:NightMaterial='velvet';
export const findNightMaterial=(id:string|null)=>nightMaterials.find(m=>m.id===id)??nightMaterials[0];
export const isNightAtmosphere=(id:NightMaterial)=>id!=='graphite';
export const nightMaterialUrl=(id:NightMaterial,swatch=false)=>id==='graphite'
 ?`${import.meta.env.BASE_URL}start-materials/graphite-v2${swatch?'-swatch':''}.webp`
 :`${import.meta.env.BASE_URL}night-materials/${id}${swatch?'-swatch':''}.webp`;
