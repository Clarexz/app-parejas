import sys; sys.path.insert(0,'.')
from common import *
import pages_a,pages_b,pages_c
P=[pages_a.p01,pages_a.p02,pages_a.p03,pages_a.p04,pages_a.p05,pages_a.p06,pages_b.p07,pages_b.p08,pages_b.p09,pages_b.p10,pages_c.p11,pages_c.p12,pages_c.p13,pages_c.p14,pages_c.p15,pages_c.p16,pages_c.p17]
html=[f() for f in P]
open(R+'/html/guidelines.html','w').write('<!doctype html><html lang="es"><meta charset="utf-8">'+BASE+'<body>'+''.join(html)+'</body></html>')
for i,h in enumerate(html,1):
    open(R+f'/html/g{i:02d}.html','w').write('<!doctype html><html lang="es"><meta charset="utf-8">'+BASE+'<body>'+h+'</body></html>')
print(len(html),'pages')
