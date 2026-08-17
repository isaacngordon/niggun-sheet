import re
with open('app/bencher/BencherApp.tsx', 'r') as f:
    text = f.read()

text = text.replace('isOpen={isAddSongModalOpen}', 'open={isAddSongModalOpen}')
text = text.replace('onAdd={handleAddSong}', 'onSave={handleAddSong}')
text = text.replace("handleAddSong = (source: 'library' | 'custom' | 'manual', data: any)", 'handleAddSong = async (data: any)')

with open('app/bencher/BencherApp.tsx', 'w') as f:
    f.write(text)

