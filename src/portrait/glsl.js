// The portrait shader, ported unchanged from the v3 handoff (review/dealer-test/portrait/v3).
// It only moves and relights the painted pixels: depth parallax, chest-only breathing, a blink atlas,
// a head tilt, and warm candle light on the face. No generated frames.
export const VERTEX = `attribute vec2 p;varying vec2 vUv;void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;

export const FRAGMENT = `precision highp float;
uniform sampler2D uImg,uDepth,uEyes;
uniform vec2 uHeadC,uHeadR,uPivot,uHw,uBm,uE1,uE2,uLow; uniform vec4 uRect;
uniform vec2 uPar; uniform float uBreath,uTilt,uBlink,uExp,uCand,uCFlick,uFace,uEyeF,uKey;
varying vec2 vUv;
const vec2 SZ=vec2(1024.,1536.);
float head(vec2 uv){vec2 d=(uv-uHeadC)/uHeadR;return exp(-pow(dot(d,d),1.5));}
void main(){
  vec2 uv=vUv;
  float hw=1.-smoothstep(uHw.x,uHw.y,uv.y);
  vec2 P0=uPivot; float th=uTilt*.034*hw;
  vec2 d=(uv-P0)*SZ; float c=cos(th),s=sin(th); d=vec2(c*d.x+s*d.y,-s*d.x+c*d.y); uv=P0+d/SZ;
  uv.y-=uTilt*.0035*hw;
  float bm=.10+.90*smoothstep(uBm.x,uBm.y,uv.y);
  uv.y+=uBreath*.0055*bm; uv.x=.5+(uv.x-.5)*(1.-uBreath*.0045*bm);
  float z=texture2D(uDepth,uv).r;
  vec2 sh=(z-.30)*uPar*vec2(.040,.025);
  vec2 e1=(uv-uE1)/vec2(.05,.03), e2=(uv-uE2)/vec2(.04,.03);
  sh+=uPar*vec2(.0030,.0014)*uEyeF*(exp(-dot(e1,e1))+exp(-dot(e2,e2)));
  uv-=sh;
  vec3 col=texture2D(uImg,uv).rgb;
  vec2 ep=(uv*SZ-uRect.xy)/uRect.zw;
  if(uBlink>.001&&ep.x>0.&&ep.x<1.&&ep.y>0.&&ep.y<1.){
    float R=.25;
    vec3 cH=texture2D(uEyes,vec2(ep.x,ep.y*R)).rgb, cC=texture2D(uEyes,vec2(ep.x,R+ep.y*R)).rgb;
    float mH=texture2D(uEyes,vec2(ep.x,2.*R+ep.y*R)).r, mC=texture2D(uEyes,vec2(ep.x,3.*R+ep.y*R)).r;
    vec3 colH=mix(col,cH,mH), colC=mix(col,cC,mC);
    col=uBlink<.5?mix(col,colH,uBlink*2.):mix(colH,colC,(uBlink-.5)*2.);
  }
  // ---- light, with no visible source ----
  float F=head(uv);
  // key: warm, off-screen, a little above the front. It rakes the forehead, brow and hair top.
  float topKey=exp(-pow((uv.y-(uHeadC.y-.10))/.15,2.))*exp(-pow((uv.x-uHeadC.x)/.26,2.));
  col*=1.+uKey*(F*.06+topKey*.14)*vec3(1.,.92,.80);
  // candles: a low, warm uplight from the table. Jaw, chin, neck and the collar's edge; weaker toward the brow.
  // Kept soft and nearly neutral: warm light on pale skin, not an orange wash. (v2 used a (1,.58,.26) multiplier that read orange in lean-in.)
  float up=exp(-pow((uv.y-(uHeadC.y+.17))/.105,2.))*exp(-pow((uv.x-uHeadC.x)/.28,2.));
  float lowfade=1.-smoothstep(uLow.x,uLow.y,uv.y);
  col*=1.+up*lowfade*uCand*uCFlick*vec3(.26,.20,.13);
  // the same flame breath, very gently, on the whole face
  col*=1.+F*(uCFlick-.95)*.55*uCand;
  col*=1.+F*uFace;
  col*=uExp;
  // brighter skin is also paler: ease the saturation back as the lean-in light comes up, so it stays candlelight on pale skin
  float lit=clamp((uCand-1.)*.9+uFace*4.,0.,1.);
  col=mix(vec3(dot(col,vec3(.30,.59,.11))),col,1.-.22*lit*max(F,up*lowfade));
  gl_FragColor=vec4(col,1.);
}`;

export const UNIFORMS = [
  'uHeadC', 'uHeadR', 'uPivot', 'uHw', 'uBm', 'uE1', 'uE2', 'uLow', 'uRect', 'uImg', 'uDepth', 'uEyes',
  'uPar', 'uBreath', 'uTilt', 'uBlink', 'uExp', 'uCand', 'uCFlick', 'uFace', 'uEyeF', 'uKey',
];
