<script lang=ts>
    let fileInput;
    let files;
    let temp
    let image : String;
    let base64

    export function store_img_base64(image) {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onload = e => {
            base64 = e.target.result.split(',')[1];
	    //base64 = temp.split(',')[1]
        };
    };

    export async function upload(){
    	console.log("uploading...")
        const data = {
		image: base64,
		filename: "test.webp"
	}
        await fetch(`/api/img/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(data)
        });

    }

</script>

<input id="file-to-upload" type="file" accept=".png,.jpg,.webp" bind:files bind:this={fileInput} on:change={() => store_img_base64(files[0])}/>
<button class="upload-btn" on:click="{upload}">Upload</button>
<button on:click={console.log(base64)}></button>

<style>
</style>
