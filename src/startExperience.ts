import type {Note,Settings} from './storage';
export const startMaterial=Object.freeze({id:'snow',title:'纯白细棉',color:'#fafaf7'} as const);
export type StartMaterial=typeof startMaterial.id;
export const writingExperience=Object.freeze({material:startMaterial.id,transition:'aperture',duration:660,returnDuration:480} as const);
export const materialUrl=(material:StartMaterial|'graphite')=>`${import.meta.env.BASE_URL}start-materials/${material}-v2.webp`;
// Readiness belongs to the exact note and visible render configuration.
export const editorPreparationKey=(note:Note,settings:Settings)=>JSON.stringify([note.id,settings.paper,settings.curved,settings.fontSize,settings.chineseFont,settings.englishFont,settings.kit,settings.capsule,settings.rail,settings.endcap,settings.night]);
