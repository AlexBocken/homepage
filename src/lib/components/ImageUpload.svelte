<script lang="ts">
  import { m, type CospendLang } from '$lib/js/cospendI18n';

  let {
    imagePreview = $bindable(''),
    imageFile = $bindable(null),
    uploading = $bindable(false),
    currentImage = $bindable(null),
    title = undefined as string | undefined,
    lang = 'de' as 'en' | 'de',
    onerror,
    onimageSelected,
    onimageRemoved,
    oncurrentImageRemoved
  } = $props<{
    imagePreview?: string,
    imageFile?: File | null,
    uploading?: boolean,
    currentImage?: string | null,
    title?: string,
    lang?: 'en' | 'de',
    onerror?: (message: string) => void,
    onimageSelected?: (file: File) => void,
    onimageRemoved?: () => void,
    oncurrentImageRemoved?: () => void
  }>();
  const t = $derived(m[lang as CospendLang]);

  const displayTitle = $derived(title ?? t.receipt_image);

  function handleImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onerror?.(t.file_too_large);
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        onerror?.(t.invalid_image);
        return;
      }

      imageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      onimageSelected?.(file);
    }
  }

  function removeImage() {
    imageFile = null;
    imagePreview = '';
    currentImage = null;
    onimageRemoved?.();
  }

  function removeCurrentImage() {
    currentImage = null;
    oncurrentImageRemoved?.();
  }
</script>

<div class="form-section">
  <h2>{displayTitle}</h2>

  {#if currentImage}
    <div class="current-image">
      <img src={currentImage} alt={t.receipt} class="receipt-preview" />
      <div class="image-actions">
        <button type="button" class="btn-remove" onclick={removeCurrentImage}>
          {t.remove_image}
        </button>
      </div>
    </div>
  {/if}

  {#if imagePreview}
    <div class="image-preview">
      <img src={imagePreview} alt={t.receipt} />
      <button type="button" class="remove-image" onclick={removeImage}>
        {t.remove_image}
      </button>
    </div>
  {:else}
    <div class="image-upload">
      <label for="image" class="upload-label">
        <div class="upload-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/>
            <line x1="16" y1="5" x2="22" y2="5"/>
            <line x1="19" y1="2" x2="19" y2="8"/>
          </svg>
          <p>{currentImage ? t.replace_image : t.upload_receipt}</p>
          <small>JPEG, PNG, WebP (max 5MB)</small>
        </div>
      </label>
      <input
        type="file"
        id="image"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onchange={handleImageChange}
        disabled={uploading}
        hidden
      />
    </div>
  {/if}

  {#if uploading}
    <div class="upload-status">{t.uploading_image}</div>
  {/if}
</div>

<style>
  .form-section {
    background: var(--color-surface);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-border);
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
    font-size: 1.25rem;
  }

  .image-upload {
    border: 2px dashed var(--color-border);
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background-color: var(--color-bg-tertiary);
  }

  .image-upload:hover {
    border-color: var(--blue);
    background-color: var(--color-bg-elevated);
  }

  .upload-label {
    cursor: pointer;
    display: block;
  }

  .upload-content svg {
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
  }

  .upload-content p {
    margin: 0 0 0.5rem 0;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .upload-content small {
    color: var(--color-text-secondary);
  }

  .image-preview {
    text-align: center;
  }

  .image-preview img {
    max-width: 100%;
    max-height: 300px;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .remove-image, .btn-remove {
    background-color: var(--red);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .remove-image:hover, .btn-remove:hover {
    background-color: var(--nord11);
    transform: translateY(-1px);
  }

  .current-image {
    margin-bottom: 1rem;
    text-align: center;
  }

  .receipt-preview {
    max-width: 200px;
    max-height: 200px;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
    margin-bottom: 0.75rem;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }

  .image-actions {
    display: flex;
    justify-content: center;
  }

  .upload-status {
    margin-top: 0.5rem;
    color: var(--blue);
    font-size: 0.9rem;
    text-align: center;
  }
</style>
