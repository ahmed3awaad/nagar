/* Guillotine sheet packer: tries several orderings and split rules, keeps the layout with the fewest sheets. */
function pack(items,L,W,k,rot){
  const EPS=1e-6;
  const bad=items.find(it=>!((it.l<=L+EPS&&it.w<=W+EPS)||(rot&&it.w<=L+EPS&&it.l<=W+EPS)));
  if(bad)return {error:bad,sheets:[]};
  const orders=[
    (a,b)=>b.l*b.w-a.l*a.w,
    (a,b)=>Math.max(b.l,b.w)-Math.max(a.l,a.w),
    (a,b)=>Math.min(b.l,b.w)-Math.min(a.l,a.w),
    (a,b)=>(b.l+b.w)-(a.l+a.w),
    (a,b)=>b.w-a.w||b.l-a.l,
    (a,b)=>b.l-a.l||b.w-a.w
  ];
  let best=null;
  for(const ord of orders)for(const split of [0,1,2])for(const fit of [0,1]){
    const r=run([...items].sort(ord),split,fit);
    if(!best||better(r,best))best=r;
  }
  return best;
  function run(list,split,fit){
    const sheets=[];
    for(const it of list){
      let ok=false;
      for(const sh of sheets){if(place(sh,it,split,fit)){ok=true;break;}}
      if(!ok){const sh={free:[{x:0,y:0,w:L,h:W}],parts:[]};sheets.push(sh);place(sh,it,split,fit);}
    }
    return {sheets};
  }
  function place(sh,it,split,fit){
    let bi=-1,bo=null,bs=Infinity;
    sh.free.forEach((f,i)=>{
      const opts=[[it.l,it.w,false]];
      if(rot&&Math.abs(it.l-it.w)>EPS)opts.push([it.w,it.l,true]);
      for(const [pw,ph,r] of opts){
        if(pw<=f.w+EPS&&ph<=f.h+EPS){
          const s=fit?Math.min(f.w-pw,f.h-ph):(f.w*f.h-pw*ph);
          if(s<bs-EPS){bs=s;bi=i;bo={pw,ph,r};}
        }
      }
    });
    if(bi<0)return false;
    const f=sh.free[bi];sh.free.splice(bi,1);
    sh.parts.push(Object.assign({},it,{x:f.x,y:f.y,pw:bo.pw,ph:bo.ph,rot:bo.r}));
    const ow=Math.min(bo.pw+k,f.w),oh=Math.min(bo.ph+k,f.h),rw=f.w-ow,rh=f.h-oh;
    const vertical=split===0?rw>=rh:split===1?rw<rh:true;
    let a,b;
    if(vertical){a={x:f.x+ow,y:f.y,w:rw,h:f.h};b={x:f.x,y:f.y+oh,w:ow,h:rh};}
    else{a={x:f.x+ow,y:f.y,w:rw,h:oh};b={x:f.x,y:f.y+oh,w:f.w,h:rh};}
    [a,b].forEach(q=>{if(q.w>0.5&&q.h>0.5)sh.free.push(q);});
    return true;
  }
  function better(a,b){
    if(a.sheets.length!==b.sheets.length)return a.sheets.length<b.sheets.length;
    return maxFree(a)>maxFree(b)+EPS;
  }
  function maxFree(r){let m=0;r.sheets.forEach(s=>s.free.forEach(f=>{m=Math.max(m,f.w*f.h);}));return m;}
}
