from common import *
def img(k,w,h,pos='center',extra=''): return f'<img src="{F}/img/{k}.jpg" style="width:{w}px;height:{h}px;object-fit:cover;object-position:{pos};display:block;{extra}">'
def card(x,y,w,h,inner,bg=None,bd=None,rad=24,pad=22,color=TINTA):
    st=f'left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{rad}px;padding:{pad}px;color:{color};'
    if bg: st+=f'background:{bg};'
    if bd: st+=f'box-shadow:inset 0 0 0 2px {bd};'
    return f'<div class="abs" style="{st}">{inner}</div>'

def p01():
    return f'''<section class="page">
<div class="abs label" style="left:56px;top:40px;color:{HUMO}">Manual de marca · Versión 1.0</div>
<div class="abs" style="left:48px;top:262px">{wm(168)}</div>
<div class="abs disp" style="left:56px;top:442px;font-size:40px;line-height:1.05;width:560px">Falta menos de lo que parece.</div>
<div class="abs" style="left:56px;top:700px;display:flex;align-items:center;gap:16px">{sym(56)}<div class="body" style="width:420px;color:#3A3A40">La app privada de dos, hecha para sentirse cerca a distancia.</div></div>
<div class="abs" style="left:640px;top:0">{img('mood3',560,850,'28% 50%')}</div>
</section>'''

def p02():
    refs=[('Couple Joy','La idea del widget como figura flotante, sin fondo. Solo la idea.',FC['Sandía']),
          ('Duolingo','La racha como ritual juguetón, sin culpa.',FC['Mango']),
          ('Locket','Vivir en la pantalla de inicio de la otra persona.',FC['Uva'])]
    rh=''.join(f'<div style="display:flex;gap:16px;margin-bottom:22px"><div style="width:10px;border-radius:5px;background:{c};flex:none"></div><div><div class="label" style="margin-bottom:4px">{n}</div><div class="body" style="width:400px">{t}</div></div></div>' for n,t,c in refs)
    return f'''<section class="page">{head(2,'Estrategia y posicionamiento')}
<div class="abs disp" style="left:64px;top:76px;font-size:54px;line-height:1.02;width:600px">Juguetona, mínima<br>y de a dos.</div>
{card(64,214,560,190,f'<div class="label" style="color:{FC["Mango"]};margin-bottom:8px">Posicionamiento</div><div class="disp" style="font-size:31px;line-height:1.12">Ahorita es el lugar chiquito donde dos personas lejos se sienten cerca, todos los días.</div>',bg=TINTA,color=HUESO,pad=26)}
<div class="abs" style="left:64px;top:440px;width:560px">
 <div class="label" style="color:{HUMO};margin-bottom:6px">Público primario</div><div class="body" style="margin-bottom:16px">Parejas en relación a distancia que quieren un ritual diario.</div>
 <div class="label" style="color:{HUMO};margin-bottom:6px">Secundarios</div><div class="body" style="margin-bottom:16px">Parejas que se ven poco por turnos, estudios o viajes. Parejas que viven juntas y quieren un rincón privado.</div>
 <div class="label" style="color:{HUMO};margin-bottom:6px">Persona ancla</div><div class="body">Ximena (24, CDMX) y Diego (26, Monterrey): se ven cada tres semanas y se escriben todos los días.</div>
</div>
{card(680,76,456,700,f'<div class="label" style="margin-bottom:22px">Qué tomamos de otras apps</div>{rh}<div class="body" style="color:{HUMO};margin-top:6px;width:400px">Tomamos la idea, no el estilo: Ahorita se ve y suena como Ahorita.</div><div style="position:absolute;left:34px;bottom:40px;display:flex;align-items:center;gap:18px">{sym(96)}<div class="disp" style="font-size:26px;line-height:1.05;width:230px">Dos mitades que se buscan.</div></div>',bg=ARENA,pad=34)}
</section>'''

