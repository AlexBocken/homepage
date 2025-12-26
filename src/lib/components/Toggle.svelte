<script>
	export let checked = false;
	export let label = "";
	export let accentColor = "var(--nord14)"; // Default to nord14, can be overridden
</script>

<style>
.toggle-wrapper {
	display: flex;
	justify-content: center;
	margin-bottom: 2rem;
	max-width: 1200px;
	margin-left: auto;
	margin-right: auto;
}

.toggle-wrapper label {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	cursor: pointer;
	font-size: 0.95rem;
	color: var(--nord4);
}

@media(prefers-color-scheme: light) {
	.toggle-wrapper label {
		color: var(--nord2);
	}
}

.toggle-wrapper span {
	user-select: none;
}

/* iOS-style toggle switch */
.toggle-wrapper input[type="checkbox"] {
	appearance: none;
	-webkit-appearance: none;
	width: 51px;
	height: 31px;
	background: var(--nord2);
	border-radius: 31px;
	position: relative;
	cursor: pointer;
	transition: background 0.3s ease;
	outline: none;
	border: none;
	flex-shrink: 0;
}

@media(prefers-color-scheme: light) {
	.toggle-wrapper input[type="checkbox"] {
		background: var(--nord4);
	}
}

.toggle-wrapper input[type="checkbox"]:checked {
	background: var(--accent-color);
}

.toggle-wrapper input[type="checkbox"]::before {
	content: '';
	position: absolute;
	width: 27px;
	height: 27px;
	border-radius: 50%;
	top: 2px;
	left: 2px;
	background: white;
	transition: transform 0.3s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-wrapper input[type="checkbox"]:checked::before {
	transform: translateX(20px);
}
</style>

<div class="toggle-wrapper" style="--accent-color: {accentColor}">
	<label>
		<input type="checkbox" bind:checked on:change />
		<span>{label}</span>
	</label>
</div>
