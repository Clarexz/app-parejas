from common import *
from pages_a import img, card
from pages_b import wp_css
def p11():
    ctx=[('Título','Falta menos de lo que parece.'),('Cuerpo','Ya contestó la pregunta de hoy. Ahora te toca a ti.'),('Botón','Contestar'),('Notificación','Ximena cambió su mood. Entra a ver cómo está.'),('Error','No pudimos mandarlo. Tu celular está sin señal; lo intentamos otra vez.'),('Vacío','Aquí irá su primera memoria. ¿Cuál sería?')]
    rh=''.join(f'<div style="display:flex;gap:18px;padding:16px 0;border-bottom:1.5px solid #EAE3D3"><div class="label" style="width:130px;flex:none;color:{HUMO};padding-top:3px">{a}</div><div class="disp" style="font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-.01em">{b}</div></div>' for a,b in ctx)
    return f'''<section class="page">
<div class="abs" style="left:0;top:0;width:420px;height:850px;background:{FC['Mango']}"></div>
<div class="abs label" style="left:64px;top:28px;color:{TINTA}">ahorita · manual de marca</div>
<div class="abs label" style="right:64px;top:28px;color:{HUMO}">11 — Voz y tono</div>
<div class="abs" style="left:48px;top:84px;width:330px">
 <div class="disp" style="font-size:44px;line-height:1.04">Habla como te escribirías con quien quieres.</div>
 <div class="label" style="margin:34px 0 10px">Suena</div>
 <div class="disp" style="font-size:26px;line-height:1.3">Juguetona<br>Cálida<br>Breve<br>Directa</div>
 <div class="body" style="margin-top:20px">Español de México, de tú, “ustedes” y “celular”. Nada de regaños ni culpas.</div>
</div>
<div class="abs" style="left:470px;top:76px;width:666px">{rh}</div>
<div class="abs" style="left:470px;top:560px;width:666px;padding:22px 26px;border-radius:22px;background:{TINTA};color:{HUESO}"><div class="label" style="color:{FC['Mango']};margin-bottom:8px">Nunca decimos</div><div class="body">“usuario” · “premium” · “desbloquear” · “conectar con tu pareja” · “experiencia”. Tampoco gritamos con signos de admiración en cadena.</div></div>
<div class="abs body" style="left:470px;top:726px;width:666px;color:{HUMO}">Si una frase se puede decir más chiquito, se dice más chiquito.</div>
</section>'''

def p12():
    rules=[('Sujeto','Gente real en lo suyo: riendo, comiendo, esperando. Nada de poses.'),('Luz','Sol duro de mediodía, sombras largas y nítidas.'),('Color','Saturado pero natural. Las frutas aparecen como accidente feliz.'),('Encuadre','Aire y sombras que se buscan. Siempre dos de algo.'),('Casting','Mezcla real: morenas, negras, asiáticas, mestizas. Cuerpos distintos.'),('Nunca','Parejas de stock, atardeceres cursi, filtros pastel, corazones de neón.')]
    rh=''.join(f'<div style="margin-bottom:14px"><div class="label" style="color:{FC["Sandía"] if i==5 else HUMO}">{a}</div><div class="body">{b}</div></div>' for i,(a,b) in enumerate(rules))
    return f'''<section class="page">
{img('ex',560,850,'50% 50%','position:absolute;left:0;top:0')}
<div class="abs label" style="right:64px;top:28px;color:{HUMO}">12 — Fotografía</div>
<div class="abs disp" style="left:612px;top:70px;font-size:40px;line-height:1.05;width:520px">Fotografía de calle, con sol.</div>
<div class="abs" style="left:612px;top:170px;width:524px">{rh}</div>
</section>'''

def p13():
    cols=''.join(f'<div style="position:absolute;left:{i*300}px;top:68px">{img(k,300,782,p)}</div>' for i,(k,p) in enumerate([('v1','50% 40%'),('v2','50% 50%'),('v3','50% 50%'),('v4','50% 45%')]))
    return f'''<section class="page">
<div class="abs label" style="left:64px;top:26px;color:{HUMO}">ahorita · manual de marca</div>
<div class="abs label" style="right:64px;top:26px;color:{HUMO}">13 — Mundo visual: la vida de a dos, a distancia o no</div>
{cols}</section>'''

