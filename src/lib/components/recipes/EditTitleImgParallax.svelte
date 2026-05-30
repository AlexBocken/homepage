<script lang="ts">
	import Cross from '$lib/assets/icons/Cross.svelte';
	import ImageEditor from '$lib/components/recipes/ImageEditor.svelte';
	import { toast } from '$lib/js/toast.svelte';
	import { onMount, type Snippet } from 'svelte';

	type CardData = {
		icon?: string;
		category?: string;
		name?: string;
		description?: string;
		tags?: string[];
	};

	type Props = {
		card_data: CardData;
		image_preview_url: string;
		selected_image_file: File | null;
		color?: string;
		titleExtras?: Snippet;
		children?: Snippet;
	};

	let {
		card_data = $bindable(),
		image_preview_url = $bindable(''),
		selected_image_file = $bindable<File | null>(null),
		color = '',
		titleExtras,
		children
	}: Props = $props();

	const ALLOWED_MIME = ['image/webp', 'image/jpeg', 'image/jpg', 'image/png'];
	const MAX_SIZE = 5 * 1024 * 1024;

	let fileInput: HTMLInputElement;
	let new_tag = $state('');

	if (!card_data.tags) card_data.tags = [];

	function handleFileSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!ALLOWED_MIME.includes(file.type)) {
			toast.error('Ungültiger Dateityp. Bitte JPEG, PNG oder WebP hochladen.');
			input.value = '';
			return;
		}
		if (file.size > MAX_SIZE) {
			toast.error(
				`Datei zu gross. Maximum 5 MB, deine Datei ${(file.size / 1024 / 1024).toFixed(2)} MB.`
			);
			input.value = '';
			return;
		}
		openEditor(file);
		input.value = '';
	}

	// Photo editor (crop / scale / webp quality) state
	let editorFile = $state<File | null>(null);
	let editorOpen = $state(false);

	function openEditor(file: File) {
		editorFile = file;
		editorOpen = true;
	}

	function closeEditor() {
		editorOpen = false;
		editorFile = null;
		if (fileInput) fileInput.value = '';
	}

	function handleEditorApply(file: File, url: string) {
		if (image_preview_url?.startsWith('blob:')) URL.revokeObjectURL(image_preview_url);
		selected_image_file = file;
		image_preview_url = url;
		closeEditor();
	}

	function editCurrentImage() {
		if (selected_image_file) openEditor(selected_image_file);
	}

	function clearSelectedImage() {
		if (image_preview_url?.startsWith('blob:')) URL.revokeObjectURL(image_preview_url);
		image_preview_url = '';
		selected_image_file = null;
		if (fileInput) fileInput.value = '';
	}

	function triggerFilePicker() {
		fileInput?.click();
	}

	onMount(() => {
		if (image_preview_url && !image_preview_url.startsWith('blob:')) {
			const img = new Image();
			img.onload = () => {
				if (img.naturalWidth === 150 && img.naturalHeight === 150) image_preview_url = '';
			};
			img.onerror = () => {
				image_preview_url = '';
			};
			img.src = image_preview_url;
		}
	});

	function addTag() {
		const t = new_tag.trim();
		if (t && !card_data.tags!.includes(t)) {
			card_data.tags = [...card_data.tags!, t];
		}
		new_tag = '';
	}
	function removeTag(tag: string) {
		card_data.tags = card_data.tags!.filter((x) => x !== tag);
	}
	function onTagKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		}
	}
</script>

