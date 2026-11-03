import os, itertools
R=os.path.expanduser('~/Desktop/noviecitos-brand'); F='file://'+R
SERIF_FB="'Noto Serif SC','Noto Serif TC','Noto Serif JP','Noto Serif KR','Noto Sans Arabic',serif"
SANS_FB="'Noto Sans SC','Noto Sans TC','Noto Sans JP','Noto Sans KR','Noto Sans Arabic',system-ui,sans-serif"
D="'Bricolage Grotesque',"+SANS_FB
B="'Albert Sans',"+SANS_FB
HUESO='#FFFDF8'; TINTA='#1B1B1F'; HUMO='#6B6B72'; ARENA='#F4EFE3'
FR=[('Sandía','#F2495C'),('Mango','#FFC24B'),('Mandarina','#FF8A3D'),('Limón','#C5DC3A'),('Uva','#8B5CF6'),('Arándano','#3F6BFF'),('Pitaya','#E83E9C')]
FC=dict(FR)
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=.03928 else ((c+.055)/1.055)**2.4
    return .2126*f(r)+.7152*f(g)+.0722*f(b)
def cr(a,b):
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+.05)/(lo+.05)
def best_on(h):
    a,b=cr(h,TINTA),cr(h,HUESO); return (TINTA,a) if a>=b else (HUESO,b)
def rgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def cmyk(h):
    r,g,b=[x/255 for x in rgb(h)]; k=1-max(r,g,b)
    if k>=1: return (0,0,0,100)
    c=(1-r-k)/(1-k); m=(1-g-k)/(1-k); y=(1-b-k)/(1-k); return tuple(round(v*100) for v in (c,m,y,k))
_n=itertools.count(1)

def widget(kind,A,B,label,mode='light',w=120,photo=None):
    i=next(_n)
    op = .80 if mode=='light' else .82
    sh = .62 if mode=='light' else .40
    defs=(f'<linearGradient id="s{i}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="{sh}"/><stop offset=".55" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#fff" stop-opacity=".28"/></linearGradient>'
          f'<linearGradient id="r{i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient>')
    def glass(d,col,extra=''):
        return (f'<path d="{d}" fill="none" stroke="rgba(0,0,0,.24)" stroke-width="4" {extra}/><path d="{d}" fill="{col}" fill-opacity="{op}" {extra}/>'
                f'<path d="{d}" fill="url(#s{i})" {extra}/><path d="{d}" fill="none" stroke="url(#r{i})" stroke-width="1.8" {extra}/>')
    body=''
    if kind=='heart':
        H="M50 90 C18 68 8 48 8 32 C8 18 19 8 32 8 C40 8 47 12 50 19 C53 12 60 8 68 8 C81 8 92 18 92 32 C92 48 82 68 50 90 Z"
        defs+=f'<clipPath id="cl{i}"><rect x="0" y="0" width="47.5" height="100"/></clipPath><clipPath id="cr{i}"><rect x="52.5" y="0" width="47.5" height="100"/></clipPath>'
        body=glass(H,A,f'clip-path="url(#cl{i})"')+glass(H,B,f'clip-path="url(#cr{i})"')
    elif kind=='bubble':
        P="M36 8 H64 A28 28 0 0 1 92 36 V44 A28 28 0 0 1 64 72 H44 L24 90 L26 71 A28 28 0 0 1 8 44 V36 A28 28 0 0 1 36 8 Z"
        body=glass(P,B)+'<circle cx="38" cy="36" r="4.6" fill="#fff"/><circle cx="62" cy="36" r="4.6" fill="#fff"/><path d="M36 48 Q50 61 64 48" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round"/>'
    elif kind=='dome':
        P="M6 76 A44 44 0 0 1 94 76 Z"
        defs+=f'<clipPath id="cd{i}"><path d="{P}"/></clipPath>'
        body=glass(P,B)+f'<g clip-path="url(#cd{i})"><rect x="0" y="58" width="100" height="20" fill="{A}" fill-opacity=".85"/><rect x="0" y="58" width="100" height="20" fill="url(#s{i})"/></g><path d="{P}" fill="none" stroke="url(#r{i})" stroke-width="1.8"/><path d="M2 80 H98" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>'
    elif kind=='duo':
        C1="M2 50 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0Z"; C2="M54 50 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0Z"
        body=glass(C1,A)+glass(C2,B)+'<path d="M24 24 Q50 2 76 24" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="0.1 7"/>'
    elif kind=='story':
        defs+=(f'<linearGradient id="g{i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{A}"/><stop offset="1" stop-color="{B}"/></linearGradient><clipPath id="cs{i}"><circle cx="50" cy="50" r="33"/></clipPath>')
        img=(f'<image href="{photo}" x="12" y="6" width="76" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#cs{i})"/>' if photo else f'<circle cx="50" cy="50" r="33" fill="{A}" fill-opacity=".4"/>')
        body=(f'<circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0,0,0,.24)" stroke-width="4"/><circle cx="50" cy="50" r="42" fill="none" stroke="url(#g{i})" stroke-width="7"/>'
              f'{img}<circle cx="50" cy="50" r="33" fill="url(#s{i})"/><circle cx="50" cy="50" r="33" fill="none" stroke="url(#r{i})" stroke-width="1.8"/>'
              f'<circle cx="84" cy="16" r="8" fill="{B}" stroke="#fff" stroke-width="2.5"/>')
    elif kind=='spark':
        S1="M46 4 C51 30 66 46 92 52 C66 58 51 74 46 100 C41 74 26 58 0 52 C26 46 41 30 46 4Z"
        S2="M80 6 C81 16 85 20 95 22 C85 24 81 28 80 38 C79 28 75 24 65 22 C75 20 79 16 80 6Z"
        body=f'<g transform="translate(5,-4) scale(.9)">{glass(S1,A)}</g><g transform="translate(2,10)">{glass(S2,B)}</g>'
    fam="Albert Sans"
    txt=f'<text x="60" y="124" text-anchor="middle" font-family="{fam}" font-weight="600" font-size="16" fill="#fff" stroke="rgba(0,0,0,.5)" stroke-width="2.8" paint-order="stroke" stroke-linejoin="round">{label}</text>'
    return f'<svg width="{w}" height="{round(w*132/120)}" viewBox="0 0 120 132" style="display:block;overflow:visible"><defs>{defs}</defs><g transform="translate(10,2)">{body}</g>{txt}</svg>'

