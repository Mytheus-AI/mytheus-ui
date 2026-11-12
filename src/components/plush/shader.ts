/* The plush shader: one fragment shader that raymarches a fuzzy felt creature with glossy bead
   eyes, cheeks, an accessory, a soft ground shadow and a felt fringe.

   Ported from the approved prototype (design-previews/agent-plush-avatars.html) with the material,
   lighting, eyes, cheeks and motion maths kept line for line. What changed is where the character
   comes from: the prototype hard-wired six creatures by grid cell (`gId`); here the shape, colour,
   accessory, eye style and the per-shape fit arrive as uniforms, so any of the 432 combinations in
   lib/plush.ts draws from the same program. Three more changes, none visible on the prototype's
   own stage:
   - the two eye anchors are found once in the vertex shader (they are the same for every pixel),
     not once per pixel;
   - the output is premultiplied alpha over a transparent background, so a still sits on any
     surface in either theme; the ground (shadow and colour bounce) is an overlay that `uGround`
     switches off for stills;
   - the camera is a uniform (`uView`), so a still can be framed to fill its box. */

/* Signed distances and the six bodies. Shared by both stages. */
const COMMON = /* glsl */ `
uniform int uShape;
uniform float uEyeY;
uniform float uEye;
uniform float uArc;
uniform vec2 uLook;

float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
float sdEll(vec3 p, vec3 r){ float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.)/k1; }
float sdRBox(vec3 p, vec3 b, float r){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r; }

float body(vec3 p){
  if(uShape==0){ return smin(sdEll(p-vec3(0,.02,0),vec3(.76,.70,.68)), sdEll(p-vec3(0,-.36,0),vec3(.90,.44,.74)), .35); }
  if(uShape==1){ p.y+=.13; float d=length(p-vec3(0,-.08,0))-.60;
    d=smin(d,length(p-vec3(-.52,-.26,0))-.40,.22); d=smin(d,length(p-vec3(.52,-.26,0))-.40,.22);
    d=smin(d,length(p-vec3(-.27,.34,-.02))-.38,.22); d=smin(d,length(p-vec3(.30,.30,-.02))-.36,.22); return d; }
  if(uShape==2){ return smin(length(p-vec3(0,.34,0))-.36, sdEll(p-vec3(0,-.36,0),vec3(.86,.44,.70)), .75); }
  if(uShape==3){ return sdRBox(p-vec3(0,-.10,0), vec3(.46,.40,.30), .30); }
  if(uShape==4){ float d=sdEll(p-vec3(0,-.10,0),vec3(.56,.56,.50));
    for(int k=0;k<5;k++){ float a=1.5708+6.28318*float(k)/5.; d=smin(d,length(p-vec3(cos(a)*.57,-.10+sin(a)*.57,0))-.28,.28); }
    return d; }
  float d=sdEll(p-vec3(0,-.14,0),vec3(.84,.62,.70));
  d=smin(d,length(p-vec3(-.46,.40,0))-.22,.16); d=smin(d,length(p-vec3(.46,.40,0))-.22,.16); return d;
}
float surfZ(vec2 xy){ float z=1.6; for(int i=0;i<30;i++){ float d=body(vec3(xy,z)); z-=d; if(d<.002) break; } return z; }
`;

