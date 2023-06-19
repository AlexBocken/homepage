<script>
// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL v3.0
document.addEventListener("DOMContentLoaded", () => {
	for (e of document.getElementsByClassName("js-only")) {
		e.classList.remove("js-only");
	}

	const recipes = document.querySelectorAll(".card");
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

      			recipe.hidden = !isMatch;
      			recipe.classList.toggle("matched-recipe", hasFilter && isMatch);
    		})

		recipes.forEach(recipe => {
			if(recipe.hidden == false){
				recipe.parentElement.previousElementSibling.hidden = false;}
			})
		if(click_only_result){
			let matched_recipes = document.querySelectorAll(".matched-recipe");
			if(matched_recipes.length == 1 &&
				matched_recipes[0].parentElement.previousElementSibling != noch_zu_probieren_header){
				matched_recipes[0].lastElementChild.click();
			}
		}
	}


	search.addEventListener("input", () => {
		do_search();
	})

  	clearSearch.addEventListener("click", () => {
    		search.value = "";
    		recipes.forEach(recipe => {
      			recipe.hidden = false;
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
})
// @license-end
</script>
<style>
input#search {
  all: unset;
  background: #222;
  color: #fff;
  padding: 0.7rem 1rem;
  border-radius: 5px;
  width: 100%;
}

.search {
  width: 400px;
  max-width: 85vw;
  position: relative;
  margin: 2.5rem auto 1.2rem;
  display: flex;
  align-items: center;
}

button#clear-search {
  all: unset;
  position: absolute;
  right: 6px;
  height: 30px;
  width: 30px;
  color: #888;
  cursor: pointer;
  transition: color 180ms ease-in-out;
}
button#clear-search:hover {
  color: #eee;
}
</style>
<div class="search js-only">
  <input type="text" id="search" placeholder="Suche nach Stichwörtern...">
  <button id="clear-search">
	  <svg  xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>Sucheintrag löschen</title><path d="M135.19 390.14a28.79 28.79 0 0021.68 9.86h246.26A29 29 0 00432 371.13V140.87A29 29 0 00403.13 112H156.87a28.84 28.84 0 00-21.67 9.84v0L46.33 256l88.86 134.11z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34M336.67 322.34L206.66 192.33M336.67 192.33L206.66 322.34M336.67 322.34L206.66 192.33"></path></svg>
  </button>
</div>