ICONS={
'inicio':'<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5v-4.5a2 2 0 0 1 4 0v4.5"/>',
'pregunta':'<path d="M6 5h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5l-4 3.5V17H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"/><path d="M10.3 9.6a1.9 1.9 0 1 1 2.7 1.7c-.6.3-1 .7-1 1.4"/><circle cx="12" cy="14.6" r=".7" fill="currentColor"/>',
'mood':'<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/><path d="M8 14.2a4.5 4.5 0 0 0 8 0"/>',
'stories':'<circle cx="12" cy="12" r="9" stroke-dasharray="4 2.6"/><circle cx="12" cy="12" r="4"/>',
'memorias':'<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9.5" cy="9.5" r="1.8"/><path d="M4 16l4.5-3.5 3.5 2.5 3-2.5 5 3.5"/>',
'cuenta':'<path d="M4 16.5a8 8 0 0 1 16 0"/><path d="M3 20h18"/><path d="M12 4.5V6.5M5.2 8.7l1.4 1.4M18.8 8.7l-1.4 1.4"/>',
'distancia':'<circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/><path d="M10 12h4" stroke-dasharray="0.1 2.4"/>',
'listas':'<path d="M4 6.5l1.6 1.6L8.5 5.2"/><path d="M11.5 7h8.5"/><path d="M4 13.5l1.6 1.6 2.9-2.9"/><path d="M11.5 14h8.5"/><path d="M11.5 20h8.5"/>',
'juegos':'<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="9" cy="9" r=".9" fill="currentColor"/><circle cx="15" cy="9" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><circle cx="9" cy="15" r=".9" fill="currentColor"/><circle cx="15" cy="15" r=".9" fill="currentColor"/>',
'amor':'<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/>',
'stats':'<path d="M6 20v-6M12 20V5M18 20v-10" stroke-width="3"/>',
'avisos':'<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
}
def icon(name,size=48,color=TINTA,sw=2):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" style="display:block">{ICONS[name]}</svg>'

def wm(size,color=TINTA,A='#F2495C',B='#FFC24B',weight=800):
    return (f'<span style="font-family:{D};font-weight:{weight};font-size:{size}px;line-height:.9;letter-spacing:-.045em;color:{color};white-space:nowrap">ah'
            f'<span style="background:linear-gradient(90deg,{A} 0 47%,transparent 47% 55%,{B} 55% 100%);-webkit-background-clip:text;background-clip:text;color:transparent">o</span>rita</span>')
def sym_svg(A='#F2495C',B='#FFC24B',size=100):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 100 100" style="display:block"><path d="M47 4 A46 46 0 0 0 47 96Z" fill="{A}"/><path d="M53 4 A46 46 0 0 1 53 96Z" fill="{B}"/></svg>'
def sym(size,extra=''): return f'<img src="{F}/img/sym3.png" style="width:{size}px;height:{size}px;display:block;{extra}">'

BASE=f'''<link rel="stylesheet" href="{F}/html/fonts.css">
<style>
@page{{size:1200px 850px;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:#fff}}
body{{font-family:{B};color:{TINTA};-webkit-font-smoothing:antialiased}}
.page{{position:relative;width:1200px;height:850px;overflow:hidden;page-break-after:always;break-after:page;background:{HUESO}}}
.page:last-child{{page-break-after:auto;break-after:auto}}
.abs{{position:absolute}}
.label{{font-size:14px;letter-spacing:.14em;text-transform:uppercase;font-weight:600}}
.disp{{font-family:{D};font-weight:800;letter-spacing:-.02em}}
.body{{font-size:18px;line-height:1.45;overflow-wrap:break-word;word-break:normal;hyphens:none}}
.phot{{background-size:cover;background-repeat:no-repeat}}
</style>'''
def head(n,title,dark=False):
    c='rgba(255,253,248,.7)' if dark else HUMO
    return (f'<div class="abs label" style="left:64px;top:28px;color:{c}">ahorita · manual de marca</div>'
            f'<div class="abs label" style="right:64px;top:28px;color:{c}">{n:02d} — {title}</div>')
