import before from './ink-last-restored-roll';
import after from '../src/usePaperRoll';
const mode=new URLSearchParams(location.search).get('mode');
export default ['restored','fallback'].includes(mode||'')?after:before;