def p03():
    vals=[('01','Chiquito','Poco, claro y con aire. Si estorba, se quita.',FC['Sandía']),('02','Juguetón','Nos reímos primero y nos ponemos serios después.',FC['Mango']),('03','De a dos','Privada, sin anuncios ni premium. Solo ustedes.',FC['Limón']),('04','Honesto','Lo que ves es lo que hay: sin trucos ni culpas.',FC['Pitaya'])]
    vh=''.join(f'<div style="width:268px"><div class="disp" style="font-size:30px;color:{c}">{n}</div><div class="disp" style="font-size:26px;margin:2px 0 6px">{t}</div><div class="body" style="color:rgba(255,253,248,.82)">{d}</div></div>' for n,t,d,c in vals)
    return f'''<section class="page" style="background:{TINTA};color:{HUESO}">{head(3,'Fundamento',True)}
<div class="abs label" style="left:64px;top:84px;color:{FC['Mango']}">Misión</div>
<div class="abs disp" style="left:64px;top:122px;width:640px;font-size:54px;line-height:1.04">Hacer que la distancia se sienta más chiquita, un día a la vez.</div>
<div class="abs" style="left:64px;top:450px;width:580px;display:flex;flex-wrap:wrap;gap:40px 36px">{vh}</div>
<div class="abs" style="left:716px;top:112px;width:420px">
 <div class="label" style="color:{FC['Mango']};margin-bottom:12px">Por qué existe</div>
 <div class="body" style="color:rgba(255,253,248,.9);margin-bottom:16px">Ahorita empezó como un regalo de aniversario: una app hecha por uno de los dos, para los dos, con la distancia de por medio.</div>
 <div class="body" style="color:rgba(255,253,248,.9);margin-bottom:16px">En México, “ahorita” puede ser ya mismo o dentro de un rato largo. Así se siente esperar a quien quieres: no sabes cuánto falta, pero sabes que falta menos.</div>
 <div class="body" style="color:rgba(255,253,248,.9)">Por eso aquí no hay ruido: un número que baja, una respuesta que se abre cuando contestas y una forma pequeña en tu pantalla que dice que están pensando en ti.</div>
</div>
</section>'''

def p04():
    def cell(x,y,w,h,inner,bg=HUESO,bd=True,lab=''):
        s=f'left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:22px;background:{bg};display:flex;align-items:center;justify-content:center;'+('box-shadow:inset 0 0 0 1.5px #E6DFCF;' if bd else '')
        l=f'<div class="abs label" style="left:{x+4}px;top:{y+h+6}px;color:{HUMO};font-size:14px">{lab}</div>' if lab else ''
        return f'<div class="abs" style="{s}">{inner}</div>{l}'
    return f'''<section class="page">{head(4,'Logo')}
<div class="abs" style="left:64px;top:76px;width:420px;height:600px;border-radius:28px;background:{ARENA}"></div>
<div class="abs" style="left:114px;top:126px;width:320px;height:320px;box-shadow:0 0 0 2px #1B1B1F;opacity:.0"></div>
<div class="abs" style="left:94px;top:106px;width:360px;height:360px;border:2px dashed #B9B1A0;border-radius:6px"></div>
<div class="abs" style="left:144px;top:156px">{sym(260)}</div>
<div class="abs label" style="left:104px;top:116px;color:{HUMO};background:{ARENA};padding:0 6px">x</div>
<div class="abs body" style="left:94px;top:490px;width:360px"><b>Espacio libre:</b> x = la mitad del ancho de una media luna. Nunca menos.</div>
<div class="abs body" style="left:94px;top:560px;width:360px;color:#3A3A40">Las dos mitades son las dos personas. Se acercan, pero nunca se tocan: siempre queda una rendija.</div>
{cell(520,76,300,150,f'<div style="display:flex;align-items:center;gap:14px">{sym(62)}{wm(54)}</div>',lab='Horizontal')}
{cell(836,76,300,150,f'<div style="text-align:center">{sym(58,"margin:0 auto 8px")}{wm(50)}</div>',lab='Apilado')}
{cell(520,266,300,130,wm(66),lab='Solo nombre')}
{cell(836,266,300,130,f'<div style="display:flex;align-items:center;gap:14px">{sym(56)}{wm(48,HUESO)}</div>',bg=TINTA,bd=False,lab='Sobre Tinta (reverso)')}
{cell(520,436,300,150,f'<div style="display:flex;align-items:flex-end;gap:22px"><div>{sym(64)}<div class="label" style="text-align:center;margin-top:6px;font-size:14px">64</div></div><div>{sym(32)}<div class="label" style="text-align:center;margin-top:6px;font-size:14px">32</div></div><div>{sym(16)}<div class="label" style="text-align:center;margin-top:6px;font-size:14px">16</div></div></div>',lab='Tamaños mínimos del símbolo')}
{cell(836,436,300,150,f'<div style="display:flex;gap:14px;align-items:center"><div style="width:84px;height:84px;border-radius:26px;background:{HUESO};box-shadow:0 0 0 1.5px #E6DFCF;display:flex;align-items:center;justify-content:center">{sym(54)}</div><div style="width:64px;height:64px;border-radius:50%;background:{HUESO};box-shadow:0 0 0 1.5px #E6DFCF;display:flex;align-items:center;justify-content:center">{sym(40)}</div></div>',lab='Ícono de app (fijo)')}
<div class="abs body" style="left:520px;top:660px;width:616px"><b>Wordmark:</b> Bricolage Grotesque ExtraBold, tracking −4.5&nbsp;%, siempre en minúsculas. La “o” se parte en las frutas de la pareja con una rendija de 8&nbsp;%.</div>
<div class="abs body" style="left:64px;top:700px;width:420px;color:#3A3A40">Símbolo: PNG maestro de 2048 px. Dentro de la app se dibuja en código con la misma geometría para cambiar de fruta.</div>
</section>'''

