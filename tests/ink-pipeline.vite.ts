import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[{
    name:'isolated-ink-probe',enforce:'pre',
    transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/Editor.tsx'))return code.replace("from './usePaperRoll'", "from '../tests/ink-pipeline-roll'");},
  },react()],
  base:'./',server:{port:5175,strictPort:true,host:'127.0.0.1'},
});
