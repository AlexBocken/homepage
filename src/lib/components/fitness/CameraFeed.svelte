<script>
	/**
	 * A plain live camera feed that fills its host — no pose detection. Used as the
	 * background for timed/hold exercises (planks, stretches) in the mobile coach,
	 * where the heavy pose model isn't needed. Defaults to the selfie camera and
	 * re-acquires when `facing` flips. Fails silently to a transparent feed (the
	 * HUD shows its own gradient fallback) when no camera is available.
	 *
	 * @type {{ facing?: 'environment' | 'user' }}
	 */
	let { facing = 'user' } = $props();

	/** @type {HTMLVideoElement | null} */
	let videoEl = $state(null);

	// (Re)acquire the stream whenever `facing` changes; the cleanup stops the
	// previous stream so flips don't leak camera handles.
	$effect(() => {
		const wanted = facing;
		if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) return;
		let cancelled = false;
		/** @type {MediaStream | null} */
		let stream = null;
		(async () => {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: wanted, width: { ideal: 1280 }, height: { ideal: 720 } }
				});
				if (cancelled) {
					for (const track of stream.getTracks()) track.stop();
					return;
				}
				if (videoEl) {
					videoEl.srcObject = stream;
					await videoEl.play();
				}
			} catch {
				// no camera / denied → leave it blank; the HUD's gradient shows through
			}
		})();
		return () => {
			cancelled = true;
			for (const track of stream?.getTracks() ?? []) track.stop();
		};
	});
</script>

<video bind:this={videoEl} playsinline muted></video>

<style>
	video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
