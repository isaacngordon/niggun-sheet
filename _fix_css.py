f = '/Users/yehudahjacbs/Documents/GitHub/niggun-sheet/app/globals.css'
with open(f, 'r') as fh:
    content = fh.read()

# Fix 1: Remove padding-left: 56px from song-card-link
old1 = '.songs-list .song-card-link {\n  min-width: 0;\n  max-width: 100%;\n  padding-left: 56px;\n}'
new1 = '.songs-list .song-card-link {\n  min-width: 0;\n  max-width: 100%;\n  padding-left: 0;\n}'
assert old1 in content, 'Fix 1 not found'
content = content.replace(old1, new1, 1)

# Fix 2: song-list-headline baseline → center, add song-list-meta
old2 = '.song-list-headline {\n  display: flex;\n  align-items: baseline;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n}'
new2 = (
    '.song-list-headline {\n  display: flex;\n  align-items: center;\n  gap: 0.85rem;\n  flex-wrap: nowrap;\n  overflow: hidden;\n}'
    '\n\n'
    '.song-list-meta {\n  display: flex;\n  flex-direction: column;\n  gap: 0.1rem;\n  min-width: 0;\n  overflow: hidden;\n}'
)
assert old2 in content, 'Fix 2 not found'
content = content.replace(old2, new2, 1)

with open(f, 'w') as fh:
    fh.write(content)

print('All fixes applied successfully')
