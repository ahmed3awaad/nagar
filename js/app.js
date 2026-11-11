const $=s=>document.querySelector(s);
const fmt=(x,d=1)=>Number.isFinite(x)?(Math.round(x*10**d)/10**d).toLocaleString("ar-EG",{maximumFractionDigits:d}):"—";
const money=x=>Number.isFinite(x)?Math.round(x).toLocaleString("ar-EG")+" ج":"—";
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const num=v=>{const n=parseFloat(v);return Number.isFinite(n)?n:0;};
const clampInt=(v,a,b)=>Math.max(a,Math.min(b,Math.round(num(v))||a));

/* ---------- saved state ---------- */
const DEF_S={T:1.8,kerf:0.4,sheetL:244,sheetW:122,grain:false,fullSheets:true,
  flipP:11.5,flipS:3.5,flipG0:1,cupEdge:2.2,cupPlate:3.7,cupEnd:10,
  pSheet:0,pBack:0,pEdge:0,pFlip:0,pCup:0,pMisc:0,pLabor:0,profit:30};
const DEF_P={type:"shoe",qty:1,
  shoe:{H:108,W:100,D:27,N:3,h:35,over:true},
  cab:{H:180,W:90,D:50,doors:2,shelves:3},
  shelf:{H:180,W:80,D:30,shelves:4},
  extra:[]};
function load(k,def){
  const out=JSON.parse(JSON.stringify(def));
  try{const v=JSON.parse(localStorage.getItem("nagara-"+k)||"null");
    if(v&&typeof v==="object")for(const key in v){
      if(out[key]&&typeof out[key]==="object"&&!Array.isArray(out[key])&&v[key]&&typeof v[key]==="object")Object.assign(out[key],v[key]);
      else if(key in out)out[key]=v[key];
    }}catch(e){}
  return out;
}
function save(){try{localStorage.setItem("nagara-s",JSON.stringify(S));localStorage.setItem("nagara-p",JSON.stringify(P));}catch(e){}}
let S=load("s",DEF_S),P=load("p",DEF_P);

/* ---------- project types ---------- */
const ICON={
  shoe:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="8" y="6" width="32" height="38" rx="2"/><path d="M11 9h26v10H11zM11 21h26v10H11zM11 33h26v8H11z"/></svg>',
  cab:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="8" y="4" width="32" height="40" rx="2"/><path d="M24 4v40M20 22v5M28 22v5"/></svg>',
  shelf:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="8" y="4" width="32" height="40" rx="2"/><path d="M8 14h32M8 24h32M8 34h32"/></svg>',
  free:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="6" y="10" width="36" height="28" rx="2"/><path d="M6 24h20M26 10v28" stroke-dasharray="3 3"/></svg>'
};
const TYPES=[
  {id:"shoe",name:"جزامة قلابة",sub:"مفصلة وسام"},
  {id:"cab",name:"دولاب بضلف",sub:"مفصلة سوستة"},
  {id:"shelf",name:"مكتبة رفوف",sub:"مفتوحة"},
  {id:"free",name:"شغل حر",sub:"قطع بس"}
];
const FORMS={
  shoe:[["H","الارتفاع من جوه","من الأرضية للسطح"],["W","العرض من جوه","بين الجنبين"],["D","العمق","عرض لوح الجنب"],["N","عدد الضلف",""],["h","ارتفاع الضلفة",""]],
  cab:[["H","الارتفاع من بره","الدولاب كله"],["W","العرض من بره",""],["D","العمق","عرض لوح الجنب"],["doors","عدد الضلف","1 أو 2"],["shelves","عدد الرفوف",""]],
  shelf:[["H","الارتفاع من بره",""],["W","العرض من بره",""],["D","العمق",""],["shelves","عدد الرفوف",""]],
  free:[]
};
const nameAt=(i,N,word)=>N===1?word:(i===N-1?word+" اللي فوق":i===0?word+" التحتانية":word+" رقم "+(i+1).toLocaleString("ar-EG"));

