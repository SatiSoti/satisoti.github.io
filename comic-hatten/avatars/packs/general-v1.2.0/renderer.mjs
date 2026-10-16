/** Portable modular character renderer. No dependencies, global clocks or gameplay. */
const FIELDS = {hairId:'hair',faceId:'face',outfitId:'outfit',hairColorId:'hairColors',outfitColorId:'outfitColors'};
const fail = message => { throw new Error(`[GeneralPack] ${message}`); };
const finite = (n, name) => { if (typeof n !== 'number' || !Number.isFinite(n)) fail(`${name} must be finite.`); return n; };
const record = v => v && typeof v === 'object' && !Array.isArray(v);
function unique(items, name) {
  if (!Array.isArray(items) || !items.length) fail(`${name} must be a non-empty array.`);
  const map = new Map();
  for (const item of items) {
    if (!record(item) || !/^[a-z][a-z0-9_-]*$/.test(item.id) || map.has(item.id)) fail(`Invalid or duplicate ${name} id.`);
    map.set(item.id, item);
  }
  return map;
}
function tuple(v, n, name) {
  if (!Array.isArray(v) || v.length !== n || v.some(x => typeof x !== 'number' || !Number.isFinite(x))) fail(`Invalid ${name}.`);
}
function deepFreeze(v) {
  if (v && typeof v === 'object') { Object.values(v).forEach(deepFreeze); Object.freeze(v); }
  return v;
}
function validateManifest(m) {
  if (!record(m) || m.format !== 'comic-hatten.general-character-pack' || m.schemaVersion !== '1.0.0' || m.packId !== 'comic-hatten-general') fail('Unsupported general character pack.');
  const assets = unique(m.assets, 'assets');
  for (const a of assets.values()) {
    if (typeof a.image !== 'string' || !/^assets\/[a-z0-9_-]+\.png$/.test(a.image)) fail('Asset paths must stay inside assets/.');
    if (![a.width,a.height].every(n=>Number.isInteger(n) && n>0 && n<=8192)) fail('Invalid image dimensions.');
  }
  const part = (p, rect) => {
    const a=assets.get(p.assetId); if(!a) fail(`Missing asset: ${p.assetId}`);
    tuple(rect,4,'rect'); const [x,y,w,h]=rect;
    if (rect.some(n=>!Number.isInteger(n)) || x<0 || y<0 || w<=0 || h<=0 || x+w>a.width || y+h>a.height) fail(`Out-of-bounds rect: ${p.id}`);
  };
  for (const type of ['hair','face','outfit']) {
    const options=unique(m.parts?.[type],type);
    for (const p of options.values()) {
      if(!Array.isArray(p.styles)||!p.styles.length||new Set(p.styles).size!==p.styles.length||p.styles.some(s=>!['male','female'].includes(s))) fail('Invalid part styles.');
      if(typeof p.label !== 'string') fail('Part label required.');
      if (type === 'outfit') {
        if(typeof p.assemblyFlipX !== 'boolean') fail('Outfit assemblyFlipX must be boolean.');
        if (!Array.isArray(p.frames) || p.frames.length!==8 || new Set(p.frames.map(f=>f.index)).size!==8) fail('Outfits need eight unique frames.');
        for (const f of p.frames) {
          if (!Number.isInteger(f.index)||f.index<0||f.index>7) fail('Invalid frame index.');
          part(p,f.rect); tuple(f.neck,2,'neck');
          if(f.neck[0]<0||f.neck[0]>f.rect[2]||f.neck[1]<0||f.neck[1]>f.rect[3]||finite(f.renderHeight,'renderHeight')<=0) fail('Invalid body anchor.');
          finite(f.offsetY,'offsetY');
        }
      } else {
        part(p,p.rect);
        if(type==='hair') {
          tuple(p.neck,2,'neck'); tuple(p.faceBox,4,'faceBox');
          if(p.neck[0]<0||p.neck[0]>p.rect[2]||p.neck[1]<=0||p.neck[1]>p.rect[3]||finite(p.renderNeckHeight,'renderNeckHeight')<=0) fail('Invalid head anchor.');
          const [x,y,w,h]=p.faceBox;
          if(x<0||y<0||w<=0||h<=0||x+w>p.rect[2]||y+h>p.rect[3]) fail('Invalid face placement.');
        }
      }
    }
  }
  for(const type of ['hair','outfit']) for(const c of unique(m.palettes?.[type],`${type} colors`).values()) {
    if(typeof c.label!=='string'||!/^#[0-9a-f]{6}$/i.test(c.color)) fail('Invalid palette.');
  }
  for(const action of ['idle','walk','work','cheer']) {
    const a=m.animations?.[action];
    if(!a||!Array.isArray(a.frames)||!a.frames.length||a.frames.some(i=>!Number.isInteger(i)||i<0||i>7)||finite(a.fps,'fps')<=0||typeof a.loop!=='boolean') fail(`Invalid animation: ${action}`);
  }
  unique(m.presets,'presets');
}
function lru(limit=32) {
  const cache=new Map();
  return (key,create) => {
    if(cache.has(key)) {const v=cache.get(key);cache.delete(key);cache.set(key,v);return v;}
    const v=create();cache.set(key,v);if(cache.size>limit) cache.delete(cache.keys().next().value);return v;
  };
}

/** Inject fetch, Image and createCanvas for non-DOM engines or automated checks. */
export async function loadGeneralPack(manifestURL, {
  fetchImpl=globalThis.fetch, ImageClass=globalThis.Image,
  createCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
}={}) {
  if(typeof fetchImpl!=='function'||typeof ImageClass!=='function'||typeof createCanvas!=='function') fail('fetch, Image and createCanvas implementations are required.');
  const url=new URL(manifestURL,globalThis.location?.href||import.meta.url);
  let response;
  try { response=await fetchImpl(url.href); } catch(e) {fail(`Manifest could not load. Serve over HTTP(S). ${e.message}`);}
  if(!response.ok) fail(`Manifest HTTP ${response.status}.`);
  const manifest=await response.json();validateManifest(manifest);
  const options={hair:manifest.parts.hair,face:manifest.parts.face,outfit:manifest.parts.outfit,hairColors:manifest.palettes.hair,outfitColors:manifest.palettes.outfit};
  const maps=Object.fromEntries(Object.entries(options).map(([k,v])=>[k,new Map(v.map(p=>[p.id,p]))]));
  function validateAppearance(a) {
    if(!record(a)||Object.keys(a).length!==5) fail('Appearance needs exactly five part/color IDs.');
    for(const [field,group] of Object.entries(FIELDS)) if(!Object.hasOwn(a,field)||typeof a[field]!=='string'||!maps[group].has(a[field])) fail(`Unknown ${field}: ${String(a[field])}.`);
    return true;
  }
  function optionsForStyle(style) {
    if(!['male','female'].includes(style)) fail('Invalid style group.');
    return Object.freeze(Object.fromEntries(Object.entries(options).map(([key, values]) =>
      [key, Object.freeze(values.filter(p => !p.styles || p.styles.includes(style)))])));
  }
  function inferStyle(appearance) {
    validateAppearance(appearance);
    return maps.hair.get(appearance.hairId).styles[0];
  }
  for(const p of manifest.presets) validateAppearance(p.appearance);
  const entries=await Promise.all(manifest.assets.map(a=>new Promise((resolve,reject)=>{
    const image=new ImageClass();
    image.onload=()=>{image.onload=null;image.onerror=null;if((image.naturalWidth||image.width)!==a.width||(image.naturalHeight||image.height)!==a.height){reject(new Error(`[GeneralPack] ${a.id}: unexpected dimensions.`));return;}resolve([a.id,image]);};
    image.onerror=()=>{image.onload=null;image.onerror=null;reject(new Error(`[GeneralPack] Could not load ${a.image}.`));};
    const assetURL=new URL(a.image,response.url||url.href);
    // Opt into CORS before loading so cross-origin, CORS-enabled images remain tintable.
    if (/^https?:$/.test(assetURL.protocol)) image.crossOrigin='anonymous';
    image.src=assetURL.href;
  })));
  const images=new Map(entries),headCache=lru(32),bodyCache=lru(32);
  function crop(asset,rect) {
    const [x,y,w,h]=rect,c=createCanvas(w,h);c.width=w;c.height=h;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(images.get(asset),x,y,w,h,0,0,w,h);return c;
  }
  function tint(c,color,type) {
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
    const ctx=c.getContext('2d'),im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
    for(let i=0;i<d.length;i+=4) {
      const r=d[i],g=d[i+1],b=d[i+2];
      const selected=type==='hair' ? b>45&&b>r*1.12&&b>g*1.05 : r>65&&r>g*1.5&&b>g*1.25&&b>r*.52&&b<r*1.2;
      if(d[i+3] && selected) {
        const shade=Math.min(1.35,(type==='hair'?b/135:r/182));
        d[i]=Math.round(rgb[0]*shade);d[i+1]=Math.round(rgb[1]*shade);d[i+2]=Math.round(rgb[2]*shade);
      }
    }
    ctx.putImageData(im,0,0);return c;
  }
  function headFor(a) {
    return headCache([a.hairId,a.faceId,a.hairColorId].join('|'),()=>{
      const h=maps.hair.get(a.hairId),f=maps.face.get(a.faceId);
      const c=crop(h.assetId,h.rect);
      // Features belong beneath the fringe. Derive a skin mask before hair tinting,
      // so copper/brown hair can never be mistaken for the blank face region.
      const source=c.getContext('2d').getImageData(0,0,c.width,c.height);
      const mask=createCanvas(c.width,c.height),maskCtx=mask.getContext('2d');
      for(let i=0;i<source.data.length;i+=4) {
        const d=source.data,r=d[i],g=d[i+1],b=d[i+2];
        d[i+3]=(r>135&&g>85&&b>50&&r>g*1.08&&g>b*1.05)?d[i+3]:0;
        d[i]=255;d[i+1]=255;d[i+2]=255;
      }
      maskCtx.putImageData(source,0,0);
      const features=createCanvas(c.width,c.height),fc=features.getContext('2d');
      fc.imageSmoothingEnabled=false;fc.drawImage(images.get(f.assetId),...f.rect,...h.faceBox);
      fc.globalCompositeOperation='destination-in';fc.drawImage(mask,0,0);
      tint(c,maps.hairColors.get(a.hairColorId).color,'hair');
      const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
      ctx.drawImage(features,0,0);return c;
    });
  }
  function bodyFor(a,f) {
    return bodyCache([a.outfitId,a.outfitColorId,f.index].join('|'),()=>tint(crop(maps.outfit.get(a.outfitId).assetId,f.rect),maps.outfitColors.get(a.outfitColorId).color,'outfit'));
  }
  function frameAt(action='idle',time=0) {
    if(!Object.hasOwn(manifest.animations,action)) fail(`Unknown action: ${String(action)}.`);
    const a=manifest.animations[action],t=Math.max(0,finite(time,'time'));
    const pos=a.loop?Math.floor((t%(a.frames.length/a.fps))*a.fps):Math.min(a.frames.length-1,Math.floor(t*a.fps));
    return a.frames[Math.min(a.frames.length-1,pos)];
  }
  /** (x,y) is feet; scale is canvas pixels per logical pixel; time is seconds. */
  function draw(ctx,{appearance,action='idle',time=0,frameIndex,x=0,y=0,scale=1,flip=false,shadow=true}={}) {
    validateAppearance(appearance);finite(x,'x');finite(y,'y');
    if(finite(scale,'scale')<=0||typeof flip!=='boolean'||typeof shadow!=='boolean') fail('Invalid drawing options.');
    if(!ctx||typeof ctx.drawImage!=='function'||typeof ctx.save!=='function') fail('Canvas 2D context required.');
    const index=frameIndex===undefined?frameAt(action,time):frameIndex;
    if(!Number.isInteger(index)||index<0||index>7) fail('frameIndex must be 0–7.');
    const h=maps.hair.get(appearance.hairId),f=maps.outfit.get(appearance.outfitId).frames.find(f=>f.index===index);
    const body=bodyFor(appearance,f),head=headFor(appearance);
    const br=f.renderHeight/f.rect[3],hr=h.renderNeckHeight/h.neck[1];
    const bx=-f.neck[0]*br,by=-f.renderHeight+f.offsetY;
    const hy=by+f.neck[1]*br-h.neck[1]*hr+1;
    ctx.save();
    try {
      ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
      if(shadow){ctx.fillStyle='#53402d22';ctx.fillRect(-10,-1,20,3);}
      if(flip)ctx.scale(-1,1);
      // Normalize the body atlas to the head's direction around the shared neck.
      // This is independent of the caller's whole-character flip.
      ctx.save();
      try {
        if(maps.outfit.get(appearance.outfitId).assemblyFlipX) ctx.scale(-1,1);
        ctx.drawImage(body,Math.round(bx),Math.round(by),Math.round(body.width*br),f.renderHeight);
      } finally {ctx.restore();}
      ctx.drawImage(head,Math.round(-h.neck[0]*hr),Math.round(hy),Math.round(head.width*hr),Math.round(head.height*hr));
    } finally {ctx.restore();}
    return f;
  }
  deepFreeze(manifest);Object.freeze(options);
  return {manifest,options,optionsForStyle,inferStyle,presets:manifest.presets,validateAppearance,frameAt,draw};
}
