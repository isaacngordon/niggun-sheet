<template>
    <Toast />
    <Splitter style="height: 97vh" class="mb-5">
      <SplitterPanel :size="30" :minSize="30" class="flex flex-col align-items-center justify-content-start p-4">
        <div class="flex mb-4 w-full max-w-md mt-10">
          <IconField iconPosition="left" class="w-full">
            <InputIcon class="pi pi-search mr-2"></InputIcon>
            <InputText v-model="searchBox.data" placeholder="Search" class="mr-2" />
            <Dropdown v-model="searchBox.field" :options="['title', 'artist']" placeholder="Field" />
          </IconField>
        </div>
        <ScrollPanel style="width: 100%; height: 100%; flex-grow: 1">
          <div class="w-full max-w-4xl">
            <DataTable :value="filteredTableData" class="w-full cursor-pointer" @row-click="rowClick" :rowClass="rowClass">
              <Column header="">
                <template #body="slotProps">
                  <Button icon="pi pi-box" rounded text @click="songSelected($event, slotProps.data)" pt:icon:style="color:#267191"/>
                </template>
              </Column>
              <Column field="title" header="Title"></Column>
              <Column field="artist" header="Artist"></Column>
            </DataTable>
          </div>
        </ScrollPanel>
      </SplitterPanel>
  
      <SplitterPanel :size="70" class="flex flex-col bg-gray-100 p-2">
        <div class="flex justify-end mb-2">
          <Button label="Print" icon="pi pi-print" @click="printSheet()" text rounded class="mb-2"/>
        </div>
        <div class="p-4 mx-4 bg-white shadow-lg rounded" style="height:87vh; overflow: hidden;">
          <div id="printable-content" class="grid grid-cols-3 gap-4" style="height: 100%; overflow-y: auto;">
            <div v-for="(song, index) in sheetSongs" :key="song.title" class="relative group cursor-pointer" @click="songSelected($event, song)">
              <div class="p-4 bg-white border rounded-lg group-hover:bg-gray-100 group-hover:border-gray-300 group-hover:shadow-lg">
                <h2 class="font-semibold">{{ song.title }}</h2>
                <p v-html="song.lyrics"></p>
                <button @click="removeFromSheet(index)" class="text-xl absolute top-2 right-2 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-600">
                  &times;
                </button>
              </div>
            </div>
          </div>
        </div>
      </SplitterPanel>
    </Splitter>
  
    <Dialog v-if="selectedSong" v-model:visible="songDialogueVisible" :header="selectedSong.title" modal class="p-6" :style="{ width: '60vw' }">
      <div class="flex flex-col items-center space-y-4">
        <p v-html="selectedSong.lyrics" class="text-center text-lg"></p>
        <div class="w-full max-w-md p-4">
          <audio controls class="w-full rounded-lg drop-shadow-lg">
            <source :src="selectedSong.audioUrl" type="audio/mpeg">
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    </Dialog>
  </template>
  
  <script setup>
  import printJS from 'print-js'
  import _ from 'lodash'
  import { ref, computed } from 'vue'
  import { useToast } from 'primevue/usetoast'
  import { useFetch } from '#app'
  
  const toast = useToast()
  const songDialogueVisible = ref(false)
  const selectedSong = ref(null)
  const searchBox = ref({
    data: '',
    field: 'title',
  })
  
  const { data: songs } = await useFetch('/api/songs')
  
  const filteredTableData = computed(() => {
    if (songs.value && searchBox.value.data) {
      return songs.value.filter(song =>
        song[searchBox.value.field].toLowerCase().includes(searchBox.value.data.toLowerCase())
      )
    } else {
      return songs.value || []
    }
  })
  
  const sheetSongs = ref([])
  
  const rowClick = (event) => {
    const song = event.data
    if (!sheetSongs.value.some(s => s.title === song.title)) {
      sheetSongs.value.push(song)
    } else {
      toast.add({ severity: 'warn', summary: 'Already Added', detail: 'Song already added', life: 3000 })
    }
  }
  
  const rowClass = (data) => {
    const alreadySelected = _.some(sheetSongs.value, song => _.isEqual(song, data))
    return [{ 'bg-gray-300': alreadySelected }]
  }
  
  const removeFromSheet = (index) => {
    sheetSongs.value.splice(index, 1)
  }
  
  const songSelected = (event, song) => {
    if (event.target.tagName === 'BUTTON') {
      return
    }
    selectedSong.value = song
    songDialogueVisible.value = true
  }
  
  const generatePrintContent = () => {
    const pageWidth = '8.5in'
    const pageHeight = '11in'
    const pageStyle = `
      @media print {
        @page {
          size: ${pageWidth} ${pageHeight};
          margin: .2in;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .page {
          page-break-after: always;
          padding: .2in;
          box-sizing: border-box;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 5px;
        }
        .page:last-of-type {
          page-break-after: auto;
        }
      }
    `
  
    let content = ''
    let pageContent = '<div class="page"><div class="grid">'
  
    sheetSongs.value.forEach((song, index) => {
        const songArtist = song.artist? ` - ${song.artist}` : ''
      const lyrics = song.lyrics.replace(/\n/g, '<br>') // Handle line breaks
      pageContent += `
        <div class="song-item">
          <h2 style="font-size: 12px">${song.title}<span style="font-style: italic; color: gray; font-weight: normal">${songArtist}</span></h2> 
          <p style="font-size: 12px">${lyrics}</p>
        </div>
      `
  
      // Add a page break if content exceeds a single page based on content size
      if (index % 10 === 9) { // Adjust this number as needed
        pageContent += '</div></div><div class="page"><div class="grid">'
      }
    })
  
    pageContent += '</div></div>'
    
    content = `
      <html>
        <head>
          <style>${pageStyle}</style>
        </head>
        <body>${pageContent}</body>
      </html>
    `
  
    return content
  }
  
  const printSheet = () => {
    const printContent = generatePrintContent()
    printJS({
      printable: printContent,
      type: 'raw-html',
      header: 'Printable Lyrics Sheet'
    })
  }
  </script>
  