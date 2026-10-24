// Export the real source to the isolated browser verifier, without production hooks.
import {build} from 'esbuild';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('../',import.meta.url));
const result=await build({stdin:{contents:`import {buildWordmarkReveal} from './src/wordmarkReveal.ts';import {wordmarkStrokeGroups} from './src/Wordmark.tsx';window.__pacingProbe={buildWordmarkReveal,wordmarkStrokeGroups};`,loader:'ts',resolveDir:project},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',loader:{'.css':'empty'}});
const target='const map = clock ?? createVisibleArcClock(activity, arcPerBin, from, to);';
let code=result.outputFiles[0].text;
if(!code.includes(target))throw Error('Pacing instrumentation target changed');
code=code.replace(target,'window.__rawStart=new Float32Array(start);'+target+'window.__arcClock=map;');
const folder=new URL('../.inklune-logs/k-pacing-check/',import.meta.url);mkdirSync(folder,{recursive:true});
writeFileSync(new URL('probe.js',folder),code);
