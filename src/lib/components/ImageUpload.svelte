<script lang="ts">
  let {
    imagePreview = $bindable(''),
    imageFile = $bindable(null),
    uploading = $bindable(false),
    currentImage = $bindable(null),
    title = 'Receipt Image',
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
    onerror?: (message: string) => void,
    onimageSelected?: (file: File) => void,
    onimageRemoved?: () => void,
    oncurrentImageRemoved?: () => void
  }>();

  function handleImageChange(event) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onerror?.('File size must be less than 5MB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        onerror?.('Please select a valid image file (JPEG, PNG, WebP)');
        return;
      }

      imageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview = e.target.result;
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
  <h2>{title}</h2>
  
  {#if currentImage}
    <div class="current-image">
      <img src={currentImage} alt="Receipt" class="receipt-preview" />
      <div class="image-actions">
        <button type="button" class="btn-remove" onclick={removeCurrentImage}>
          Remove Image
        </button>
      </div>
    </div>
  {/if}
  
  {#if imagePreview}
    <div class="image-preview">
      <img src={imagePreview} alt="Receipt preview" />
      <button type="button" class="remove-image" onclick={removeImage}>
        Remove Image
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
          <p>{currentImage ? 'Replace Image' : 'Upload Receipt Image'}</p>
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
    <div class="upload-status">Uploading image...</div>
  {/if}
</div>

<style>
  .form-section {
    background: var(--nord6);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--nord0);
    font-size: 1.25rem;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .form-section {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .form-section h2 {
      color: var(--font-default-dark);
    }
  }
:global(:root[data-theme="dark"]) .form-section {
	background: var(--nord1);
      border-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .form-section h2 {
	color: var(--font-default-dark);
}

  .image-upload {
    border: 2px dashed var(--nord4);
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background-color: var(--nord5);
  }

  .image-upload:hover {
    border-color: var(--blue);
    background-color: var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .image-upload {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }

    :global(:root:not([data-theme="light"])) .image-upload:hover {
      background-color: var(--nord3);
    }
  }
:global(:root[data-theme="dark"]) .image-upload {
	background-color: var(--nord2);
      border-color: var(--nord3);
}
:global(:root[data-theme="dark"]) .image-upload:hover {
	background-color: var(--nord3);
}

  .upload-label {
    cursor: pointer;
    display: block;
  }

  .upload-content svg {
    color: var(--nord3);
    margin-bottom: 1rem;
  }

  .upload-content p {
    margin: 0 0 0.5rem 0;
    font-weight: 500;
    color: var(--nord0);
  }

  .upload-content small {
    color: var(--nord3);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .upload-content svg {
      color: var(--nord4);
    }

    :global(:root:not([data-theme="light"])) .upload-content p {
      color: var(--font-default-dark);
    }

    :global(:root:not([data-theme="light"])) .upload-content small {
      color: var(--nord4);
    }
  }
:global(:root[data-theme="dark"]) .upload-content svg {
	color: var(--nord4);
}
:global(:root[data-theme="dark"]) .upload-content p {
	color: var(--font-default-dark);
}
:global(:root[data-theme="dark"]) .upload-content small {
	color: var(--nord4);
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
    border: 1px solid var(--nord4);
    margin-bottom: 0.75rem;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .receipt-preview {
      border-color: var(--nord2);
    }
  }
:global(:root[data-theme="dark"]) .receipt-preview {
	border-color: var(--nord2);
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