def p05():
    s=lambda inner,bg=HUESO:f'<div style="width:340px;height:200px;border-radius:22px;background:{bg};box-shadow:inset 0 0 0 1.5px #E6DFCF;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">{inner}<div class="abs" style="right:14px;top:10px;font-size:26px;font-weight:800;color:{FC["Sandía"]}">✗</div></div>'
    tiles=[
      (s(sym(96,'transform:scaleX(1.7)')),'Estirar o aplastar'),
      (s(sym(110,'transform:rotate(20deg)')),'Girar el símbolo'),
      (s(sym(110),FC['Mango']),'Ponerlo sobre un color que se come una mitad'),
      (s(sym_svg('#7A8B99','#9A6B4F',110)),'Usar colores que no son frutas'),
      (s(sym(110,'filter:drop-shadow(8px 10px 6px rgba(0,0,0,.45))')),'Sombras, brillos o efectos 3D'),
      (s(f'<span style="font-family:Georgia,serif;font-size:76px;font-weight:700;letter-spacing:.02em">Ahorita</span>'),'Cambiar la tipografía o las mayúsculas'),
    ]
    th=''.join(f'<div style="width:340px"><div>{a}</div><div class="body" style="margin-top:10px;width:340px">{b}</div></div>' for a,b in tiles)
    return f'''<section class="page">{head(5,'Lo que no se hace con el logo')}
<div class="abs disp" style="left:64px;top:68px;font-size:40px">Seis formas de romperlo.</div>
<div class="abs" style="left:64px;top:140px;width:1072px;display:flex;flex-wrap:wrap;gap:34px 26px">{th}</div>
</section>'''

