<script lang="ts">
	let { checked = $bindable(false), label = "", accentColor = "var(--color-primary)", href = undefined as string | undefined } = $props<{ checked?: boolean, label?: string, accentColor?: string, href?: string }>();
</script>

<style>
.toggle-wrapper {
	display: inline-flex;
}

.toggle-wrapper label,
.toggle-wrapper a {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	cursor: pointer;
	font-size: 0.95rem;
	color: var(--nord4);
	text-decoration: none;
}

@media(prefers-color-scheme: light) {
    :global(:root:not([data-theme="dark"])) .toggle-wrapper label,
:global(:root:not([data-theme="dark"])) .toggle-wrapper a {
		color: var(--nord2);
	}
  }
:global(:root[data-theme="light"]) .toggle-wrapper label,
:global(:root[data-theme="light"]) .toggle-wrapper a {
	color: var(--nord2);
}

.toggle-wrapper span {
	user-select: none;
}

/* iOS-style toggle switch — shared by checkbox and link variants */
.toggle-track,
.toggle-wrapper input[type="checkbox"] {
	appearance: none;
	-webkit-appearance: none;
	margin: 0;
	width: 44px;
	height: 24px;
	background: var(--nord2);
	border-radius: 24px;
	position: relative;
	cursor: pointer;
	transition: background 0.3s ease;
	outline: none;
	border: none;
	flex-shrink: 0;
	display: inline-block;
}

@media(prefers-color-scheme: light) {
	:global(:root:not([data-theme="dark"])) .toggle-track:not(.checked),
	:global(:root:not([data-theme="dark"])) .toggle-wrapper input[type="checkbox"]:not(:checked) {
		background: var(--nord4);
	}
}
:global(:root[data-theme="light"]) .toggle-track:not(.checked),
:global(:root[data-theme="light"]) .toggle-wrapper input[type="checkbox"]:not(:checked) {
	background: var(--nord4);
}

.toggle-track.checked,
.toggle-wrapper input[type="checkbox"]:checked {
	background: var(--accent-color);
}

.toggle-track::before,
.toggle-wrapper input[type="checkbox"]::before {
	content: '';
	position: absolute;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	top: 2px;
	left: 2px;
	background: white;
	transition: transform 0.3s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-track.checked::before,
.toggle-wrapper input[type="checkbox"]:checked::before {
	transform: translateX(20px);
}
</style>

<div class="toggle-wrapper" style="--accent-color: {accentColor}">
	{#if href}
		<a {href} onclick={(e) => { e.preventDefault(); checked = !checked; }}>
			<span class="toggle-track" class:checked></span>
			<span>{label}</span>
		</a>
	{:else}
		<label>
			<input type="checkbox" bind:checked />
			<span>{label}</span>
		</label>
	{/if}
</div>
