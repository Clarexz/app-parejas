from common import *
from pages_a import img, card
def p07():
    rows=[('Display','56 / 58',f'<span class="disp" style="font-size:56px;line-height:1">Faltan 12 días</span>'),
          ('H1','40 / 44',f'<span class="disp" style="font-size:40px;line-height:1.1">Hoy les toca a los dos</span>'),
          ('H2','28 / 32',f'<span class="disp" style="font-size:28px;line-height:1.15">Pregunta del día</span>'),
          ('H3','22 / 28',f'<span style="font-size:22px;font-weight:600;line-height:1.25">Ya contestó. Ahora tú.</span>'),
          ('Cuerpo','18 / 26',f'<span style="font-size:18px;line-height:1.45">Hoy me acordé de ti en el súper.</span>'),
          ('Nota','14 / 20',f'<span style="font-size:14px;line-height:1.4;color:{HUMO}">Visto hace 5 min · Monterrey</span>')]
    rh=''.join(f'<div style="display:flex;align-items:baseline;gap:18px;padding:11px 0;border-bottom:1.5px solid #EAE3D3"><div style="width:120px;flex:none"><div class="label" style="color:{HUMO}">{a}</div><div style="font-size:14px;color:{HUMO}">{b} px</div></div><div>{c}</div></div>' for a,b,c in rows)
    return f'''<section class="page">
<div class="abs" style="left:0;top:0;width:500px;height:850px;background:{TINTA}"></div>
<div class="abs label" style="left:64px;top:28px;color:rgba(255,253,248,.7)">ahorita · manual de marca</div>
<div class="abs label" style="right:64px;top:28px;color:{HUMO}">07 — Tipografía</div>
<div class="abs disp" style="left:56px;top:90px;font-size:300px;line-height:1;color:{HUESO};letter-spacing:-.05em">Aa</div>
<div class="abs" style="left:64px;top:430px;width:400px;color:{HUESO}"><div class="label" style="color:{FC['Mango']}">Display</div><div class="disp" style="font-size:30px;margin:4px 0 18px">Bricolage Grotesque ExtraBold</div><div class="label" style="color:{FC['Mango']}">Texto</div><div style="font-size:30px;font-weight:600;margin-top:4px">Albert Sans</div><div class="body" style="margin-top:20px;color:rgba(255,253,248,.82)">Ambas son Google Fonts con licencia OFL: se pueden incluir en la app.</div></div>
<div class="abs" style="left:556px;top:76px;width:580px">{rows and rh}</div>
<div class="abs" style="left:556px;top:560px;width:580px"><div class="label" style="color:{HUMO};margin-bottom:8px">Reglas</div><div class="body">Los números siempre van en display. Frases en minúsculas y mayúscula inicial, nada de TODO EN MAYÚSCULAS salvo etiquetas. Mínimo 14 sp.</div></div>
<div class="abs" style="left:556px;top:714px;width:580px;display:flex;gap:12px">
 <div style="flex:1;height:62px;border-radius:16px;background:{FC['Mango']};display:flex;align-items:center;justify-content:center" class="disp"><span style="font-size:19px;white-space:nowrap;color:{TINTA}">Tinta sobre Mango</span></div>
 <div style="flex:1;height:62px;border-radius:16px;background:{FC['Sandía']};display:flex;align-items:center;justify-content:center" class="disp"><span style="font-size:19px;white-space:nowrap;color:{TINTA}">Tinta sobre Sandía</span></div>
 <div style="flex:1;height:62px;border-radius:16px;background:{FC['Uva']};display:flex;align-items:center;justify-content:center" class="disp"><span style="font-size:19px;white-space:nowrap;color:{HUESO}">Hueso sobre Uva</span></div>
</div>
</section>'''

def p08():
    names=[('inicio','Inicio'),('pregunta','Pregunta'),('mood','Mood'),('stories','Stories'),('memorias','Memorias'),('cuenta','Cuenta regresiva'),('distancia','Distancia'),('listas','Listas'),('juegos','Juegos'),('amor','Lenguajes'),('stats','Estadísticas'),('avisos','Avisos')]
    cells=''.join(f'<div style="width:164px;height:190px;border-radius:22px;background:{ARENA};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">{icon(n,68)}<div style="font-size:16px;font-weight:600">{t}</div></div>' for n,t in names)
    return f'''<section class="page">{head(8,'Íconos')}
<div class="abs disp" style="left:64px;top:68px;font-size:40px">Redondos, parejos, con aire.</div>
<div class="abs" style="left:64px;top:140px;width:708px;display:flex;flex-wrap:wrap;gap:16px">{cells}</div>
<div class="abs" style="left:830px;top:140px;width:306px">
 <div class="label" style="color:{HUMO};margin-bottom:10px">Reglas</div>
 <div class="body" style="margin-bottom:14px"><b>Trazo:</b> 2 dp en retícula de 24, puntas y uniones redondas.</div>
 <div class="body" style="margin-bottom:14px"><b>Forma:</b> círculos y arcos primero; esquinas con radio generoso.</div>
 <div class="body" style="margin-bottom:14px"><b>Color:</b> Tinta en reposo. Activo: relleno de tu fruta.</div>
 <div class="body"><b>Más íconos:</b> Material Symbols Rounded, peso 500, para lo que no esté aquí.</div>
</div>
<div class="abs" style="left:830px;top:600px;width:306px;height:176px;border-radius:24px;background:{ARENA};padding:20px">
 <div class="label" style="color:{HUMO};margin-bottom:14px">Reposo → activo</div>
 <div style="display:flex;gap:20px;align-items:center">{icon('inicio',52)}<div style="font-size:26px">→</div><div style="width:68px;height:68px;border-radius:50%;background:{FC['Sandía']};display:flex;align-items:center;justify-content:center">{icon('inicio',40)}</div></div>
 <div style="font-size:14px;color:{HUMO};margin-top:12px">Tu fruta es el fondo de la pestaña activa.</div>
</div>
</section>'''