/* ---------- side-panel drawing ---------- */
function panelSVG(L,Wd,marks,caption,frontLabel){
  const Wpx=200,Hpx=360,pad=22;
  const sc=Math.min((Hpx-2*pad-16)/Math.max(L,1),(Wpx-96)/Math.max(Wd,1));
  const pw=Wd*sc,ph=L*sc,x0=(Wpx-pw)/2+16,y0=pad,front=x0+pw,yOf=c=>y0+ph-c*sc;
  let g=`<rect x="${x0}" y="${y0}" width="${pw}" height="${ph}" fill="${css("--wood")}" stroke="${css("--woodEdge")}" stroke-width="1.5" rx="2"/>`;
  g+=`<line x1="${front}" y1="${y0}" x2="${front}" y2="${y0+ph}" stroke="${css("--tape")}" stroke-width="3"/>`;
  g+=`<text x="${front}" y="${y0-7}" fill="${css("--ink")}" font-size="11" font-weight="600" text-anchor="middle">${frontLabel||"قدام"}</text>`;
  g+=`<text x="${x0+pw/2}" y="${Hpx-4}" fill="${css("--muted")}" font-size="11" text-anchor="middle">${caption}</text>`;
  let lastY=-99;
  [...marks].sort((a,b)=>a.h-b.h).forEach(m=>{
    const y=yOf(m.h);
    if(m.line){
      const t=Math.max(2,S.T*sc);
      g+=`<rect x="${x0}" y="${y-t}" width="${pw}" height="${t}" fill="${css("--tape")}" opacity=".55"/>`;
    }else{
      const x=front-m.in*sc;
      g+=`<line x1="${x0-3}" y1="${y}" x2="${x}" y2="${y}" stroke="${css("--mark")}" stroke-dasharray="3 3"/>`;
      g+=`<circle cx="${x}" cy="${y}" r="${m.ring?7:5.5}" fill="${m.ring?"none":css("--mark")}" stroke="${css("--mark")}" stroke-width="2.5"/>`;
    }
    if(Math.abs(lastY-y)>=12){
      g+=`<text x="${x0-7}" y="${y+4}" fill="${css("--ink")}" font-size="12" font-weight="600" text-anchor="end">${fmt(m.h)}</text>`;
      lastY=y;
    }
  });
  return `<svg width="${Wpx}" height="${Hpx}" viewBox="0 0 ${Wpx} ${Hpx}" role="img" aria-label="${caption}">${g}</svg>`;
}

/* ---------- builders: each returns parts, drilling, 3D boxes ---------- */
function buildShoe(o){
  const T=S.T,g0=S.flipG0,p=S.flipP,s=S.flipS;
  const H=num(o.H),W=num(o.W),D=num(o.D),N=clampInt(o.N,1,6),h=num(o.h),over=!!o.over;
  const free=H-N*h-g0,gap=free/N;
  const sug=Math.floor(((H-g0)/N-0.6)*10)/10;
  const flaps=[];for(let i=0;i<N;i++){const b=g0+i*(h+gap);flaps.push({b,pivot:b+p});}
  const topL=W+2*T+(over?2:0),topD=D+(over?1:0),fw=W-0.4;
  const parts=[
    {name:"جنب",kind:"side",l:H,w:D,qty:2,edge:H},
    {name:"أرضية",kind:"top",l:W+2*T,w:D,qty:1,edge:W+2*T},
    {name:"سطح",kind:"top",l:topL,w:topD,qty:1,edge:topL+2*topD},
    {name:"ضلفة",kind:"flap",l:fw,w:h,qty:N,edge:2*(fw+h)},
    {name:"ضهر",kind:"back",mat:"back",l:W+2*T,w:H+T,qty:1,edge:0}
  ];
  let status;
  if(!(H>0&&W>0&&D>0&&h>0))status=["bad","اكتب كل المقاسات."];
  else if(free<0)status=["bad",`الضلف أطول من الجزامة بـ ${fmt(-free)} سم. خلي الضلفة ${fmt(sug)} سم.`];
  else if(gap<0.2)status=["bad",`الضلف هتحك في بعض، الفاصل ${fmt(gap*10)} مللي بس. خلي الضلفة ${fmt(sug)} سم.`];
  else if(gap>1.5)status=["warn",`هتقفل، بس فيه فراغ ${fmt(gap)} سم بين الضلف وشكله مش حلو. الأحسن ضلفة ${fmt(sug)} سم.`];
  else status=["ok",`تمام، هتقفل كويس. فيه ${fmt(gap*10)} مللي بين كل ضلفة والتانية.`];
  if(W>80&&status[0]==="ok")status=["ok",status[1]+" الضلفة عرضها "+fmt(fw)+" سم، ولو الخشب PVC ممكن تتقوس مع الوقت."];
  const marks=flaps.map((f,i)=>({t:nameAt(i,N,"الضلفة"),n:f.pivot})).reverse();
  const drill={title:"اخرم فين على الجنب",
    svgs:[panelSVG(H,D,flaps.map(f=>({h:f.pivot,in:s})),"الجنب من جوه — تحت")],
    marks,
    tip:`قيس من <b>طرف الجنب اللي تحت</b> (الجنب واقف على الأرضية)، وكل النقط على بعد <b>${fmt(s)} سم</b> من الحرف اللي قدام. اعمل الجنب التاني زيه بالظبط.`};
  const boxes=[
    {kind:"top",w:W+2*T,h:T,d:D,x:0,y:T/2,z:0},
    {kind:"side",w:T,h:H,d:D,x:-(W/2+T/2),y:T+H/2,z:0},
    {kind:"side",w:T,h:H,d:D,x:W/2+T/2,y:T+H/2,z:0},
    {kind:"top",w:topL,h:T,d:topD,x:0,y:T+H+T/2,z:over?0.5:0},
    {kind:"back",w:W+2*T,h:H+T,d:0.3,x:0,y:(H+T)/2,z:-D/2-0.15}
  ];
  flaps.forEach(f=>boxes.push({kind:"flap",w:fw,h:h,d:T,x:0,y:T+f.b+h/2,z:D/2-T/2,
    hinge:{axis:"x",px:0,py:T+f.pivot,pz:D/2-s,sign:1,max:40}}));
  const dots=[];flaps.forEach(f=>[-1,1].forEach(sd=>dots.push({x:sd*W/2,y:T+f.pivot,z:D/2-s})));
  return {parts,status,drill,boxes,dots,hw:{flip:2*N,cup:0},sug,hinged:true};
}

