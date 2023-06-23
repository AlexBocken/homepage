<script>
    import {onMount} from "svelte";
    import "$lib/css/nordtheme.css";


onMount(() => {
	const recipes = document.querySelectorAll(".search_me");
	console.log("######", recipes)
	const search = document.getElementById("search");
  	const clearSearch = document.getElementById("clear-search");

	function do_search(click_only_result=false){
   		// grab search input value
    		const searchText = search.value.toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, "");
    		const searchTerms = searchText.split(" ");
    		const hasFilter = searchText.length > 0;

    		// for each recipe hide all but matched
    		recipes.forEach(recipe => {
      			const searchString = `${recipe.textContent} ${recipe.dataset.tags}`.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, "");
      			const isMatch = searchTerms.every(term => searchString.includes(term));

      			recipe.style.display = (isMatch ? 'block' : 'none');
      			recipe.classList.toggle("matched-recipe", hasFilter && isMatch);
    		})
		}

	search.addEventListener("input", () => {
		do_search();
	})

  	clearSearch.addEventListener("click", () => {
    		search.value = "";
    		recipes.forEach(recipe => {
      			recipe.style.display = 'block';
      			recipe.classList.remove("matched-recipe");
    		})
  	})

	let paramString = window.location.href.split('?')[1];
	let queryString = new URLSearchParams(paramString);

	for (let pair of queryString.entries()) {
		if(pair[0] == 'q'){
			const search = document.getElementById("search");
			search.value=pair[1];
			do_search(click_only_result=true);
		}
	}
});

// @license-end
</script>
<style>
input#search {
  all: unset;
  font-family: sans-serif;
  background: var(--nord0);
  color: #fff;
  padding: 0.7rem 2rem;
  border-radius: 1000px;
  width: 100%;
}
input::placeholder{
  color: var(--nord6);
}

.search {
  width: 500px;
  max-width: 85vw;
  position: relative;
  margin: 2.5rem auto 1.2rem;
  font-size: 1.6rem;
  display: flex;
  align-items: center;
  transition: 100ms;
  filter: drop-shadow(0.4em  0.5em 0.4em rgba(0,0,0,0.4))
}

.search:hover,
.search:focus-within
{
	scale: 1.02 1.02;
  	filter: drop-shadow(0.4em  0.5em 1em rgba(0,0,0,0.6))
}
button#clear-search {
  all: unset;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  right: 0.5em;
  width: 1.5em;
  height: 1.5em;
  color: var(--nord6);
  cursor: pointer;
  transition: color 180ms ease-in-out;
}
button#clear-search:hover {
  color: white;
  scale: 1.1 1.1;
}
button#clear-search:active{
transition: 50ms;
scale: 0.8 0.8;
}
</style>
<div class="search js-only">
  <input type="text" id="search" placeholder="Suche nach Stichwörtern...">
  <button id="clear-search">
	  <svg  xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>Sucheintrag löschen</title><path d="M135.19 390.14a28.79 28.79 0 0021.68 9.86h246.26A29 29 0 00432 371.13V140.87A29 29 0 00403.13 112H156.87a28.84 28.84 0 00-21.67 9.84v0L46.33 256l88.86 134.11z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34M336.67 322.34L206.66 192.33M336.67 192.33L206.66 322.34M336.67 322.34L206.66 192.33"></path></svg></button>
</div>
