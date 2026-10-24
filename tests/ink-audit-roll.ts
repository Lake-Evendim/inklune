import before from './ink-audit-before-roll';
import after from '../src/usePaperRoll';
export default new URLSearchParams(location.search).get('mode')==='before'?before:after;
