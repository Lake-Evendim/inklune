// Exercise hit testing and follow-up interactions, not just React selection.
// Used only by the memory-backed development fixture.
export async function runMenuRegression() {
  const results: string[] = [];
  const wait = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));
  const panel = () => document.querySelector<HTMLElement>('.settings-panel')!;
  const button = (name: string) => Array.from(panel().querySelectorAll<HTMLButtonElement>('button'))
    .find(b => (b.getAttribute('aria-label') || b.textContent?.trim()) === name)!;
  const check = (name: string, pass: boolean) => results.push(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  const reachable = async (target: HTMLElement | null) => {
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    await wait();
    // Cover both the preview and the caption: a caption alone could work
    // while a decoration intercepts the preview or surrounding controls.
    const nodes = [target, ...target.querySelectorAll<HTMLElement>('.paper-swatch')];
    return nodes.every(node => {
      const r = node.getBoundingClientRect();
      return [0.25, 0.5, 0.75].every(fraction => {
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * fraction);
        return !!hit && target.contains(hit);
      });
    });
  };
  const click = async (name: string) => {
    // The gallery is a lazy chunk. Wait for its real controls to appear rather
    // than testing the loading placeholder as if it were a missing button.
    let target = button(name);
    const deadline = performance.now() + 3000;
    while (!target && performance.now() < deadline) { await wait(); target = button(name); }
    const hit = await reachable(target);
    if (hit) {
      const r = target.getBoundingClientRect();
      (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) as HTMLElement).click();
      await wait();
    }
    check(`${name} receives the click and updates`, hit && target.getAttribute('aria-pressed') === 'true');
  };
  const tab = async (name:string) => {const target=button(name),hit=await reachable(target);if(hit)target.click();await wait();check(`${name} tab changes the panel`,hit&&target.getAttribute('aria-selected')==='true');};
  await wait(300);
  for (const paper of ['棉纤纸', '旧时信纸', '云蓝纸', '蔷薇纸', '亚麻纸', '月夜羊皮纸']) {
    await click('横线纸');
    await click(paper);
  }
  await click('横线纸');
  for (const name of ['平面', '弯曲']) await click(name);
  await tab('书写');for(const name of ['划除','擦除'])await click(name);
  await tab('套件');
  for (const name of ['套件经典搪瓷', '胶囊鼠尾草', '胶囊象牙白',
    '套件海玻璃', '套件火山岩', '套件青花瓷', '套件胡桃木', '套件南瓜灯', '套件木乃伊',
    '套件弗兰肯斯坦', '套件水晶风暴', '精钢', '黄铜', '黑钢']) await click(name);
  for (const label of ['滑轨端饰', '纸页装饰']) {
    check(`${label} remains reachable`, await reachable(panel().querySelector<HTMLElement>(`select[aria-label="${label}"]`)!));
  }
  await tab('书写');
  for (const label of ['墨色深浅', '字号']) {
    check(`${label} slider remains reachable`, await reachable(panel().querySelector<HTMLElement>(`input[aria-label="${label}"]`)!));
  }
  for (const label of ['机械打字声', '夜间书写']) {
    if(label==='夜间书写')await tab('灯光');
    const target = button(label), before = target.getAttribute('aria-checked');
    const hit = await reachable(target);
    if (hit) target.click();
    await wait();
    check(`${label} switch remains clickable`, hit && target.getAttribute('aria-checked') !== before);
  }
  for (const label of ['灯光强度', '灯光扩散角度', '灯光冷暖', '灯光照射范围']) check(`${label} slider remains reachable`, await reachable(panel().querySelector<HTMLElement>(`input[aria-label="${label}"]`)!));
  await tab('纸张');check('lined choice survives tab navigation',button('横线纸').getAttribute('aria-pressed')==='true');
  // Keep lined paper selected while exercising both panel exit controls.
  check('close button remains reachable', await reachable(button('关闭设置')));
  const done = button('回到纸上'), hit = await reachable(done);
  if (hit) done.click();
  await wait();
  check('return closes the settings panel', hit && !document.querySelector('.settings-panel'));
  return results.join('\n');
}
