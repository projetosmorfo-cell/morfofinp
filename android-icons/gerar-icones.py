"""Gera os icones do launcher Android a partir do simbolo oficial da Morfo.

Saida: android-icons/res/... no layout exato que `npx cap add android` cria,
para ser copiado por cima depois que a pasta android/ e gerada no GitHub Actions.
"""
from PIL import Image, ImageDraw
import os, shutil

RAIZ = '/home/claude/app_work'
# Fonte: 'Morfo - Icone - Vetorizado com Borda - Final.svg', da Biblioteca
# Corporativa da Morfo (02 - Logo Morfo / Traco Mais Grosso / Vetorizado /
# Final - Texto em Curvas) — o arquivo que a propria identidade define como
# icone. O SVG fica guardado aqui do lado; este PNG e ele renderizado a 2048px
# (Inkscape), para o script nao depender de ter o Inkscape instalado:
#   inkscape "<svg>" -o simbolo-morfo-2048.png -w 2048 -h 2048
FONTE = os.path.join(RAIZ, 'android-icons/simbolo-morfo-2048.png')
SAIDA = os.path.join(RAIZ, 'android-icons/res')
FUNDO = (15, 17, 21, 255)          # #0F1115 - mesmo fundo do icone maskable da PWA

# densidade -> (lado do ic_launcher legacy, lado do foreground adaptativo)
DENS = {
    'mdpi':    (48, 108),
    'hdpi':    (72, 162),
    'xhdpi':   (96, 216),
    'xxhdpi':  (144, 324),
    'xxxhdpi': (192, 432),
}

src = Image.open(FONTE).convert('RGBA')
src = src.crop(src.getbbox())       # recorta a margem transparente em volta do triangulo

def simbolo(largura_px):
    """Simbolo redimensionado para a largura pedida, preservando a proporcao."""
    w, h = src.size
    return src.resize((largura_px, max(1, round(h * largura_px / w))), Image.LANCZOS)

# Quanto o triangulo sobe, em fracao da propria altura, para que o centro do
# desenho seja o CIRCUNCENTRO (o ponto equidistante do vertice de cima e dos dois
# de baixo) e nao o centro do retangulo que o envolve. Sem isso os dois cantos da
# base ficam mais longe do centro que o topo e sao os primeiros a encostar na
# mascara redonda do Android. Valor = w^2 / (8*h*h) com a proporcao do simbolo.
SUBIR = 0.16

def colar_centro(base, sim, desloca_y=0.0):
    # O triangulo e centralizado pelo retangulo que o envolve e depois sobe
    # SUBIR da propria altura (ver acima).
    x = (base.width - sim.width) // 2
    y = (base.height - sim.height) // 2 + round(sim.height * desloca_y)
    base.alpha_composite(sim, (x, y))
    return base

def foreground(lado):
    """Camada de frente do icone adaptativo: fundo transparente, simbolo dentro
    da zona segura (66dp de 108dp -> 61% do lado)."""
    base = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    return colar_centro(base, simbolo(round(lado * 0.48)), -SUBIR)

def legacy(lado, redondo):
    """Icone legado (Android < 8): ja vem com o fundo aplicado e a mascara pronta."""
    esc = 4                                    # desenha 4x maior e reduz -> borda suave
    g = lado * esc
    mask = Image.new('L', (g, g), 0)
    d = ImageDraw.Draw(mask)
    if redondo:
        d.ellipse((0, 0, g - 1, g - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, g - 1, g - 1), radius=round(g * 0.18), fill=255)
    base = Image.new('RGBA', (g, g), FUNDO)
    colar_centro(base, simbolo(round(g * (0.70 if redondo else 0.68))), -SUBIR)
    base.putalpha(mask)
    return base.resize((lado, lado), Image.LANCZOS)

if os.path.isdir(SAIDA):
    shutil.rmtree(SAIDA)

for dens, (lado_legacy, lado_fg) in DENS.items():
    pasta = os.path.join(SAIDA, f'mipmap-{dens}')
    os.makedirs(pasta, exist_ok=True)
    legacy(lado_legacy, False).save(os.path.join(pasta, 'ic_launcher.png'))
    legacy(lado_legacy, True).save(os.path.join(pasta, 'ic_launcher_round.png'))
    foreground(lado_fg).save(os.path.join(pasta, 'ic_launcher_foreground.png'))

os.makedirs(os.path.join(SAIDA, 'values'), exist_ok=True)
with open(os.path.join(SAIDA, 'values/ic_launcher_background.xml'), 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n'
            '<resources>\n'
            '    <color name="ic_launcher_background">#0F1115</color>\n'
            '</resources>\n')

print('gerado em', SAIDA)
for raiz, _, arqs in sorted(os.walk(SAIDA)):
    for a in sorted(arqs):
        p = os.path.join(raiz, a)
        print(' ', os.path.relpath(p, SAIDA), os.path.getsize(p), 'bytes')