export const PLUSH_VS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${COMMON}
in vec2 a;
flat out vec3 vEL;
flat out vec3 vER;
flat out vec3 vM;
void main(){
  vec2 eL=vec2(-.235,uEyeY)+uLook*vec2(.10,.062), eR=vec2(.235,uEyeY)+uLook*vec2(.10,.062);
  float emb = uArc>.5 ? 0. : .118*uEye*.25;
  vEL=vec3(eL,surfZ(eL)-emb); vER=vec3(eR,surfZ(eR)-emb);
  vec2 mxy=vec2(0.,uEyeY-.215)+uLook*vec2(.075,.045); vM=vec3(mxy,surfZ(mxy)-.036);
  gl_Position=vec4(a,0.,1.);
}`;

export const PLUSH_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${COMMON}
uniform vec2 uRes;
uniform vec3 uView;      // screen centre x, y and the units across the box height
uniform float uTime;
uniform float uPhase;    // the prototype's cell index: offsets grain and the thinking spark
uniform int uAcc;        // 0 none, 1 glasses, 2 headphones, 3 sprout
uniform vec3 uCol;
uniform vec4 uPhones;    // the cups' x and y (the prototype's 1.045, -.28), the band's top (.75), its squareness (2)
uniform vec2 uSprout;    // where the stem leaves the head
uniform float uHop, uSq, uTilt, uBlinkL, uBlinkR, uWink, uThink, uListen, uSpeak, uLevel, uMouth;
uniform float uGround;   // 1 draws the shadow and colour bounce under the character
uniform float uPaper;    // 1 on a light surface: the shadow keeps the prototype's warm cast
uniform float uStage;    // 1 draws the listening ripples and the speaking arcs (frames too small to hold them: 0)
flat in vec3 vEL;
flat in vec3 vER;
flat in vec3 vM;
out vec4 outC;
float gHop, gSq, gBL, gBR, gWink, gTilt, gEr, gThink, gT, gSpk, gMo; vec3 gM; vec3 gEL, gER;

float hash(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float sdTorus(vec3 p, vec2 t){ vec2 q=vec2(length(p.xy)-t.x,p.z); return length(q)-t.y; }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
float sdVesica(vec2 p, float r, float d){ p=abs(p); float b=sqrt(r*r-d*d);
  return ((p.y-b)*d>p.x*b) ? length(p-vec2(0.,b)) : length(p-vec2(-d,0.))-r; }
float leaf(vec3 a, float len){
  float k=len/.16; a/=k;
  a.y-=a.x*a.x*.9+a.z*a.z*1.6;
  float d2=sdVesica(vec2(a.z,a.x-.16),.218,.148);
  vec2 w=vec2(d2,abs(a.y)-.010);
  return (length(max(w,0.))+min(max(w.x,w.y),0.)-.014)*k;
}
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

vec3 toBody(vec3 p){
  p.y-=gHop; p.xy=rot(gTilt)*(p.xy-vec2(0,-.8))+vec2(0,-.8);
  p.y=(p.y+.8)/(1.+gSq)-.8; p.xz*=(1.+gSq*.5); return p;
}
float arcEye(vec3 e){ return max(sdTorus(e,vec2(.105,.036)),-e.y-.01); }

vec2 opU(vec2 a, vec2 b){ return a.x<b.x?a:b; }
vec2 map(vec3 p){
  vec3 q=toBody(p);
  float d=body(q)-(noise(q*34.)-.5)*.014;
  vec2 res=vec2(d,0.);
  if(uArc>.5){
    res=opU(res,vec2(arcEye(q-gEL),1.));
    res=opU(res,vec2(arcEye(q-gER),1.));
  } else {
    vec3 erL=vec3(gEr, gEr*max(gBL,.13), gEr*.8), erR=vec3(gEr, gEr*max(gBR,.13), gEr*.8);
    if(gWink>.5) res=opU(res,vec2(arcEye(q-(gEL+vec3(0,0,gEr*.25))),1.));
    else res=opU(res,vec2(sdEll(q-gEL,erL),1.));
    if(gWink>1.5) res=opU(res,vec2(arcEye(q-(gER+vec3(0,0,gEr*.25))),1.));
    else res=opU(res,vec2(sdEll(q-gER,erR),1.));
  }
  if(uAcc==1){
    float g=sdTorus(q-(gEL+vec3(0,0,.13)),vec2(.2,.018)); g=min(g,sdTorus(q-(gER+vec3(0,0,.13)),vec2(.2,.018)));
    g=min(g,sdCap(q,gEL+vec3(.2,.02,.13),gER+vec3(-.2,.02,.13),.016));
    res=opU(res,vec2(g,2.));
  }
  if(uAcc==2){
    // The prototype's headphones sit on the cloud: a band of radius 1 round (0,-.25) and cups at
    // x = 1.045. Here the cups' x and y and the band's top are per shape (uPhones), and the band is
    // the same tube bent into an ellipse through them, which is that circle on the cloud.
    float W=uPhones.x, oy=uPhones.y+.03, rx=W-.045, ry=uPhones.z-oy;
    vec3 t=q-vec3(0,oy,0); vec3 a=vec3(abs(t.x),t.y,t.z);
    // distance to the arc |x/rx|^n + |y/ry|^n = 1 (n = 2: the ellipse), first order
    float n=uPhones.w; vec2 uvn=abs(t.xy)/vec2(rx,ry)+1e-4;
    float k0=pow(pow(uvn.x,n)+pow(uvn.y,n),1./n);
    vec2 gr=pow(uvn/k0,vec2(n-1.))/vec2(rx,ry);
    float dr=(k0-1.)/length(gr);
    float band=max((length(vec2(dr,t.z)/vec2(.044,.095))-1.)*.044, .30*ry-t.y);
    float pad=max((length(vec2(dr+.060,t.z)/vec2(.036,.080))-1.)*.036, .74*ry-t.y);
    float sx=pow(1.-pow(.31,n),1./n)*1.0045;
    float stem=sdCap(a,vec3(rx*sx,ry*.31,0.),vec3(W-.040,.12,0.),.021);
    vec3 c=a-vec3(W,-.03,0.);
    float cr=length(c.yz*vec2(.86,1.));
    vec2 dd=vec2(cr-.20, abs(c.x)-.045);
    float cup=min(max(dd.x,dd.y),0.)+length(max(dd,0.))-.042;
    float cush=length(vec2(cr-.165, c.x+.078))-.062;
    float ring=length(vec2(cr-.118, c.x-.088))-.016;
    res=opU(res,vec2(min(band,cup),3.)); res=opU(res,vec2(min(pad,cush),7.));
    res=opU(res,vec2(stem,8.)); res=opU(res,vec2(ring,9.));
  }
  if(uAcc==3){
    vec3 A=vec3(uSprout.x,uSprout.y,0.), B=A+vec3(.035,.37,0.);
    vec3 pa=q-A, ba=B-A; float hh=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
    vec3 sp=pa-ba*hh; sp.x-=sin(hh*3.14159)*.025;
    float stem=length(sp)-mix(.040,.021,hh);
    vec3 l1=q-B; l1.xy=rot(.42)*l1.xy; l1.yz=rot(-.55)*l1.yz;
    vec3 l2=q-B; l2.x=-l2.x; l2.xy=rot(.62)*l2.xy; l2.yz=rot(-.55)*l2.yz;
    float lv=min(leaf(l1,.24),leaf(l2,.17));
    res=opU(res,vec2(smin(stem,lv,.035),4.));
  }
  if(gSpk>.02){
    vec3 mr=vec3(mix(.10,.125,gMo), mix(.02,.125,gMo), .07)*gSpk;
    res=opU(res,vec2(sdEll(q-gM,max(mr,vec3(.002))),6.));
  }
  return res;
}
vec3 normal(vec3 p){ vec2 e=vec2(.0015,-.0015);
  return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x); }

// the prototype's mix(col, c, k) over an opaque stage, as premultiplied alpha
vec4 over(vec4 dst, vec3 c, float k){ return mix(dst, vec4(c,1.), clamp(k,0.,1.)); }

void main(){
  vec2 f=gl_FragCoord.xy/uRes;
  vec2 uv=(f-.5)*uView.z*vec2(uRes.x/uRes.y,1.)+uView.xy;
  float fid=uPhase;
  float hs=uHop;
  gHop=hs*.34;
  gSq=uSq-hs*.05; gTilt=uTilt; gBL=uBlinkL; gBR=uBlinkR; gWink=uWink; gEr=.118*uEye; gThink=uThink; gT=uTime;
  gEL=vEL; gER=vER;
  gSpk=uSpeak; gMo=uMouth; gM=vM;

  vec3 rd=normalize(vec3(0.,-.20,-1.)); vec3 ro=vec3(uv.x,uv.y+.56,3.);
  float tt=0., minD=1e9, minM=0.; vec2 h=vec2(1e9,-1.); bool hit=false;
  for(int i=0;i<72;i++){ h=map(ro+rd*tt); if(h.x<minD){minD=h.x; minM=h.y;} if(h.x<.0015){hit=true;break;} tt+=h.x*.85; if(tt>7.) break; }

  vec3 base=uCol;
  // stage: nothing behind the character but, when asked, its shadow and colour bounce
  vec4 o=vec4(0.);
  if(uGround>.5){
    float tg=(ro.y+.8)/(-rd.y); vec3 g=ro+rd*tg;
    float spread=1.+hs*.9;
    float sh=exp(-(g.x*g.x*1.5+g.z*g.z*2.4)*spread)*.42/spread;
    float sh2=exp(-(g.x*g.x*5.+g.z*g.z*9.)*spread)*.25/spread;
    o=over(o, base*.9, exp(-(g.x*g.x*.8+g.z*g.z*1.2))*.13);
    float li=uListen*uStage;
    if(li>.01){
      float rr=sqrt(g.x*g.x+g.z*g.z*1.7);
      float env=smoothstep(.70,.95,rr)*smoothstep(1.75,1.15,rr);
      float wIn=smoothstep(.30,1.,sin(rr*17.+uTime*5.0));
      float a=wIn*li*env*(.45+.55*uLevel);
      o=over(o, mix(base,vec3(1.),.10), a*.62);
    }
    // bg *= 1 - sh*vec3(.55,.6,.66) - sh2*.5, as a dark overlay; uPaper keeps its warm cast on cream
    float sa=clamp(sh*.66+sh2*.5,0.,1.);
    vec3 warm=vec3(.103,.056,0.)*sh*uPaper;
    o=vec4(o.rgb*(1.-sa)+warm, o.a*(1.-sa)+sa);
    // nothing on the ground reaches the edge of the canvas, so a frame never cuts a ripple
    o*=smoothstep(1.,.80,length((f-.5)*2.));
  }
  vec3 col=vec3(0.);

  vec3 L=normalize(vec3(-.55,.75,.62));
  if(hit){
    vec3 p=ro+rd*tt; vec3 n=normal(p); vec3 q=toBody(p); vec3 v=-rd;
    float ao=0.; for(int i=1;i<=4;i++){ float hh=.045*float(i); ao+=(hh-map(p+n*hh).x); } ao=clamp(1.-1.9*ao,0.,1.);
    float ndv=max(dot(n,v),0.);
    if(h.y<.5){
      vec3 nn=normalize(n+(vec3(noise(q*70.),noise(q*70.+9.),noise(q*70.+21.))-.5)*.55);
      float dif=pow(dot(nn,L)*.5+.5,1.6);
      vec3 shadowC=base*base*vec3(.62,.50,.62);
      vec3 lit=base*1.06+vec3(.03);
      col=mix(shadowC,lit,dif);
      float fib=noise(q*52.)*.6+noise(q*120.)*.4;
      col*=.84+.30*fib;
      float rim=pow(1.-ndv,2.2);
      col+=mix(base,vec3(1.),.55)*rim*.55*(.6+.6*fib);
      col+=vec3(1.,.95,.9)*pow(max(dot(nn,normalize(L+v)),0.),14.)*.10;
      if(q.z>0.){
        vec2 c1=q.xy-vec2(gEL.x-.17,gEL.y-.15), c2=q.xy-vec2(gER.x+.17,gER.y-.15);
        float bl=exp(-dot(c1,c1)/.011)+exp(-dot(c2,c2)/.011);
        col=mix(col, mix(base,vec3(1.,.45,.5),.7)*1.08, .32*bl);
      }
      col*=.55+.45*ao;
    } else if(h.y>8.5){
      col=mix(base,vec3(1.),.30)*1.25+pow(1.-ndv,2.)*.3;
    } else if(h.y>7.5){
      vec3 r=reflect(rd,n); float dif=dot(n,L)*.5+.5;
      col=vec3(.62,.63,.67)*(.35+.75*dif)+pow(max(dot(r,L),0.),70.)*.9+smoothstep(.8,.95,dot(r,normalize(vec3(.3,.8,.5))))*.25;
    } else if(h.y>6.5){
      float dif=pow(dot(n,L)*.5+.5,1.4);
      col=mix(vec3(.055,.05,.06),vec3(.24,.23,.26),dif)+vec3(.5,.5,.6)*pow(1.-ndv,2.5)*.16;
      col*=.6+.4*ao;
    } else if(h.y>5.5){
      vec3 ml=q-gM;
      float tongue=smoothstep(.005,-.03,ml.y)*smoothstep(.25,.6,gMo);
      col=mix(vec3(.20,.045,.075),vec3(.97,.46,.54),tongue*.9);
      col+=pow(max(dot(reflect(rd,n),L),0.),28.)*.28+pow(1.-ndv,3.)*.10;
      col*=.8+.2*ao;
    } else if(h.y<1.5){
      vec3 r=reflect(rd,n);
      col=vec3(.035,.03,.04);
      col+=vec3(1.)*smoothstep(.80,.93,dot(r,normalize(vec3(-.45,.62,.64))))*.95;
      col+=vec3(.8,.85,1.)*smoothstep(.93,.985,dot(r,normalize(vec3(.5,-.25,.83))))*.35;
      col+=base*pow(1.-ndv,2.5)*.35;
      col*=.75+.25*ao;
    } else if(h.y<2.5){
      vec3 r=reflect(rd,n);
      col=vec3(.07,.06,.06)+pow(max(dot(r,L),0.),40.)*.9+pow(1.-ndv,3.)*.25;
    } else if(h.y<3.5){
      float dif=pow(dot(n,L)*.5+.5,1.25);
      vec3 r=reflect(rd,n);
      vec3 deep=mix(base*base*.42,vec3(.05,.05,.07),.25);
      col=mix(deep*.55,deep*1.9+vec3(.03),dif);
      col+=vec3(1.)*smoothstep(.84,.96,dot(r,normalize(vec3(-.45,.62,.64))))*.65;
      col+=mix(base,vec3(1.),.5)*pow(1.-ndv,3.)*.30;
      col*=.72+.28*ao;
    } else {
      float dif=pow(dot(n,L)*.5+.5,1.3);
      // the prototype's sprout stands on the gumdrop (base at y=.56); the gradient follows the base
      float up=smoothstep(-.01,.59,q.y-uSprout.y);
      vec3 g1=mix(vec3(.13,.46,.22),vec3(.20,.60,.26),up), g2=mix(vec3(.42,.80,.36),vec3(.62,.92,.42),up);
      col=mix(g1,g2,dif);
      col+=vec3(.75,1.,.55)*pow(max(dot(-n,L),0.),2.)*.18;
      col+=pow(max(dot(reflect(rd,n),L),0.),36.)*.45+vec3(.7,1.,.7)*pow(1.-ndv,3.)*.18;
      col*=.7+.3*ao;
    }
    o=vec4(col,1.);
  } else {
    float halo=(minM<.5) ? smoothstep(.05,0.,minD) : 0.;
    if(minM>3.5&&minM<4.5) o=over(o,vec3(.36,.72,.36),smoothstep(.007,0.,minD)*.7);
    if(minM>.5&&minM<2.5) o=over(o,vec3(.10,.09,.10),smoothstep(.006,0.,minD)*.7);
    if(minM>2.5&&minM<3.5) o=over(o,base*base*.5,smoothstep(.006,0.,minD)*.7);
    if(minM>6.5&&minM<7.5) o=over(o,vec3(.14,.13,.15),smoothstep(.006,0.,minD)*.7);
    if(minM>7.5&&minM<8.5) o=over(o,vec3(.6,.6,.64),smoothstep(.006,0.,minD)*.7);
    // the prototype samples its grain per device pixel at 2x on a 960 px cell: 185 cycles a unit
    float grain=noise(vec3(uv*185.,fid*7.));
    o=over(o, mix(base,vec3(1.),.18), halo*halo*(.2+.8*grain)*.85);
  }
  if(gSpk*uStage>.01&&!hit){
    vec3 pw=ro+rd*((ro.z-.2)/(-rd.z)); vec2 v=pw.xy-vec2(0.,-.12+gHop);
    float r=length(v), ang=abs(atan(v.y,abs(v.x)));
    float sector=smoothstep(.60,.28,ang);
    float band=smoothstep(.30,1.,sin(r*21.-gT*9.));
    float env=smoothstep(1.00,1.12,r)*smoothstep(1.44,1.22,r);
    o=over(o,mix(base,vec3(1.),.05),band*sector*env*gSpk*(.25+.75*uLevel)*.8);
  }
  if(gThink>.01){
    vec3 C=vec3(0.,.36+gHop,0.), X=vec3(.968,.25,0.), Zp=normalize(vec3(-.07,.32,1.));
    float trail=0., head=0., core=0.; vec3 prev=vec3(0.); float pvis=0.;
    for(int k=0;k<26;k++){ float fk=float(k); float th=gT*2.6+fid*1.7-fk*.07;
      vec3 P=C+1.0*(cos(th)*X+sin(th)*Zp);
      vec3 w=P-ro; float along=dot(w,rd); vec3 pp=w-rd*along; float d=length(pp);
      float vis=(hit&&tt<along-.02)?0.:1.;
      float fall=1.-fk/26.;
      if(k==0){
        head=vis*(exp(-d*d/(.075*.075))+.35*exp(-d*d/(.24*.24)));
        core=vis*exp(-d*d/(.032*.032));
        float fl=exp(-abs(pp.x)*70.)*exp(-abs(pp.y)*9.)+exp(-abs(pp.y)*70.)*exp(-abs(pp.x)*9.);
        core=max(core,vis*fl*.9);
      } else {
        vec3 ab=prev-pp; float hseg=clamp(dot(-pp,ab)/dot(ab,ab),0.,1.); float ds=length(pp+ab*hseg);
        float sig=mix(.004,.040,fall*fall);
        trail=max(trail,min(vis,pvis)*fall*exp(-ds*ds/(sig*sig)));
      }
      prev=pp; pvis=vis;
    }
    vec3 tint=hit ? mix(base,vec3(1.),.80) : mix(base,vec3(1.,.55,.30),.25);
    o=over(o,tint,clamp(trail*.9+head,0.,1.)*gThink);
    o=over(o,vec3(1.,.99,.94),core*gThink);
  }
  outC=o;
}`;