def p14():
    t=[('t1','50% 50%'),('t2','50% 50%'),('t3','50% 45%'),('t4','50% 50%')]
    g=''.join(f'<div style="position:absolute;left:{(i%2)*600}px;top:{68+(i//2)*391}px">{img(k,600,391,p)}</div>' for i,(k,p) in enumerate(t))
    return f'''<section class="page">
<div class="abs label" style="left:64px;top:26px;color:{HUMO}">ahorita · manual de marca</div>
<div class="abs label" style="right:64px;top:26px;color:{HUMO}">14 — Puntos de contacto: celular · sticker · tote · llavero</div>
{g}</section>'''

def p15():
    def box(x,y,w,h,inner,lab,bg=ARENA):
        return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:24px;background:{bg};display:flex;align-items:center;justify-content:center;gap:16px">{inner}</div>'
                f'<div class="abs body" style="left:{x}px;top:{y+h+8}px;width:{w}px;font-size:16px;line-height:1.3;color:{HUMO}">{lab}</div>')
    ic=lambda s,r:f'<div style="width:{s}px;height:{s}px;border-radius:{r};background:{HUESO};box-shadow:0 0 0 1.5px #E6DFCF;display:flex;align-items:center;justify-content:center">{sym(int(s*.62))}</div>'
    notif=lambda t,b,c:f'<div style="width:340px;background:#fff;border-radius:20px;padding:12px 14px;display:flex;gap:12px;box-shadow:0 2px 10px rgba(0,0,0,.12)"><div style="width:36px;height:36px;border-radius:50%;background:{c};flex:none;display:flex;align-items:center;justify-content:center">{sym(22)}</div><div><div style="font-size:15px;font-weight:600">{t}</div><div style="font-size:15px;color:#3A3A40;line-height:1.3">{b}</div></div></div>'
    stk=lambda txt,bg,c:f'<div style="width:112px;height:112px;border-radius:50%;background:{bg};color:{c};display:flex;align-items:center;justify-content:center;text-align:center;font-family:{D};font-weight:800;font-size:19px;line-height:1.05;padding:14px;box-shadow:0 0 0 3px {HUESO},0 0 0 4px #D8D0BD">{txt}</div>'
    splash=f'<div style="width:150px;height:300px;border-radius:26px;background:{HUESO};box-shadow:0 0 0 5px #1B1B1F;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px">{sym(62)}{wm(30)}</div>'
    av=f'<div style="width:112px;height:112px;border-radius:50%;background:{TINTA};display:flex;align-items:center;justify-content:center">{sym(70)}</div>'
    return f'''<section class="page">{head(15,'Aplicaciones')}
{box(64,70,500,190,ic(110,'50%')+ic(110,'32px')+ic(110,'24px'),'Ícono adaptativo Android: círculo, squircle y cuadrado redondeado. Símbolo dentro del 66 % central.')}
{box(600,70,536,190,f'<div style="display:flex;flex-direction:column;gap:10px">{notif("Ximena","Ya contestó la pregunta de hoy. Ahora te toca a ti.",FC["Sandía"])}{notif("Diego","Faltan 12 días para verte.",FC["Mango"])}</div>','Notificaciones: nombre de quien escribe + una frase corta. Ícono de pareja a color de su fruta.')}
{box(64,324,300,330,splash,'Pantalla de inicio: símbolo + nombre sobre Hueso, 1 segundo. 1080 × 2400.')}
{box(404,324,420,150,stk('ya casi',FC['Mango'],TINTA)+stk('te extraño',FC['Sandía'],TINTA)+stk('buen día',FC['Uva'],HUESO),'Stickers de las stories: círculo con frase corta en display, 512 × 512.')}
{box(404,508,420,146,av+f'<div style="width:112px;height:112px;border-radius:50%;background:{FC["Mango"]};display:flex;align-items:center;justify-content:center">{sym(70)}</div>','Avatar para compartir: círculo, símbolo centrado. 400 × 400.')}
<div class="abs" style="left:864px;top:324px;width:272px;height:330px;border-radius:24px;background:{TINTA};color:{HUESO};padding:22px"><div class="label" style="color:{FC['Mango']};margin-bottom:10px">Especificaciones</div><div class="body" style="font-size:17px;line-height:1.5">Ícono Play Store: 512 × 512 PNG.<br>Foreground adaptativo: 432 × 432.<br>Símbolo en app: 24 / 48 / 96 dp.<br>Esquinas: 24 dp en tarjetas, 28 dp en hojas.</div></div>
</section>'''