function carcass(H,W,D,ns){
  const T=S.T,Wi=W-2*T,Hi=H-2*T;
  const space=(Hi-ns*T)/(ns+1);
  const shelfY=[];for(let i=0;i<ns;i++)shelfY.push(T+(i+1)*space+i*T);
  const parts=[
    {name:"جنب",kind:"side",l:H,w:D,qty:2,edge:H},
    {name:"سقف وأرضية",kind:"top",l:Wi,w:D,qty:2,edge:Wi}
  ];
  if(ns>0)parts.push({name:"رف",kind:"shelf",l:Wi-0.2,w:D-2,qty:ns,edge:Wi-0.2});
  parts.push({name:"ضهر",kind:"back",mat:"back",l:W,w:H,qty:1,edge:0});
  const boxes=[
    {kind:"side",w:T,h:H,d:D,x:-(W/2-T/2),y:H/2,z:0},
    {kind:"side",w:T,h:H,d:D,x:W/2-T/2,y:H/2,z:0},
    {kind:"top",w:Wi,h:T,d:D,x:0,y:T/2,z:0},
    {kind:"top",w:Wi,h:T,d:D,x:0,y:H-T/2,z:0},
    {kind:"back",w:W,h:H,d:0.3,x:0,y:H/2,z:-D/2-0.15}
  ];
  shelfY.forEach(y=>boxes.push({kind:"shelf",w:Wi-0.2,h:T,d:D-2,x:0,y:y+T/2,z:-1}));
  return {parts,boxes,shelfY,space,Wi,Hi};
}

function buildCab(o){
  const T=S.T,H=num(o.H),W=num(o.W),D=num(o.D),n=clampInt(o.doors,1,2),ns=clampInt(o.shelves,0,10);
  const c=carcass(H,W,D,ns);
  const dh=H-0.3,dw=(W-0.3*n)/n;
  const nh=dh<=90?2:dh<=160?3:dh<=200?4:5;
  const hpos=[];for(let i=0;i<nh;i++)hpos.push(S.cupEnd+i*(dh-2*S.cupEnd)/(nh-1));
  const parts=c.parts.slice(0,-1);
  parts.push({name:"ضلفة",kind:"flap",l:dh,w:dw,qty:n,edge:2*(dw+dh)});
  parts.push(c.parts[c.parts.length-1]);
  let status;
  if(!(H>0&&W>0&&D>0))status=["bad","اكتب كل المقاسات."];
  else if(dw>60)status=["warn",`الضلفة عرضها ${fmt(dw)} سم، عريضة أوي وهتهبط. ${n===1?"خليها ضلفتين":"الأحسن تعمل دولابين جنب بعض"}.`];
  else if(ns>0&&c.space<18)status=["warn",`الرفوف قريبة أوي من بعض (${fmt(c.space)} سم). قلل عدد الرفوف.`];
  else status=["ok",`تمام. كل ضلفة محتاجة ${nh.toLocaleString("ar-EG")} مفصلات، والمسافة بين الرفوف ${fmt(c.space)} سم.`];
  const marks=[{group:"المفصلات — من تحت الضلفة"}];
  [...hpos].reverse().forEach((h,i)=>marks.push({t:i===0?"المفصلة اللي فوق":i===nh-1?"المفصلة اللي تحت":"مفصلة في النص",n:h}));
  if(ns){marks.push({group:"الرفوف — من تحت الجنب"});[...c.shelfY].reverse().forEach((y,i)=>marks.push({t:"رف رقم "+(ns-i).toLocaleString("ar-EG"),n:y}));}
  const drill={title:"اخرم فين على الضلفة والجنب",
    svgs:[panelSVG(dh,Math.min(dw,60),hpos.map(h=>({h,in:S.cupEdge,ring:true})),"الضلفة من ورا","ناحية المفصلة"),
          panelSVG(H,D,[...hpos.map(h=>({h:h+0.15,in:S.cupPlate})),...c.shelfY.map(y=>({h:y,line:true}))],"الجنب من جوه")],
    marks,
    tip:`<b>الضلفة:</b> بنطة 35 مللي، سنترها على بعد <b>${fmt(S.cupEdge)} سم</b> من حرف الضلفة اللي ناحية المفصلة. <b>الجنب:</b> علّم على بعد <b>${fmt(S.cupPlate)} سم</b> من الحرف اللي قدام، على الأرقام اللي في رسمة الجنب. الشريط البرتقاني مكان الرف.`};
  const boxes=c.boxes.slice();
  const doorZ=D/2+T/2;
  if(n===1)boxes.push({kind:"flap",w:dw,h:dh,d:T,x:0,y:0.15+dh/2,z:doorZ,hinge:{axis:"y",px:-W/2+0.15,py:0,pz:D/2,sign:-1,max:100}});
  else{
    boxes.push({kind:"flap",w:dw,h:dh,d:T,x:-W/2+0.15+dw/2,y:0.15+dh/2,z:doorZ,hinge:{axis:"y",px:-W/2+0.15,py:0,pz:D/2,sign:-1,max:100}});
    boxes.push({kind:"flap",w:dw,h:dh,d:T,x:W/2-0.15-dw/2,y:0.15+dh/2,z:doorZ,hinge:{axis:"y",px:W/2-0.15,py:0,pz:D/2,sign:1,max:100}});
  }
  const dots=[];(n===1?[-1]:[-1,1]).forEach(sd=>hpos.forEach(h=>dots.push({x:sd*(W/2-T),y:h+0.15,z:D/2-S.cupPlate})));
  return {parts,status,drill,boxes,dots,hw:{flip:0,cup:nh*n},hinged:true};
}

