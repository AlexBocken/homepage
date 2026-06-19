<script lang="ts">
  import Camera from '@lucide/svelte/icons/camera';
  import X from '@lucide/svelte/icons/x';
  import { onDestroy } from 'svelte';
  import { m, type CospendLang } from '$lib/js/cospendI18n';

  let cameraInput = $state<HTMLInputElement | null>(null);
  let videoEl = $state<HTMLVideoElement | null>(null);
  let cameraOpen = $state(false);
  let cameraError = $state('');
  let cameraStream: MediaStream | null = null;

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

  function acceptFile(file: File) {
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

  function handleImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) acceptFile(file);
  }

  // Live in-app camera (getUserMedia). The `capture` file-input attribute only
  // opens the OS camera in mobile *browsers*; the Tauri WebView ignores it and
  // shows the file picker. getUserMedia works in both, so it's the unified path.
  async function openCamera() {
    cameraError = '';
    // Where the live camera API isn't available (e.g. insecure context), fall
    // back to the OS picker/`capture` input so behaviour is no worse than before.
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      cameraInput?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      cameraStream = stream;
      cameraOpen = true;
      await new Promise((r) => requestAnimationFrame(r));
      if (!videoEl) { closeCamera(); return; }
      videoEl.srcObject = stream;
      await videoEl.play();
    } catch {
      closeCamera();
      cameraError = t.camera_error;
      cameraInput?.click();
    }
  }

  function closeCamera() {
    cameraOpen = false;
    if (cameraStream) {
      for (const track of cameraStream.getTracks()) track.stop();
      cameraStream = null;
    }
    if (videoEl) videoEl.srcObject = null;
  }

  function capturePhoto() {
    if (!videoEl || !videoEl.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { closeCamera(); return; }
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) acceptFile(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        closeCamera();
      },
      'image/jpeg',
      0.92
    );
  }

  onDestroy(closeCamera);

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

    <!-- Camera shortcut — sits outside the dropzone (whose label would otherwise
         swallow taps); shown on touch devices via CSS. Opens a live in-app
         camera (getUserMedia) so it works in the Tauri WebView too. -->
    <button type="button" class="camera-btn" onclick={openCamera}>
      <Camera size={18} />
      {t.take_photo}
    </button>
    {#if cameraError}
      <p class="camera-error">{cameraError}</p>
    {/if}
    <!-- Fallback for browsers without a usable getUserMedia (insecure context, etc.) -->
    <input
      bind:this={cameraInput}
      type="file"
      accept="image/*"
      capture="environment"
      onchange={handleImageChange}
      disabled={uploading}
      hidden
    />
  {/if}

  {#if cameraOpen}
    <div class="camera-overlay" role="dialog" aria-modal="true" aria-label={t.take_photo}>
      <video bind:this={videoEl} class="camera-video" playsinline autoplay muted></video>
      <div class="camera-controls">
        <button type="button" class="camera-cancel" onclick={closeCamera}>
          <X size={20} />
          {t.cancel}
        </button>
        <button type="button" class="camera-shutter" onclick={capturePhoto} aria-label={t.capture_photo}></button>
        <span class="camera-spacer"></span>
      </div>
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

  /* Camera shortcut — only meaningful on devices with a camera (touch). */
  .camera-btn {
    display: none;
    align-items: center;
    gap: 0.45rem;
    width: fit-content;
    margin: 0.85rem auto 0;
    padding: 0.6rem 1.3rem;
    border: 1.5px solid var(--color-primary);
    border-radius: var(--radius-pill, 1000px);
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }

  .camera-btn:active {
    transform: scale(0.98);
  }

  @media (pointer: coarse) {
    .camera-btn {
      display: flex;
    }
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

  .camera-error {
    margin: 0.5rem 0 0;
    text-align: center;
    color: var(--red);
    font-size: 0.85rem;
  }

  /* Full-screen live camera */
  .camera-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: #000;
    display: flex;
    flex-direction: column;
  }
  .camera-video {
    flex: 1;
    width: 100%;
    min-height: 0;
    object-fit: contain;
    background: #000;
  }
  .camera-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.5rem calc(1.25rem + env(safe-area-inset-bottom));
    background: #000;
  }
  .camera-cancel {
    flex: 1;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: none;
    color: #fff;
    font-size: 0.95rem;
    cursor: pointer;
  }
  .camera-spacer { flex: 1; }
  .camera-shutter {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #fff;
    border: 4px solid rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: transform 0.1s;
  }
  .camera-shutter:active { transform: scale(0.94); }
</style>
