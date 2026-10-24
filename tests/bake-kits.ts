import * as THREE from 'three';
import { kits } from '../src/skins';
import { defaults } from '../src/storage';
import { makeCapsule,makeRail,setupRenderer,disposeTree } from '../src/mechanismModel';
const canvas=document.createElement('canvas'),{renderer,scene,env}=setupRenderer(canvas,false);
renderer.setPixelRatio(2);renderer.setSize(288,144);const camera=new THREE.OrthographicCamera(-72,72,36,-36,.1,2000);camera.position.z=800;
for(const kit of kits){const shell=makeCapsule(kit.id).group,rail=makeRail(144,{...defaults,rail:kit.rail,endcap:kit.endcap});rail.position.set(-72,0,-6);shell.add(rail);scene.add(shell);renderer.render(scene,camera);const image=new Image();image.alt=kit.id;image.width=288;image.height=144;image.src=canvas.toDataURL('image/webp',.94);document.getElementById('root')!.append(image);scene.remove(shell);disposeTree(shell);}
env.dispose();renderer.dispose();