def p06():
    core=[('Hueso','#FFFDF8','Fondo',TINTA),('Tinta','#1B1B1F','Texto',HUESO),('Sandía','#F2495C','Fruta 1 · principal',TINTA),('Mango','#FFC24B','Fruta 2 · acento',TINTA)]
    cols=''
    for i,(n,h,r,c) in enumerate(core):
        R_=rgb(h); K=cmyk(h)
        cols+=f'<div style="position:absolute;left:{i*300}px;top:0;width:300px;height:430px;background:{h};color:{c};padding:{72 if i<2 else 72}px 30px 0 {64 if i==0 else 30}px"><div class="label" style="opacity:.85">{r}</div><div class="disp" style="font-size:44px;margin:10px 0 14px">{n}</div><div class="body" style="line-height:1.5">{h}<br>RGB {R_[0]} {R_[1]} {R_[2]}<br>CMYK {K[0]} {K[1]} {K[2]} {K[3]}</div></div>'
    fr=''
    for i,(n,h) in enumerate(FR):
        c,ratio=best_on(h)
        fr+=f'<div style="position:absolute;left:{i*171.4:.1f}px;top:0;width:172px;height:420px;background:{h};color:{c};padding:22px 18px"><div class="disp" style="font-size:25px">{n}</div><div class="body" style="margin-top:4px;line-height:1.35">{h}</div><div class="abs" style="left:18px;bottom:20px;width:136px;font-size:15px;line-height:1.3;font-weight:600">{"Tinta" if c==TINTA else "Hueso"} encima<br>{ratio:.1f} : 1</div></div>'
    return f'''<section class="page">{head(6,'Color')}
<div class="abs" style="left:0;top:0;width:1200px;height:430px;color:#000"></div>
{cols.replace('padding:72px','padding:64px')}
<div class="abs" style="left:0;top:430px;width:1200px;height:420px">{fr}</div>
<div class="abs" style="left:0;top:430px;width:1200px;height:0"></div>
<div class="abs" style="left:640px;top:62px;width:520px;z-index:3;color:{HUESO}"></div>
<div class="abs" style="left:64px;top:380px;z-index:3;display:none"></div>
</section>'''

PAIR={'Sandía':'Mango','Mango':'Sandía','Mandarina':'Uva','Limón':'Pitaya','Uva':'Limón','Arándano':'Mandarina','Pitaya':'Limón'}
def p06():
    core=[('Hueso','#FFFDF8','Fondo',TINTA),('Tinta','#1B1B1F','Texto',HUESO),('Sandía','#F2495C','Fruta 1 · principal',TINTA),('Mango','#FFC24B','Fruta 2 · acento',TINTA)]
    cols=''
    for i,(n,h,r,c) in enumerate(core):
        R_=rgb(h); K=cmyk(h)
        cols+=f'<div style="position:absolute;left:{i*300}px;top:0;width:300px;height:400px;background:{h};color:{c};padding:76px 30px 0 {64 if i==0 else 30}px"><div class="label" style="opacity:.85">{r}</div><div class="disp" style="font-size:44px;margin:10px 0 14px">{n}</div><div class="body" style="line-height:1.55">{h}<br>RGB {R_[0]} {R_[1]} {R_[2]}<br>CMYK {K[0]} {K[1]} {K[2]} {K[3]}</div></div>'
    fr=''
    for i,(n,h) in enumerate(FR):
        c,ratio=best_on(h)
        fr+=f'<div style="position:absolute;left:{i*171.5:.1f}px;top:0;width:172px;height:340px;background:{h};color:{c};padding:24px 18px"><div class="disp" style="font-size:26px">{n}</div><div class="body" style="margin-top:4px;line-height:1.35">{h}<br>{rgb(h)[0]} {rgb(h)[1]} {rgb(h)[2]}</div><div style="position:absolute;left:18px;top:150px;width:140px;font-size:15px;line-height:1.3"><b>Pareja sugerida</b><br>{PAIR[n]}</div><div class="abs" style="left:18px;bottom:22px;width:140px;font-size:15px;line-height:1.3;font-weight:600">{"Tinta" if c==TINTA else "Hueso"} encima<br>{ratio:.1f} : 1</div></div>'
    return f'''<section class="page">
<div class="abs label" style="left:64px;top:28px;color:{HUMO};z-index:2">manual de marca</div>
<div class="abs label" style="right:64px;top:28px;color:{TINTA};z-index:2">06 — Color</div>
{cols}
<div class="abs" style="left:64px;top:420px;width:1072px"><div class="body"><b>Sistema de frutas.</b> Cada quien elige su fruta dentro de la app: es su color en el símbolo, los widgets, las respuestas y las stories. Sandía y Mango son la pareja por defecto.</div>
<div class="body" style="margin-top:8px;color:{HUMO}">Se bloquean por parecerse: Sandía–Pitaya · Sandía–Mandarina · Mango–Limón · Mango–Mandarina · Uva–Arándano · Uva–Pitaya.</div></div>
<div class="abs" style="left:0;top:510px;width:1200px;height:340px">{fr}</div>
</section>'''
