import before from './ink-audit-before-lighting';
import after from '../src/usePaperLighting';
export default new URLSearchParams(location.search).get('mode')==='before'?before:after;