<section class="section">
	<figure class="image-container">
		<button
			type="button"
			class="image-wrap"
			onclick={triggerFilePicker}
			style:background-color={color || 'var(--color-bg-elevated)'}
			aria-label={image_preview_url ? 'Bild ersetzen' : 'Bild hochladen'}
		>
			{#if image_preview_url}
				<img class="image" src={image_preview_url} alt="" />
			{/if}
			<div class="upload-overlay" class:empty={!image_preview_url}>
				<svg
					class="camera"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 512 512"
					aria-hidden="true"
				>
					<path
						d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"
					/>
				</svg>
				<span class="upload-label">
					{image_preview_url ? 'Bild ersetzen' : 'Bild hochladen'}
				</span>
			</div>
		</button>
		{#if selected_image_file}
			<div class="img-controls">
				<button
					type="button"
					class="img-btn"
					onclick={editCurrentImage}
					title="Bild bearbeiten"
					aria-label="Bild bearbeiten"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
						<path
							d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"
						/>
					</svg>
				</button>
				<button
					type="button"
					class="img-btn danger"
					onclick={clearSelectedImage}
					title="Auswahl verwerfen"
					aria-label="Auswahl verwerfen"
				>
					<Cross fill="white" width="1.15rem" height="1.15rem" />
				</button>
			</div>
		{/if}
		<input
			bind:this={fileInput}
			type="file"
			accept="image/webp,image/jpeg,image/jpg,image/png"
			onchange={handleFileSelect}
			class="file-input"
			tabindex="-1"
			aria-hidden="true"
		/>
	</figure>

	<div class="content">
		<div class="title" style="view-transition-name: recipe-title">
			<input
				class="category g-pill g-btn-dark"
				placeholder="Kategorie…"
				bind:value={card_data.category}
				aria-label="Kategorie"
			/>

			<input
				class="icon g-icon-badge"
				placeholder="🥫"
				bind:value={card_data.icon}
				aria-label="Icon"
				maxlength="4"
			/>

			<input
				class="name"
				placeholder="Rezeptname…"
				bind:value={card_data.name}
				aria-label="Rezeptname"
			/>

			<p
				class="description"
				contenteditable="plaintext-only"
				bind:innerText={card_data.description}
				data-placeholder="Kurzbeschreibung…"
				aria-label="Kurzbeschreibung"
			></p>

			<h2 class="section-label">Stichwörter</h2>
			<div class="tags center">
				{#each card_data.tags ?? [] as tag (tag)}
					<button
						type="button"
						class="g-tag tag-chip"
						onclick={() => removeTag(tag)}
						aria-label={`Stichwort ${tag} entfernen`}
					>
						<span>{tag}</span><span class="x" aria-hidden="true">×</span>
					</button>
				{/each}
				<label class="g-tag tag-add">
					<span aria-hidden="true">+</span>
					<input
						type="text"
						bind:value={new_tag}
						onkeydown={onTagKey}
						onblur={addTag}
						placeholder="neu…"
						size="1"
						aria-label="Neues Stichwort"
					/>
				</label>
			</div>

			{#if titleExtras}{@render titleExtras()}{/if}
		</div>

		{#if children}{@render children()}{/if}
	</div>
</section>

{#if editorOpen && editorFile}
	<ImageEditor file={editorFile} onApply={handleEditorApply} onCancel={closeEditor} />
{/if}

<style>
	.section {
		--scale: 0.3;
		margin-bottom: -20vh;
		margin-top: calc(-3.5rem - 12px - env(safe-area-inset-top, 0px));
		transform-origin: center top;
		transform: scaleY(calc(1 - var(--scale)));
	}
	@media (prefers-reduced-motion) {
		.section {
			--scale: 0;
		}
	}
	.section > :global(*) {
		transform-origin: center top;
		transform: scaleY(calc(1 / (1 - var(--scale))));
	}

	.content {
		position: relative;
		margin: 30vh auto 0;
	}

	.image-container {
		position: sticky;
		top: 0;
		height: max(55dvh, 540px);
		z-index: -10;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.image-wrap {
		all: unset;
		box-sizing: border-box;
		display: block;
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: min(calc(1000px + 2rem), 100dvw);
		height: max(65dvh, 640px);
		overflow: hidden;
		cursor: pointer;
	}

	.image {
		display: block;
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 20%;
	}

	.upload-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: white;
		background: linear-gradient(
			180deg,
			rgba(0, 0, 0, 0.15) 0%,
			rgba(0, 0, 0, 0.45) 100%
		);
		opacity: 0;
		transition: opacity 200ms ease;
		font-size: 1rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-weight: 600;
	}
	.image-wrap:hover .upload-overlay,
	.image-wrap:focus-visible .upload-overlay {
		opacity: 1;
	}
	.upload-overlay.empty {
		opacity: 1;
		background: color-mix(in srgb, var(--color-primary) 65%, transparent);
	}
	.camera {
		width: 2.5rem;
		height: 2.5rem;
		fill: white;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
	}
	.upload-label {
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	/* Edit / remove controls — top-right of the image, offset below the fixed
	   site header (height 3rem, top max(12px, safe-area+4px)) so the nav never
	   obstructs them. */
	.img-controls {
		position: absolute;
		top: calc(max(12px, env(safe-area-inset-top, 0px) + 4px) + 3rem + 1rem);
		right: 1rem;
		display: flex;
		gap: 0.5rem;
		z-index: 5;
	}
	.img-btn {
		background: rgba(0, 0, 0, 0.55);
		border: none;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		cursor: pointer;
		transition:
			transform 150ms ease,
			background 150ms ease;
		backdrop-filter: blur(6px);
		box-shadow: var(--shadow-sm);
	}
	.img-btn svg {
		width: 1.15rem;
		height: 1.15rem;
		fill: white;
	}
	.img-btn:hover,
	.img-btn:focus-visible {
		background: var(--color-primary);
		transform: scale(1.08);
	}
	.img-btn.danger:hover,
	.img-btn.danger:focus-visible {
		background: var(--red);
	}

	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.title {
		position: relative;
		width: min(800px, 80vw);
		margin-inline: auto;
		background-color: var(--color-bg-tertiary);
		padding: 1rem 2rem 1.5rem;
		translate: 0 1px;
		z-index: 1;
	}

	.category {
		--size: 1.75rem;
		position: absolute;
		top: calc(-1 * var(--size));
		left: calc(-1.5 * var(--size));
		font-size: var(--size);
		padding: calc(var(--size) * 2 / 3);
		border: none;
		outline: none;
		max-width: min(16rem, 70%);
		text-align: center;
		transition: var(--transition-fast);
	}
	.category::placeholder {
		color: var(--color-text-tertiary);
		font-style: italic;
		opacity: 0.8;
	}
	.category:hover,
	.category:focus-visible {
		scale: 1.04;
	}

	.icon {
		position: absolute;
		top: -1em;
		right: -0.75em;
		padding: 0.5em;
		font-size: 1.5rem;
		background-color: var(--color-bg-tertiary);
		text-align: center;
		border: none;
		outline: none;
		width: 2.6rem;
		height: 2.6rem;
		box-sizing: border-box;
		transition: var(--transition-fast);
	}
	.icon::placeholder {
		opacity: 0.5;
	}
	.icon:hover,
	.icon:focus-visible {
		scale: 1.15;
	}

	.name {
		all: unset;
		display: block;
		width: 100%;
		box-sizing: border-box;
		text-align: center;
		padding-block: 0.5em;
		margin: 0;
		font-size: 3rem;
		font-weight: 600;
		line-height: 1.1;
		color: var(--color-text-primary);
		overflow-wrap: break-word;
		text-wrap: balance;
		border-bottom: 1px dashed transparent;
		transition: border-color 200ms ease;
	}
	.name::placeholder {
		color: var(--color-text-tertiary);
		font-style: italic;
		font-weight: 400;
	}
	.name:hover,
	.name:focus-visible {
		border-bottom-color: var(--color-border);
	}

	.description {
		text-align: center;
		margin: -0.25em 0 1.75em;
		padding: 0.25em 0.5em;
		color: var(--color-text-secondary);
		font-size: 1.05rem;
		min-height: 1.2em;
		outline: none;
		border-bottom: 1px dashed transparent;
		transition: border-color 200ms ease;
	}
	.description:hover,
	.description:focus {
		border-bottom-color: var(--color-border);
	}
	.description:empty::before {
		content: attr(data-placeholder);
		color: var(--color-text-tertiary);
		font-style: italic;
	}

	.section-label {
		font-size: 1.2rem;
		font-weight: 700;
		text-align: center;
		margin-block: 1.25rem 0.5rem;
		color: var(--color-text-primary);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5em;
		margin-block: 0.5rem 1rem;
		font-size: 1.05rem;
	}
	.tags.center {
		justify-content: center;
	}

	.tag-chip {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		padding: 0.25em 0.9em;
		border-radius: var(--radius-pill);
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
		transition: var(--transition-fast);
	}
	.tag-chip .x {
		opacity: 0.55;
		font-size: 1.1em;
		line-height: 1;
	}
	.tag-chip:hover,
	.tag-chip:focus-visible {
		background: var(--red);
		color: white;
		transform: scale(1.05);
	}
	.tag-chip:hover .x,
	.tag-chip:focus-visible .x {
		opacity: 1;
	}

	.tag-add {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		background: transparent;
		border: 1px dashed var(--color-border);
		color: var(--color-text-secondary);
		padding: 0.15em 0.7em;
		border-radius: var(--radius-pill);
	}
	.tag-add input {
		all: unset;
		min-width: 6ch;
		color: var(--color-text-primary);
		font-size: inherit;
	}
	.tag-add input::placeholder {
		color: var(--color-text-tertiary);
		font-style: italic;
	}
	.tag-add:focus-within {
		border-style: solid;
		border-color: var(--color-primary);
	}

	@media screen and (max-width: 800px) {
		.title {
			width: 100%;
		}
		.icon {
			right: 1rem;
			top: -1.75rem;
		}
		.category {
			left: 1rem;
			top: calc(var(--size) * -1.5);
		}
		.name {
			font-size: 2.2rem;
		}
	}

	:global(::view-transition-new(recipe-title)) {
		animation: slide-up 0.35s ease both;
	}
	:global(::view-transition-old(recipe-title)) {
		animation: slide-down 0.25s ease both;
	}
	@keyframes slide-up {
		from {
			transform: translateY(var(--title-slide, 100vh));
		}
	}
	@keyframes slide-down {
		to {
			transform: translateY(var(--title-slide, 100vh));
		}
	}
</style>