function buildShelf(o){
  const H=num(o.H),W=num(o.W),D=num(o.D),ns=clampInt(o.shelves,0,12);
  const c=carcass(H,W,D,ns);
  let status;
  if(!(H>0&&W>0&&D>0))status=["bad","اكتب كل المقاسات."];
  else if(c.Wi>90)status=["warn",`الرف عرضه ${fmt(c.Wi)} سم، ممكن يهبط من الوزن. حط قاطوع في النص أو قسّمها مكتبتين.`];
  else if(ns>0&&c.space<18)status=["warn",`الرفوف قريبة أوي (${fmt(c.space)} سم). قلل عدد الرفوف.`];
  else status=["ok",`تمام. المسافة بين كل رف والتاني ${fmt(c.space)} سم.`];
  const marks=ns?[...c.shelfY].reverse().map((y,i)=>({t:"رف رقم "+(ns-i).toLocaleString("ar-EG"),n:y})):[];
  const drill={title:"الرفوف فين على الجنب",
    svgs:[panelSVG(H,D,c.shelfY.map(y=>({h:y,line:true})),"الجنب من جوه")],
    marks,
    tip:`الأرقام دي مكان <b>تحت الرف</b>، مقاسة من طرف الجنب اللي تحت. علّم الجنبين مع بعض وهما نايمين جنب بعض.`};
  return {parts:c.parts,status,drill,boxes:c.boxes,dots:[],hw:{flip:0,cup:0},hinged:false};
}

function buildFree(){
  return {parts:[],status:["ok","اكتب القطع اللي عايزها في صفحة التقطيع، وهتطلعلك رسمة التقطيع والحساب."],drill:null,boxes:[],dots:[],hw:{flip:0,cup:0},hinged:false};
}
const BUILD={shoe:buildShoe,cab:buildCab,shelf:buildShelf,free:buildFree};

/* ---------- cutting ---------- */
function computeCut(B){
  const q=clampInt(P.qty,1,50),main=[],back=[];
  B.parts.forEach(p=>{if(p.l>0&&p.w>0)for(let i=0;i<p.qty*q;i++)(p.mat==="back"?back:main).push({name:p.name,kind:p.kind,l:p.l,w:p.w});});
  P.extra.forEach(e=>{const l=num(e.l),w=num(e.w),n=clampInt(e.qty,0,200);if(l>0&&w>0)for(let i=0;i<n;i++)main.push({name:e.name||"قطعة",kind:"extra",l,w});});
  const L=num(S.sheetL),W=num(S.sheetW),k=num(S.kerf);
  const pm=main.length&&L>0&&W>0?pack(main,L,W,k,!S.grain):{sheets:[]};
  const pb=back.length&&L>0&&W>0?pack(back,L,W,k,true):{sheets:[]};
  const area=a=>a.reduce((s,it)=>s+it.l*it.w,0);
  let edge=0;B.parts.forEach(p=>edge+=p.edge*p.qty*q);
  return {q,main:pm,back:pb,mainArea:area(main),backArea:area(back),L,W,edgeM:edge/100*1.1};
}
const KCOL={side:"--pSide",top:"--pTop",flap:"--pFlap",shelf:"--pShelf",extra:"--pExtra",back:"--pTop"};
function sheetSVG(sh,L,W){
  const fg=css("--ink"),edge=css("--woodEdge"),muted=css("--muted");
  let g=`<rect x="0" y="0" width="${L}" height="${W}" fill="${css("--left")}" stroke="${edge}" stroke-width=".6"/>`;
  sh.free.forEach(f=>{
    if(Math.min(f.w,f.h)>=15&&f.w*f.h>=500){
      const t=`باقي ${fmt(f.w,0)}×${fmt(f.h,0)}`,fs=Math.min(4.2,f.h/2.2,f.w/(t.length*0.62));
      g+=`<rect x="${f.x+.6}" y="${f.y+.6}" width="${f.w-1.2}" height="${f.h-1.2}" fill="none" stroke="${muted}" stroke-width=".35" stroke-dasharray="2 1.5"/>`;
      if(fs>=2)g+=`<text x="${f.x+f.w/2}" y="${f.y+f.h/2}" font-size="${fs}" fill="${muted}" text-anchor="middle" dominant-baseline="central">${t}</text>`;
    }
  });
  sh.parts.forEach(p=>{
    g+=`<rect x="${p.x}" y="${p.y}" width="${p.pw}" height="${p.ph}" fill="${css(KCOL[p.kind]||"--pExtra")}" stroke="${edge}" stroke-width=".45"/>`;
    const dim=`${fmt(p.l)}×${fmt(p.w)}`;
    const fs=Math.min(5.2,p.ph/3.4,p.pw/(Math.max(p.name.length,dim.length)*0.62));
    if(fs>=2){
      g+=`<text x="${p.x+p.pw/2}" y="${p.y+p.ph/2-fs*0.62}" font-size="${fs}" font-weight="600" fill="${fg}" text-anchor="middle" dominant-baseline="central">${p.name}</text>`;
      g+=`<text x="${p.x+p.pw/2}" y="${p.y+p.ph/2+fs*0.62}" font-size="${fs*0.85}" fill="${fg}" text-anchor="middle" dominant-baseline="central">${dim}</text>`;
    }else{
      const fs2=Math.min(p.ph/1.5,p.pw/(dim.length*0.62));
      if(fs2>=1.6)g+=`<text x="${p.x+p.pw/2}" y="${p.y+p.ph/2}" font-size="${fs2}" fill="${fg}" text-anchor="middle" dominant-baseline="central">${dim}</text>`;
    }
  });
  return `<svg viewBox="-1 -1 ${L+2} ${W+2}" role="img" aria-label="رسمة تقطيع اللوح">${g}</svg>`;
}

