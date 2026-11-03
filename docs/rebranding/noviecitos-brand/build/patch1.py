def sub(path,pairs):
    s=open(path).read(); miss=[]
    for a,b in pairs:
        if a in s: s=s.replace(a,b)
        else: miss.append(a[:60])
    open(path,'w').write(s); print(path,'missing:',miss)
sub('pages_a.py',[('<div class="abs disp" style="left:64px;top:70px;font-size:50px;line-height:1.02;width:600px">Juguetona, mínima y de a dos.</div>','<div class="abs disp" style="left:64px;top:76px;font-size:54px;line-height:1.02;width:600px">Juguetona, mínima<br>y de a dos.</div>'),
 ('{card(64,196,560,170,','{card(64,214,560,190,'),
 ('font-size:29px;line-height:1.12">Ahorita es el lugar','font-size:31px;line-height:1.12">Ahorita es el lugar'),
 ('<div class="abs" style="left:64px;top:392px;width:560px">\n <div class="label" style="color:{HUMO};margin-bottom:6px">Público primario','<div class="abs" style="left:64px;top:440px;width:560px">\n <div class="label" style="color:{HUMO};margin-bottom:6px">Público primario'),
 ('{card(680,70,456,710,f\'<div class="label" style="margin-bottom:22px">Qué tomamos de otras apps</div>{rh}<div class="body" style="color:{HUMO};margin-top:6px;width:400px">Tomamos la idea, no el estilo: Ahorita se ve y suena como Ahorita.</div>\',bg=ARENA,pad=34)}',
  '{card(680,76,456,700,f\'<div class="label" style="margin-bottom:22px">Qué tomamos de otras apps</div>{rh}<div class="body" style="color:{HUMO};margin-top:6px;width:400px">Tomamos la idea, no el estilo: Ahorita se ve y suena como Ahorita.</div><div style="position:absolute;left:34px;bottom:40px;display:flex;align-items:center;gap:18px">{sym(96)}<div class="disp" style="font-size:26px;line-height:1.05;width:230px">Dos mitades que se buscan.</div></div>\',bg=ARENA,pad=34)}'),
 ('top:392px;width:580px;display:flex;flex-wrap:wrap;gap:28px 36px','top:450px;width:580px;display:flex;flex-wrap:wrap;gap:40px 36px'),
 ('left:64px;top:112px;width:640px;font-size:52px','left:64px;top:122px;width:640px;font-size:54px'),
 ('width:420px;height:560px;border-radius:28px;background:{ARENA}"></div>','width:420px;height:600px;border-radius:28px;background:{ARENA}"></div>'),
 ('−4.5 %','−4.5&nbsp;%'),('rendija de 8 %','rendija de 8&nbsp;%'),
 ("lab='Ícono de app · fijo Sandía + Mango'","lab='Ícono de app (fijo)'"),
 ('left:64px;top:690px;width:420px;color:#3A3A40">Símbolo: PNG','left:64px;top:700px;width:420px;color:#3A3A40">Símbolo: PNG'),
 ('width:352px;height:230px;border-radius:22px','width:340px;height:200px;border-radius:22px'),
 ('<div style="width:352px"><div>{a}</div>','<div style="width:340px"><div>{a}</div>'),
 ('top:140px;width:1080px;display:flex;flex-wrap:wrap;gap:30px 28px','top:140px;width:1072px;display:flex;flex-wrap:wrap;gap:34px 26px'),
 ("sym(112,'transform:scaleX(1.7)')","sym(96,'transform:scaleX(1.7)')"),("sym(130,'transform:rotate(20deg)')","sym(110,'transform:rotate(20deg)')"),
 ("s(sym(130),FC['Mango'])","s(sym(110),FC['Mango'])"),("sym_svg('#7A8B99','#9A6B4F',130)","sym_svg('#7A8B99','#9A6B4F',110)"),
 ("sym(130,'filter:drop-shadow","sym(110,'filter:drop-shadow"),
 ('<div class="abs label" style="left:64px;top:28px;color:{HUMO};z-index:2">ahorita · manual de marca</div>\n<div class="abs label" style="right:64px;top:28px;color:{TINTA};z-index:2">06 — Color</div>','<div class="abs label" style="left:64px;top:28px;color:{HUMO};z-index:2">manual de marca</div>\n<div class="abs label" style="right:64px;top:28px;color:{TINTA};z-index:2">06 — Color</div>'),
 ('<div class="body" style="margin-top:4px;line-height:1.35">{h}</div><div class="abs" style="left:18px;bottom:22px','<div class="body" style="margin-top:4px;line-height:1.35">{h}<br>{rgb(h)[0]} {rgb(h)[1]} {rgb(h)[2]}</div><div style="position:absolute;left:18px;top:150px;width:140px;font-size:15px;line-height:1.3"><b>Pareja sugerida</b><br>{PAIR[n]}</div><div class="abs" style="left:18px;bottom:22px'),
 ])
s=open('pages_a.py').read()
if 'PAIR=' not in s:
    i=s.rindex('def p06():'); s=s[:i]+"PAIR={'Sandía':'Mango','Mango':'Sandía','Mandarina':'Uva','Limón':'Pitaya','Uva':'Limón','Arándano':'Mandarina','Pitaya':'Limón'}\n"+s[i:]
    open('pages_a.py','w').write(s)
sub('pages_b.py',[("font-size:22px;color:{TINTA}\">Tinta sobre Mango","font-size:19px;white-space:nowrap;color:{TINTA}\">Tinta sobre Mango"),
 ("font-size:22px;color:{TINTA}\">Tinta sobre Sandía","font-size:19px;white-space:nowrap;color:{TINTA}\">Tinta sobre Sandía"),
 ("font-size:22px;color:{HUESO}\">Hueso sobre Uva","font-size:19px;white-space:nowrap;color:{HUESO}\">Hueso sobre Uva"),
 ("width:160px;height:150px;border-radius:22px;background:{ARENA};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px\">{icon(n,58)}","width:164px;height:190px;border-radius:22px;background:{ARENA};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px\">{icon(n,68)}"),
 ("left:64px;top:140px;width:700px;display:flex;flex-wrap:wrap;gap:16px","left:64px;top:140px;width:708px;display:flex;flex-wrap:wrap;gap:16px"),
 ("x=64+(k%3)*372; y=70+(k//3)*372","x=64+(k%3)*368; y=72+(k//3)*372"),
 ("width:344px;height:170px;border-radius:24px","width:336px;height:210px;border-radius:24px"),
 ("top:{y+182}px;width:344px","top:{y+222}px;width:336px"),
 ("w=132,photo=ph)}</div>'","w=158,photo=ph)}</div>'"),
 ('<div style="font-size:15px;font-weight:600;line-height:1.2">{a}<br>+ {b}</div>','<div style="font-size:15px;font-weight:600;line-height:1.2;white-space:nowrap">{a}<br>+ {b}</div>'),
 ("display:flex;gap:26px\">{sw}","display:flex;gap:30px\">{sw}")])
sub('pages_c.py',[("font-size:22px;line-height:1.2;font-weight:800;letter-spacing:-.01em\">{b}","font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-.01em\">{b}"),
 ("padding:12px 0;border-bottom:1.5px solid #EAE3D3\"><div class=\"label\" style=\"width:130px","padding:16px 0;border-bottom:1.5px solid #EAE3D3\"><div class=\"label\" style=\"width:130px")])