def p16():
    T=160
    tile=lambda inner,bg,x,y:f'<div class="abs" style="left:{x}px;top:{y}px;width:{T}px;height:{T}px;background:{bg};display:flex;align-items:center;justify-content:center;overflow:hidden">{inner}</div>'
    ig=[(f'<img src="{F}/img/ig1.jpg" style="width:{T}px;height:{T}px;object-fit:cover">',HUESO),
        (f'<div class="disp" style="font-size:46px;line-height:.95;text-align:center;color:{TINTA}">12<br>días</div>',FC['Mango']),
        (sym(78),HUESO),
        (f'<div class="disp" style="font-size:24px;line-height:1.05;padding:14px;color:{FC["Mango"]}">Ya casi,<br>ya casi,<br>ya casi.</div>',TINTA),
        (widget('heart',FC['Sandía'],FC['Mango'],'412 días','light',w=124),ARENA),
        (f'<div class="disp" style="font-size:26px;line-height:1.05;padding:14px;color:{TINTA}">Falta menos de lo que parece.</div>',FC['Sandía']),
        (widget('duo',FC['Uva'],FC['Limón'],'1,240 km','dark',w=124),'#1B1B1F'),
        (f'<div class="disp" style="font-size:44px;color:{HUESO}">47</div>',FC['Uva']),
        (wm(38),HUESO)]
    igh=''.join(tile(i,b,64+(k%3)*(T+2),84+(k//3)*(T+2)) for k,(i,b) in enumerate(ig))
    web=f'''<div class="abs" style="left:600px;top:84px;width:536px;height:330px;border-radius:16px;overflow:hidden;box-shadow:0 0 0 1.5px #D8D0BD"><div style="height:30px;background:{ARENA};display:flex;align-items:center;gap:6px;padding-left:12px"><i style="width:9px;height:9px;border-radius:50%;background:#D8D0BD"></i><i style="width:9px;height:9px;border-radius:50%;background:#D8D0BD"></i><i style="width:9px;height:9px;border-radius:50%;background:#D8D0BD"></i></div>
 <div style="position:relative;width:536px;height:300px">{img('web',536,300,'70% 50%')}
 <div class="abs" style="left:0;top:0;width:260px;height:300px;background:{HUESO}"></div>
 <div class="abs" style="left:22px;top:22px">{wm(30)}</div>
 <div class="abs disp" style="left:22px;top:82px;width:230px;font-size:33px;line-height:1.02">Falta menos de lo que parece.</div>
 <div class="abs" style="left:22px;top:226px;padding:9px 16px;border-radius:30px;background:{FC['Sandía']};color:{TINTA};font-weight:600;font-size:16px">Descargar para Android</div></div></div>'''
    story=f'''<div class="abs" style="left:600px;top:448px;width:200px;height:356px;border-radius:28px;overflow:hidden;box-shadow:0 0 0 5px #1B1B1F">{img('story',200,356,'50% 50%')}
 <div class="abs" style="left:0;top:92px;width:200px;display:flex;justify-content:center">{widget('dome',FC['Sandía'],FC['Mango'],'faltan 12','light',w=112)}</div>
 <div class="abs" style="left:0;bottom:18px;width:200px;display:flex;justify-content:center">{sym(30)}</div></div>'''
    return f'''<section class="page">{head(16,'Digital y social')}
{igh}
<div class="abs" style="left:64px;top:588px;width:480px"><div class="label" style="color:{HUMO};margin-bottom:6px">Cuadrícula</div><div class="body">Alterna foto, color y símbolo. Nunca dos fotos juntas; un widget cada tres cuadros.</div></div>
<div class="abs" style="left:64px;top:720px;width:480px"><div class="label" style="color:{HUMO};margin-bottom:6px">Para qué se comparte</div><div class="body">Para presumir un momento de ustedes, no para vender nada.</div></div>
{web}{story}
<div class="abs" style="left:830px;top:448px;width:306px"><div class="label" style="color:{HUMO};margin-bottom:6px">Sitio</div><div class="body">Mitad Hueso, mitad foto de calle y un solo botón en Sandía.</div>
<div class="label" style="color:{HUMO};margin:26px 0 6px">Story</div><div class="body">Foto de sol, un widget como sticker y el símbolo abajo.</div></div>
</section>'''

def p17():
    dos=['Dejar aire: mínimo una media luna de espacio alrededor de todo.','Mostrar un solo dato por widget, debajo de su forma.','Escribir como mensaje a una persona, con “ustedes” y “celular”.','Usar la fruta de cada quien para decir quién es quién.','Fotografiar con sol duro y sombras que se buscan.']
    donts=['Poner fondo de color a un widget: flota, no tapa el fondo de pantalla.','Juntar frutas que se parecen: Sandía con Pitaya, Mango con Limón.','Llenar de adornos: cuadrícula, washi, post-its, texturas.','Meter anuncios, “premium” o cosas “por desbloquear”.','Usar filtros pastel, corazones de neón o fotos de stock.']
    li=lambda arr,c,s:''.join(f'<div style="display:flex;gap:14px;margin-bottom:20px"><span class="disp" style="font-size:30px;line-height:1;color:{c}">{s}</span><div class="body" style="width:440px;color:inherit">{t}</div></div>' for t in arr)
    return f'''<section class="page">
<div class="abs" style="left:0;top:0;width:600px;height:850px;background:{FC['Mango']}"></div>
<div class="abs label" style="left:64px;top:28px;color:{TINTA}">ahorita · manual de marca</div>
<div class="abs label" style="right:64px;top:28px;color:{HUMO}">17 — Sí y no</div>
<div class="abs disp" style="left:64px;top:84px;font-size:54px">Sí</div>
<div class="abs" style="left:64px;top:190px;color:{TINTA}">{li(dos,TINTA,'✓')}</div>
<div class="abs disp" style="left:664px;top:84px;font-size:54px">No</div>
<div class="abs" style="left:664px;top:190px">{li(donts,FC['Sandía'],'✗')}</div>
</section>'''

def p12():
    rules=[('Sujeto','Gente real en lo suyo: riendo, comiendo, esperando. Nada de poses.'),('Luz','Sol duro de mediodía, sombras largas y nítidas.'),('Color','Saturado pero natural. Las frutas aparecen como accidente feliz.'),('Encuadre','Aire y sombras que se buscan. Siempre dos de algo.'),('Casting','Mezcla real: morenas, negras, asiáticas, mestizas. Cuerpos distintos.')]
    rh=''.join(f'<div style="margin-bottom:18px"><div class="label" style="color:{HUMO}">{a}</div><div class="body">{b}</div></div>' for a,b in rules)
    return f'''<section class="page">{head(12,'Fotografía')}
<div class="abs disp" style="left:64px;top:68px;font-size:44px;line-height:1.05">Fotografía de calle, con sol.</div>
<div class="abs" style="left:64px;top:156px;border-radius:24px;overflow:hidden">{img('ex',600,400,'50% 50%')}</div>
<div class="abs" style="left:64px;top:590px;width:600px;padding:22px 26px;border-radius:22px;background:{TINTA};color:{HUESO}"><div class="label" style="color:{FC['Sandía']};margin-bottom:8px">Nunca</div><div class="body">Parejas de stock, atardeceres cursi, filtros pastel y corazones de neón.</div></div>
<div class="abs" style="left:716px;top:156px;width:420px">{rh}</div>
</section>'''

def p15():
    def box(x,y,w,h,inner,lab,bg=ARENA):
        return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:24px;background:{bg};display:flex;align-items:center;justify-content:center;gap:16px">{inner}</div>'
                f'<div class="abs body" style="left:{x}px;top:{y+h+8}px;width:{w}px;font-size:16px;line-height:1.3;color:{HUMO}">{lab}</div>')
    ic=lambda s,r:f'<div style="width:{s}px;height:{s}px;border-radius:{r};background:{HUESO};box-shadow:0 0 0 1.5px #E6DFCF;display:flex;align-items:center;justify-content:center">{sym(int(s*.62))}</div>'
    notif=lambda t,b,c:f'<div style="width:340px;background:#fff;border-radius:20px;padding:12px 14px;display:flex;gap:12px;box-shadow:0 2px 10px rgba(0,0,0,.12)"><div style="width:36px;height:36px;border-radius:50%;background:{c};flex:none;display:flex;align-items:center;justify-content:center">{sym(22)}</div><div><div style="font-size:15px;font-weight:600">{t}</div><div style="font-size:15px;color:#3A3A40;line-height:1.3">{b}</div></div></div>'
    stk=lambda txt,bg,c:f'<div style="width:112px;height:112px;border-radius:50%;background:{bg};color:{c};display:flex;align-items:center;justify-content:center;text-align:center;font-family:{D};font-weight:800;font-size:19px;line-height:1.05;padding:14px;box-shadow:0 0 0 3px {HUESO},0 0 0 4px #D8D0BD">{txt}</div>'
    splash=f'<div style="width:170px;height:340px;border-radius:28px;background:{HUESO};box-shadow:0 0 0 5px #1B1B1F;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">{sym(70)}{wm(34)}</div>'
    av=f'<div style="width:112px;height:112px;border-radius:50%;background:{TINTA};display:flex;align-items:center;justify-content:center">{sym(70)}</div>'
    return f'''<section class="page">{head(15,'Aplicaciones')}
{box(64,70,500,200,ic(110,'50%')+ic(110,'32px')+ic(110,'24px'),'Ícono adaptativo Android: círculo, squircle y cuadrado redondeado. Símbolo dentro del 66&nbsp;% central.')}
{box(600,70,536,200,f'<div style="display:flex;flex-direction:column;gap:10px">{notif("Ximena","Ya contestó la pregunta de hoy. Ahora te toca a ti.",FC["Sandía"])}{notif("Diego","Faltan 12 días para verte.",FC["Mango"])}</div>','Notificaciones: nombre de quien escribe + una frase corta. El ícono toma el color de su fruta.')}
{box(64,350,300,400,splash,'Pantalla de inicio: símbolo + nombre sobre Hueso, 1 segundo. 1080 × 2400.')}
{box(404,350,420,170,stk('ya casi',FC['Mango'],TINTA)+stk('te extraño',FC['Sandía'],TINTA)+stk('buen día',FC['Uva'],HUESO),'Stickers de las stories: círculo con frase corta en display, 512 × 512.')}
{box(404,596,420,150,av+f'<div style="width:112px;height:112px;border-radius:50%;background:{FC["Mango"]};display:flex;align-items:center;justify-content:center">{sym(70)}</div>','Avatar para compartir: círculo, símbolo centrado. 400 × 400.')}
<div class="abs" style="left:864px;top:350px;width:272px;height:400px;border-radius:24px;background:{TINTA};color:{HUESO};padding:24px"><div class="label" style="color:{FC['Mango']};margin-bottom:12px">Especificaciones</div><div class="body" style="font-size:18px;line-height:1.55">Ícono Play Store: 512 × 512 PNG.<br><br>Foreground adaptativo: 432 × 432.<br><br>Símbolo en app: 24, 48 y 96 dp.<br><br>Esquinas: 24 dp en tarjetas y 28 dp en hojas.</div></div>
</section>'''

def p17():
    dos=['Dejar aire: mínimo una media luna de espacio alrededor de todo.','Mostrar un solo dato por widget, debajo de su forma.','Escribir como mensaje a una persona, con “ustedes” y “celular”.','Usar la fruta de cada quien para decir quién es quién.','Fotografiar con sol duro y sombras que se buscan.']
    donts=['Poner fondo de color a un widget: flota, no tapa el fondo de pantalla.','Juntar frutas que se parecen: Sandía con Pitaya, Mango con Limón.','Llenar de adornos: cuadrícula, washi, post-its, texturas.','Meter anuncios, “premium” o cosas “por desbloquear”.','Usar filtros pastel, corazones de neón o fotos de stock.']
    li=lambda arr,c,s:''.join(f'<div style="display:flex;gap:14px;margin-bottom:20px"><span class="disp" style="font-size:30px;line-height:1;color:{c}">{s}</span><div class="body" style="width:440px;color:inherit">{t}</div></div>' for t in arr)
    return f'''<section class="page">
<div class="abs" style="left:0;top:0;width:600px;height:690px;background:{FC['Mango']}"></div>
<div class="abs label" style="left:64px;top:28px;color:{TINTA}">ahorita · manual de marca</div>
<div class="abs label" style="right:64px;top:28px;color:{HUMO}">17 — Sí y no</div>
<div class="abs disp" style="left:64px;top:84px;font-size:54px">Sí</div>
<div class="abs" style="left:64px;top:190px;color:{TINTA}">{li(dos,TINTA,'✓')}</div>
<div class="abs disp" style="left:664px;top:84px;font-size:54px">No</div>
<div class="abs" style="left:664px;top:190px">{li(donts,FC['Sandía'],'✗')}</div>
<div class="abs" style="left:0;top:690px;width:1200px;height:160px;background:{TINTA};display:flex;align-items:center;justify-content:center;gap:26px">{sym(72)}<div class="disp" style="font-size:54px;color:{HUESO}">Si dudas, quita algo.</div></div>
</section>'''