/* ---------- render ---------- */
let B=null,CUT=null,lastType=null;
function update(){
  B=BUILD[P.type](P[P.type]||{});
  CUT=computeCut(B);
  renderPlan();renderCut();renderPrice();
  save();
}
function renderTypes(){
  $("#types").innerHTML=TYPES.map(t=>`<button class="type" type="button" data-type="${t.id}" aria-pressed="${t.id===P.type}">${ICON[t.id]}<strong>${t.name}</strong><span>${t.sub}</span></button>`).join("");
  document.querySelectorAll(".type").forEach(b=>b.onclick=()=>{P.type=b.dataset.type;renderTypes();renderForm();update();});
}
function renderForm(){
  const o=P[P.type]||{};
  $("#form").innerHTML=FORMS[P.type].map(([k,l,s])=>`<div class="f"><label for="f-${k}">${l}</label>${s?`<small>${s}</small>`:""}<input id="f-${k}" type="number" inputmode="decimal" step="${k==="N"||k==="doors"||k==="shelves"?1:0.1}" value="${o[k]}">${k==="h"?'<span class="sug" id="sug"></span>':""}</div>`).join("")
    +(P.type!=="free"?`<div class="f"><label for="f-qty">هتعمل كام واحدة</label><small>من نفس المقاس</small><input id="f-qty" type="number" inputmode="numeric" min="1" max="50" step="1" value="${P.qty}"></div>`:"");
  $("#formExtra").innerHTML=P.type==="shoe"?`<label class="check"><input type="checkbox" id="f-over" ${o.over?"checked":""}> السطح طالع سنتي من الجنبين وقدام</label>`:"";
  FORMS[P.type].forEach(([k])=>$("#f-"+k).addEventListener("input",e=>{P[P.type][k]=e.target.value;update();}));
  const fq=$("#f-qty");if(fq)fq.addEventListener("input",e=>{P.qty=e.target.value;$("#cutQty").value=e.target.value;update();});
  const ov=$("#f-over");if(ov)ov.addEventListener("change",e=>{P.shoe.over=e.target.checked;update();});
}
function renderPlan(){
  const st=$("#status");st.className="status "+B.status[0];st.textContent=B.status[1];
  const sug=$("#sug");
  if(sug&&B.sug>0){sug.innerHTML=`المناسب: ${fmt(B.sug)} سم <button type="button" id="useSug">استخدمه</button>`;
    $("#useSug").onclick=()=>{P.shoe.h=B.sug;$("#f-h").value=B.sug;update();};}
  else if(sug)sug.textContent="";
  $("#drillCard").hidden=!B.drill;
  if(B.drill){
    $("#drillTitle").textContent=B.drill.title;
    $("#svgs").innerHTML=B.drill.svgs.join("");
    $("#marks").innerHTML=B.drill.marks.length?B.drill.marks.map(m=>m.group?`<li class="group">${m.group}</li>`:`<li><span class="t">${m.t}</span><span class="n">${fmt(m.n)} سم</span></li>`).join(""):'<li><span class="t">مفيش رفوف</span></li>';
    $("#tip").innerHTML=B.drill.tip;
  }
  $("#card3d").hidden=!B.boxes.length;$("#openRow").hidden=!B.hinged;
  build3D();
  // parts
  const q=CUT.q;
  const rows=B.parts.map(p=>`<tr><td>${p.name}</td><td>${fmt(p.l)} × ${fmt(p.w)}</td><td>${(p.qty*q).toLocaleString("ar-EG")}</td><td>${p.mat==="back"?"لوح 3 مللي":"الخشب"}</td></tr>`).join("");
  $("#partsTable").innerHTML=B.parts.length?`<thead><tr><th>القطعة</th><th>المقاس (سم)</th><th>العدد</th><th>من</th></tr></thead><tbody>${rows}</tbody>`:"";
  const chips=[];
  if(CUT.main.sheets.length)chips.push(["ألواح خشب",CUT.main.sheets.length.toLocaleString("ar-EG"),true]);
  if(CUT.back.sheets.length)chips.push(["ألواح ضهر",CUT.back.sheets.length.toLocaleString("ar-EG")]);
  if(CUT.edgeM>0)chips.push(["شريط حرف",fmt(CUT.edgeM,0)+" متر"]);
  if(B.hw.flip)chips.push(["مفصلات قلابة",(B.hw.flip*q).toLocaleString("ar-EG")]);
  if(B.hw.cup)chips.push(["مفصلات سوستة",(B.hw.cup*q).toLocaleString("ar-EG")]);
  $("#planChips").innerHTML=chips.map(c=>`<div class="chip ${c[2]?"big":""}"><div class="k">${c[0]}</div><div class="v">${c[1]}</div></div>`).join("");
}
function renderCut(){
  const {main,back,L,W,q}=CUT;
  $("#cutQty").value=P.qty;
  document.querySelectorAll("#presets button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.l==S.sheetL&&b.dataset.w==S.sheetW));
  const err=$("#cutErr");
  if(main.error){err.hidden=false;err.textContent=`القطعة "${main.error.name}" (${fmt(main.error.l)}×${fmt(main.error.w)}) أكبر من اللوح. كبّر مقاس اللوح أو صغّر القطعة.`;}
  else err.hidden=true;
  const used=main.sheets.length?CUT.mainArea/(main.sheets.length*L*W)*100:0;
  const chips=[["ألواح خشب",main.sheets.length.toLocaleString("ar-EG"),true],["مستخدم من الخشب",fmt(used,0)+"٪"]];
  if(back.sheets.length)chips.push(["ألواح ضهر 3 مللي",back.sheets.length.toLocaleString("ar-EG")]);
  if(P.type!=="free")chips.push(["العدد",q.toLocaleString("ar-EG")+" "+(TYPES.find(t=>t.id===P.type).name)]);
  $("#cutChips").innerHTML=chips.map(c=>`<div class="chip ${c[2]?"big":""}"><div class="k">${c[0]}</div><div class="v">${c[1]}</div></div>`).join("");
  const legend=`<div class="legend"><span><i style="background:var(--pSide)"></i>جنوب</span><span><i style="background:var(--pTop)"></i>سقف وأرضية</span><span><i style="background:var(--pFlap)"></i>ضلف</span><span><i style="background:var(--pShelf)"></i>رفوف</span><span><i style="background:var(--pExtra)"></i>قطع زيادة</span></div>`;
  $("#sheets").innerHTML=main.sheets.map((sh,i)=>{
    const a=sh.parts.reduce((s,p)=>s+p.l*p.w,0)/(L*W)*100;
    return `<div class="card sheet"><h3>لوح ${(i+1).toLocaleString("ar-EG")} <span>${fmt(L)} × ${fmt(W)} — مستخدم ${fmt(a,0)}٪</span></h3>${sheetSVG(sh,L,W)}${i===0?legend:""}</div>`;
  }).join("")+(back.sheets.length?`<div class="card sheet"><h3>ضهر (لوح 3 مللي) <span>${back.sheets.length.toLocaleString("ar-EG")} لوح</span></h3>${back.sheets.map(sh=>sheetSVG(sh,L,W)).join("")}</div>`:"");
  renderExtra();
}
function renderExtra(){
  const box=$("#extra");
  if(document.activeElement&&box.contains(document.activeElement))return;
  box.innerHTML=P.extra.length?P.extra.map((e,i)=>`<div class="xrow" data-i="${i}">
    <div><label for="x-n-${i}">اسمها</label><input id="x-n-${i}" data-k="name" value="${(e.name||"").replace(/"/g,"&quot;")}" style="text-align:right"></div>
    <div><label for="x-l-${i}">الطول</label><input id="x-l-${i}" data-k="l" type="number" inputmode="decimal" value="${e.l}"></div>
    <div><label for="x-w-${i}">العرض</label><input id="x-w-${i}" data-k="w" type="number" inputmode="decimal" value="${e.w}"></div>
    <div><label for="x-q-${i}">العدد</label><input id="x-q-${i}" data-k="qty" type="number" inputmode="numeric" value="${e.qty}"></div>
    <button type="button" data-del="${i}" aria-label="امسح القطعة">✕</button></div>`).join(""):'<p class="hint" style="margin:0">مفيش قطع زيادة.</p>';
  box.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",()=>{const i=+inp.closest(".xrow").dataset.i;P.extra[i][inp.dataset.k]=inp.value;update();}));
  box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{P.extra.splice(+b.dataset.del,1);update();renderExtraForce();});
}
function renderExtraForce(){document.activeElement&&document.activeElement.blur();renderExtra();}
$("#addExtra").onclick=()=>{P.extra.push({name:"رف",l:60,w:25,qty:1});document.activeElement.blur();update();};

