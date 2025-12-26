<script>
	class HefeConverter {
		constructor(trockenhefe = 1) {
			this._trockenhefe = trockenhefe;
			this._frischhefe = this._trockenhefe * 3;
		}

		get trockenhefe() {
			return Math.round(this._trockenhefe * 100) / 100 + "g";
		}

		set trockenhefe(value) {
			this._trockenhefe = value.replace(/\D/g, '');
			this._frischhefe = this._trockenhefe * 3;
		}

		get frischhefe() {
			return this._frischhefe+"g";
		}

		set frischhefe(value) {
			this._frischhefe = value.replace(/\D/g, '');
			this._trockenhefe = this._frischhefe / 3;
		}
	}

	const hefeConverter = new HefeConverter();

</script>
<style>
	.converter_container {
		width: fit-content;
		display: flex;
		flex-direction: row;
		justify-content: center;
		gap: 2rem;
		background-color: var(--blue);
		padding: 2rem;
		margin-inline: auto;
		align-items: center;
	}
	input {
		width: 5rem;
		height: 2rem;
		font-size: 1rem;
		text-align: center;
	}
	.flex_column {
		display: flex;
		flex-direction: column;
	}
	label {
		margin-bottom: 0.25rem;
	}
</style>
<div class=converter_container>
	<div class="flex_column">
		<label for="trockenhefe">Trockenhefe</label>
		<input type="text" bind:value={hefeConverter.trockenhefe} min="0" />
	</div>
	<div>
		=
	</div>
	<div class="flex_column">
		<label for="frischhefe">Frischhefe</label>
		<input type="text" bind:value={hefeConverter.frischhefe} min="0"/>
	</div>
</div>
