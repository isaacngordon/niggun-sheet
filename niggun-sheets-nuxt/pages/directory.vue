<template>
    <Toast />
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div class="mb-4 w-full max-w-md mt-10">
            <IconField iconPosition="left" >
                <InputIcon class="pi pi-search mr-2"></InputIcon>
                <InputText v-model="searchBox.data" placeholder="Search" class="mr-6"/>
                <Dropdown v-model="searchBox.field" :options="['title', 'artist']" placeholder="Search" />
            </IconField>
        </div>
        <div class="w-full max-w-4xl">
            <DataTable :value="filteredTableData" class="w-full" :rowClass="rowClass" @row-click="rowClick">
                <Column field="title" header="Title"></Column>
                <Column field="artist" header="Artist"></Column>
                <!-- <Column field="drive" header="Drive"></Column>
                <Column field="youtube" header="Youtube"></Column> -->
                <Column field="lyrics" header="Lyrics">
                <<template #body="slotProps">
                <Button label="Add to Sheet" icon="pi pi-plus" rounded text @click="addToSheet(slotProps)"/>
                </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>


<script setup>
const router = useRouter()
const route = useRoute()
const query = route.query

const toast = useToast();

const {data:songs} = await useFetch((`/api/songs`));

onMounted(() => {

    if(query.data && query.field) {
        searchBox.value.data = query.data;
        searchBox.value.field = query.field;
    }
})

const searchBox = ref({data:"", field:"title"})

const filteredTableData = computed(() => {
  return songs.value.filter(song => song[searchBox.value.field].toLowerCase().includes(searchBox.value.data.toLowerCase()));
});

const addToSheet = (song) => {
    
    toast.add({ severity: 'success', summary: 'SongAdded', detail: `${song} added to sheet`, life: 3000 });

}


const rowClick = (event) => {
  const index = songs.value.findIndex((song) => song === event.data);
  router.push(`/songs/${index}`);

}

</script>

<style scoped>

</style>