def wp_css(m):
    return {'light':'background:linear-gradient(160deg,#F7E9D6,#DDEBF2)','dark':'background:linear-gradient(160deg,#101015,#2B2233)','photo':f"background-image:url('{F}/img/wp.jpg');background-size:cover;background-position:center"}[m]
def p09():
    A,Bc=FC['Sandía'],FC['Mango']
    ph=f'{F}/img/story.jpg'
    items=[('heart','Días juntos','412 días','Un corazón partido en las dos frutas: la pareja y la rendija entre ustedes.'),
           ('bubble','Mood de tu pareja','feliz','Una burbuja de diálogo con su emoji: un mood es un mensaje.'),
           ('dome','La próxima vez','faltan 12','Media luna que se llena como un sol saliendo: más cerca, más lleno.'),
           ('duo','Distancia','1,240 km','Dos círculos con una ruta punteada; entre más cerca, menos espacio.'),
           ('story','Story de tu pareja','nueva','El único con foto: aro de las dos frutas y un punto si hay story nueva.'),
           ('spark','Racha','47 días','Una chispa que se mantiene encendida mientras contesten a diario.')]
    out=''
    for k,(kind,t,lab,why) in enumerate(items):
        x=64+(k%3)*368; y=72+(k//3)*372
        mode='light' if k%2==0 else 'dark'
        wmode={'light':'light','dark':'dark'}[mode]
        out+=(f'<div class="abs" style="left:{x}px;top:{y}px;width:336px;height:210px;border-radius:24px;{wp_css(["photo","dark","light","photo","dark","light"][k])};display:flex;align-items:center;justify-content:center;overflow:hidden">{widget(kind,A,Bc,lab,"dark" if k in (1,4) else "light",w=158,photo=ph)}</div>'
              f'<div class="abs" style="left:{x}px;top:{y+222}px;width:336px"><div class="label" style="color:{HUMO};margin-bottom:4px">0{k+1} · {t}</div><div class="body">{why}</div></div>')
    return f'''<section class="page">{head(9,'Widgets (1/2) — seis, cada uno con su forma')}{out}</section>'''

def p10():
    A,Bc=FC['Sandía'],FC['Mango']
    ph=f'{F}/img/story.jpg'
    kinds=[('heart','412 días'),('bubble','feliz'),('dome','faltan 12'),('duo','1,240 km'),('story','nueva'),('spark','47 días')]
    def phone(x,mode,pair=(A,Bc)):
        ws=''.join(f'<div style="width:100px;height:112px;display:flex;align-items:center;justify-content:center">{widget(k,pair[0],pair[1],l,"dark" if mode=="dark" else "light",w=92,photo=ph)}</div>' for k,l in kinds)
        return f'<div class="abs" style="left:{x}px;top:70px;width:240px;height:560px;border-radius:34px;{wp_css(mode)};box-shadow:0 0 0 6px #1B1B1F;overflow:hidden"><div style="display:grid;grid-template-columns:100px 100px;gap:6px 8px;padding:64px 0 0 14px">{ws}</div></div>'
    swaps=[(('Sandía','Mango'),'light'),(('Uva','Limón'),'dark'),(('Arándano','Mandarina'),'light')]
    sw=''
    for i,((a,b),m) in enumerate(swaps):
        sw+=f'<div style="display:flex;align-items:center;gap:6px;width:260px"><div style="display:flex;border-radius:16px;overflow:hidden;{wp_css("dark" if m=="dark" else "light")};padding:4px 2px">{widget("heart",FC[a],FC[b],"412 días",m,w=84)}{widget("duo",FC[a],FC[b],"1,240 km",m,w=84)}</div><div style="font-size:15px;font-weight:600;line-height:1.2;white-space:nowrap">{a}<br>+ {b}</div></div>'
    rules=['Todos son 1×1; la forma ocupa 60 % del cuadro.','Sin fondo: solo vidrio translúcido.','Un dato por widget, debajo de la forma.','Contorno oscuro fino: se lee sobre claro, oscuro y foto.','Modo oscuro: el vidrio gana opacidad.','Una fruta es tú; la otra, tu pareja.']
    rh=''.join(f'<div class="body" style="display:flex;gap:10px;margin-bottom:11px"><span style="color:{FC["Sandía"]};font-weight:800">●</span><span>{r}</span></div>' for r in rules)
    return f'''<section class="page">{head(10,'Widgets (2/2) — el sistema')}
{phone(64,'light')}{phone(328,'dark')}{phone(592,'photo')}
<div class="abs label" style="left:64px;top:644px;color:{HUMO}">Claro</div><div class="abs label" style="left:328px;top:644px;color:{HUMO}">Oscuro</div><div class="abs label" style="left:592px;top:644px;color:{HUMO}">Fondo de foto</div>
<div class="abs" style="left:870px;top:70px;width:266px"><div class="label" style="color:{HUMO};margin-bottom:14px">Reglas de la familia</div>{rh}</div>
<div class="abs label" style="left:64px;top:690px;color:{HUMO}">Cambian con la fruta elegida</div>
<div class="abs" style="left:64px;top:716px;display:flex;gap:30px">{sw}</div>
</section>'''
