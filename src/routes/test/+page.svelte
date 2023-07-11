<script lang=ts>
let src_full = ''
let src_thumbnail = ''
let src_placeholder = ''
let alt = 'Random Image'
let API = '/api/img/test1'
import { onMount } from 'svelte';
import Card from '$lib/components/Card.svelte';

onMount(async () => {
    loadPlaceholder()
    loadImage()
  });

export async function loadImage() {
    const res = await fetch(API)
    let image = await res.json()
    image = JSON.parse(image.img)
    src_placeholder = "data:image/webp;base64, " + image.image
    const img_el = document.querySelector("#img")
    img_el?.classList.toggle("blur")
    src_thumbnail = "data:image/webp;base64, " + image.thumbnail
  }
export async function loadPlaceholder() {
    const url = '/api/img/placeholder/test1'
    const res = await fetch(url)
    let image = await res.json()
    image = JSON.parse(image.img)
    src_placeholder = "data:image/webp;base64, " + image.placeholder
  }



</script>
<style>
img{
	width: 300px;
	height: 300px;
	object-fit: cover;
	transition: 300ms;
}
.blur{
	filter: blur(8px);
}
</style>
<img id=img src={src_placeholder} class=blur {alt}/>
