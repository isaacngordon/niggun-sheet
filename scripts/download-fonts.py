import ssl, urllib.request, os, re

os.makedirs('public/assets/fonts', exist_ok=True)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

fonts = [
    ('Frank+Ruhl+Libre', 'FrankRuhlLibre', '400%3B500%3B700'),
    ('Inter', 'Inter', '400%3B700'),
]

for family_url, prefix, weights in fonts:
    req = urllib.request.Request(
        f'https://fonts.googleapis.com/css2?family={family_url}:wght@{weights}',
        headers={'User-Agent': 'Mozilla/4.0'}
    )
    css = urllib.request.urlopen(req, context=ctx).read().decode()

    blocks = css.split('@font-face')
    for block in blocks:
        wm = re.search(r'font-weight:\s*(\d+)', block)
        um = re.search(r'url\((https://[^)]+\.ttf)\)', block)
        if wm and um:
            weight = wm.group(1)
            url = um.group(1)
            fname = f'{prefix}-{weight}.ttf'
            print(f'Downloading {fname} ...')
            req2 = urllib.request.Request(url)
            data = urllib.request.urlopen(req2, context=ctx).read()
            with open(f'public/assets/fonts/{fname}', 'wb') as f:
                f.write(data)
            print(f'  Saved {len(data)} bytes')

print('Done!')