function renderPrice(){
  const q=CUT.q,L=CUT.L,W=CUT.W;
  const mN=S.fullSheets?CUT.main.sheets.length:(L*W?CUT.mainArea/(L*W):0);
  const bN=S.fullSheets?CUT.back.sheets.length:(L*W?CUT.backArea/(L*W):0);
  const flip=B.hw.flip*q,cup=B.hw.cup*q;
  const rows=[
    ["ألواح الخشب",`${fmt(mN,2)} × ${money(num(S.pSheet))}`,mN*num(S.pSheet)],
    ["ألواح الضهر",`${fmt(bN,2)} × ${money(num(S.pBack))}`,bN*num(S.pBack)],
    ["شريط الحرف",`${fmt(CUT.edgeM,0)} متر`,CUT.edgeM*num(S.pEdge)],
    ["مفصلات قلابة",`${flip.toLocaleString("ar-EG")}`,flip*num(S.pFlip)],
    ["مفصلات سوستة",`${cup.toLocaleString("ar-EG")}`,cup*num(S.pCup)],
    ["مسامير وحاجات",`× ${q.toLocaleString("ar-EG")}`,q*num(S.pMisc)],
    ["المصنعية",`× ${q.toLocaleString("ar-EG")}`,q*num(S.pLabor)]
  ].filter(r=>!(r[0].startsWith("مفصلات")&&r[1]==="٠")&&!(r[0]==="ألواح الضهر"&&!bN));
  const cost=rows.reduce((s,r)=>s+r[2],0),price=cost*(1+num(S.profit)/100);
  $("#priceTitle").textContent=q>1?`الحساب لـ ${q.toLocaleString("ar-EG")} قطع`:"الحساب";
  $("#priceTable").innerHTML=`<thead><tr><th>البند</th><th>الكمية</th><th>التمن</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${money(r[2])}</td></tr>`).join("")}</tbody><tfoot><tr><td>التكلفة</td><td></td><td>${money(cost)}</td></tr></tfoot>`;
  const big=[["التكلفة",money(cost)],["سعر البيع",money(price),true],["المكسب",money(price-cost)]];
  if(q>1)big.push(["سعر الواحدة",money(price/q)]);
  $("#priceBig").innerHTML=big.map(c=>`<div class="chip ${c[2]?"big":""}"><div class="k">${c[0]}</div><div class="v">${c[1]}</div></div>`).join("");
  $("#priceHint").textContent=cost===0?"اكتب الأسعار اللي فوق عشان يطلعلك الحساب.":"سعر البيع = التكلفة + نسبة المكسب.";
}

/* ---------- settings forms ---------- */
function bindNum(id,key,cb){const el=$(id);el.value=S[key];el.addEventListener("input",()=>{S[key]=num(el.value);update();cb&&cb();});}
function fieldsHTML(list,prefix){return list.map(([k,l,s])=>`<div class="f"><label for="${prefix}${k}">${l}</label>${s?`<small>${s}</small>`:""}<input id="${prefix}${k}" type="number" inputmode="decimal" step="0.1"></div>`).join("");}
const WOOD=[["T","تخانة الخشب","عادة 1.8 سم"]];
const FLIP=[["flipP","النقطة اللي بتلف عليها","بعيدة قد إيه عن تحت الضلفة"],["flipS","الدخول لجوه","من الحرف اللي قدام للخرم"],["flipG0","فراغ تحت أول ضلفة","عشان متحكّش في الأرضية"]];
const CUP=[["cupEdge","سنتر البنطة 35 مللي","من حرف الضلفة"],["cupPlate","خرم القاعدة على الجنب","من الحرف اللي قدام"],["cupEnd","أول وآخر مفصلة","من طرف الضلفة"]];
const PRICES=[["pSheet","سعر لوح الخشب",""],["pBack","سعر لوح الضهر","3 مللي"],["pEdge","سعر متر شريط الحرف",""],["pFlip","سعر المفصلة القلابة","الواحدة"],["pCup","سعر المفصلة السوستة","الواحدة"],["pMisc","مسامير وحاجات تانية","للقطعة الواحدة"],["pLabor","المصنعية","للقطعة الواحدة"],["profit","نسبة المكسب","٪ فوق التكلفة"]];
$("#setupWood").innerHTML=fieldsHTML(WOOD,"s-");
$("#setupFlip").innerHTML=fieldsHTML(FLIP,"s-");
$("#setupCup").innerHTML=fieldsHTML(CUP,"s-");
$("#priceForm").innerHTML=fieldsHTML(PRICES,"s-");
function bindAll(){[...WOOD,...FLIP,...CUP,...PRICES].forEach(([k])=>bindNum("#s-"+k,k));["sheetL","sheetW","kerf"].forEach(k=>bindNum("#s-"+k,k));}
bindAll();
$("#s-grain").checked=!!S.grain;$("#s-grain").onchange=e=>{S.grain=e.target.checked;update();};
$("#s-fullSheets").checked=!!S.fullSheets;$("#s-fullSheets").onchange=e=>{S.fullSheets=e.target.checked;update();};
$("#cutQty").addEventListener("input",e=>{P.qty=e.target.value;const f=$("#f-qty");if(f)f.value=e.target.value;update();});
$("#presets").innerHTML=[[244,122],[244,183],[280,210]].map(([l,w])=>`<button type="button" data-l="${l}" data-w="${w}">${fmt(w,0)} × ${fmt(l,0)}</button>`).join("");
document.querySelectorAll("#presets button").forEach(b=>b.onclick=()=>{S.sheetL=+b.dataset.l;S.sheetW=+b.dataset.w;$("#s-sheetL").value=S.sheetL;$("#s-sheetW").value=S.sheetW;update();});
$("#resetSetup").onclick=()=>{["T","flipP","flipS","flipG0","cupEdge","cupPlate","cupEnd"].forEach(k=>{S[k]=DEF_S[k];$("#s-"+k).value=S[k];});update();$("#resetMsg").textContent="رجعت المقاسات الأصلية";};

/* ---------- views (hash) ---------- */
const VIEWS=["plan","cut","price","setup"];
function showView(){
  const v=VIEWS.includes(location.hash.slice(1))?location.hash.slice(1):"plan";
  VIEWS.forEach(n=>{$("#v-"+n).hidden=n!==v;});
  document.querySelectorAll(".tabbar a").forEach(a=>{if(a.dataset.view===v)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  const names={plan:"الشغلانة",cut:"التقطيع",price:"الحساب",setup:"المقاسات"};
  $("#viewName").textContent=names[v];
  if(v==="plan")requestAnimationFrame(size);
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",showView);

/* ---------- 3D ---------- */
const view=$("#view3d");let renderer,scene,camera,controls,group;const S3=0.01;
const COL3={side:0xece6dc,top:0xe4dccd,flap:0xd9cdb8,shelf:0xeae3d7,back:0xd5ccbd,extra:0xe0e0c8};
function init3D(){
  if(!window.THREE){view.innerHTML='<p class="hint" style="padding:12px;margin:0">الرسمة 3D مش قادرة تحمّل دلوقتي، بس الأرقام شغالة.</p>';return;}
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));view.appendChild(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(35,1,0.01,30);
  controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  scene.add(new THREE.HemisphereLight(0xffffff,0x887766,0.9));
  const d=new THREE.DirectionalLight(0xffffff,0.7);d.position.set(-1,2,2);scene.add(d);
  new ResizeObserver(size).observe(view);
  (function loop(){requestAnimationFrame(loop);if(!view.offsetParent)return;controls.update();renderer.render(scene,camera);})();
}
function size(){if(!renderer)return;const w=view.clientWidth,h=view.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function mesh(w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(Math.max(w,.001),Math.max(h,.001),Math.max(d,.001)),new THREE.MeshStandardMaterial({color,roughness:.8}));
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:0x8a7a66})));return m;}
function build3D(){
  if(!scene||!B)return;
  if(group){scene.remove(group);group.traverse(o=>{o.geometry&&o.geometry.dispose();o.material&&o.material.dispose();});}
  group=new THREE.Group();
  const op=num($("#open").value)/100;
  let maxX=1,maxY=1;
  B.boxes.forEach(b=>{
    const m=mesh(b.w*S3,b.h*S3,b.d*S3,COL3[b.kind]||0xe0d8ca);
    maxX=Math.max(maxX,Math.abs(b.x)+b.w/2);maxY=Math.max(maxY,b.y+b.h/2);
    if(b.hinge){
      const hg=new THREE.Group(),hz=b.hinge;
      hg.position.set(hz.px*S3,hz.py*S3,hz.pz*S3);
      m.position.set((b.x-hz.px)*S3,(b.y-hz.py)*S3,(b.z-hz.pz)*S3);hg.add(m);
      const a=hz.sign*op*hz.max*Math.PI/180;if(hz.axis==="x")hg.rotation.x=a;else hg.rotation.y=a;
      group.add(hg);
    }else{m.position.set(b.x*S3,b.y*S3,b.z*S3);group.add(m);}
  });
  B.dots.forEach(d=>{const s=new THREE.Mesh(new THREE.SphereGeometry(0.014,14,10),new THREE.MeshBasicMaterial({color:0xd23b2b}));s.position.set(d.x*S3,d.y*S3,d.z*S3);group.add(s);});
  scene.add(group);
  const H=maxY*S3,Wd=maxX*2*S3;
  controls.target.set(0,H/2,0);
  if(lastType!==P.type){const mx=Math.max(Wd,H);camera.position.set(-mx*1.1,H*0.85,mx*1.9);lastType=P.type;}
  size();
}
$("#open").addEventListener("input",build3D);

/* theme changes repaint the drawings */
try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",update);}catch(e){}

init3D();renderTypes();renderForm();showView();update();

/* ---------- install as an app ---------- */
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false;});
$("#installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();try{await deferredPrompt.userChoice;}catch(e){}deferredPrompt=null;$("#installBtn").hidden=true;};
window.addEventListener("appinstalled",()=>{$("#installBtn").hidden=true;});
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;
const standalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone;
if(isIOS&&!standalone)$("#iosHint").hidden=false;
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
