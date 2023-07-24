<script>
export let data;
import "$lib/css/form.css"
function simplify(e){
	const res = eval(e.path[0].value)
	if(res){
		e.path[0].value = res
	}
}

  async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData();
    const form = event.target;

    // Iterate through all form elements and append them to the FormData
    for (const element of form.elements) {
      // Check if the element is a file input
      if (element.type === 'file') {
        const fileInput = element;
        if (fileInput.files.length === 0) {
          console.log('No file selected.');
          continue; // Skip to the next element
        }
        const file = fileInput.files[0];
        formData.append('file', file);
      } else if (element.name && element.value) {
        // Append all other input elements (except file input) with non-empty values
        formData.append(element.name, element.value);
      }
    }
    // Now you can submit the form data to your API endpoint using fetch or any other method
    try {
      const response = await fetch('/api/payments/add', {
        method: 'POST',
        body: formData,
	headers: {credentials : 'include'}
      });

      if (response.ok) {
        console.log('Added successfully.');
      } else {
        console.error('Failed to add the payment.');
        // Handle upload failure, if needed
      }
    } catch (error) {
      console.error('Failed to add the payment:', error);
    }
  }
</script>
<form method="POST" action="?/add" on:submit|preventDefault={handleSubmit}>
	<label>
	Zahler
	<select name="payee" id="">
		{#each data.users as user}
		<option value="{user.username}">{user.username}</option>
		{/each}
	</select>
	</label>
	<label>
		Menge:
		<input type="text" name="amount" required on:blur={simplify}>
	</label>
	<label>
		Für sich selbst:
		<input type="text" name="for_self" on:blur={simplify}>
	</label>
	<label>
		Für den Anderen:
		<input type="text" name="for_other" on:blur={simplify}>
	</label>
	<label>
		Bild:
		<input type="file" name="fileInput">
	</label>
	<button type=submit>Hinzufügen</button>
</form>
