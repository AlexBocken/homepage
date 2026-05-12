/**
 * Lightweight Web Audio cues for the active workout.
 * One shared AudioContext is reused across calls so we don't leak contexts.
 */

let _ctx: AudioContext | null = null;

function _getCtx(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	try {
		if (!_ctx) {
			const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
			if (!Ctor) return null;
			_ctx = new Ctor();
		}
		if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
		return _ctx;
	} catch {
		return null;
	}
}

type Note = {
	freq: number;
	start: number;
	dur: number;
	gain?: number;
	type?: OscillatorType;
};

function _playNotes(notes: Note[]) {
	const ctx = _getCtx();
	if (!ctx) return;
	const now = ctx.currentTime;
	for (const n of notes) {
		try {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = n.type ?? 'sine';
			osc.frequency.value = n.freq;
			const peak = n.gain ?? 0.18;
			gain.gain.setValueAtTime(0.0001, now + n.start);
			gain.gain.exponentialRampToValueAtTime(peak, now + n.start + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
			osc.connect(gain).connect(ctx.destination);
			osc.start(now + n.start);
			osc.stop(now + n.start + n.dur + 0.02);
		} catch {}
	}
}

/**
 * Short, bright "check" cue played when a single set is marked complete.
 * Two stacked sine tones a fifth apart for a quick, satisfying tick.
 */
export function playSetCompleteSound() {
	_playNotes([
		{ freq: 880, start: 0, dur: 0.09, gain: 0.18 }, // A5
		{ freq: 1320, start: 0.05, dur: 0.11, gain: 0.13 } // E6
	]);
}

/**
 * Two-note rise played when the final set of an exercise is checked and we
 * auto-advance. Sequential (vs. the per-set tick's stacked fifth) so it reads
 * as a small step up — not a fanfare.
 */
export function playExerciseCompleteSound() {
	_playNotes([
		{ freq: 880, start: 0.0, dur: 0.12, gain: 0.18 }, // A5
		{ freq: 1318.51, start: 0.1, dur: 0.18, gain: 0.16 } // E6
	]);
}

/**
 * Triumphant fanfare for whole-workout completion: a rising C-major arpeggio
 * resolving onto a sustained tonic triad with an upper-octave highlight.
 */
export function playWorkoutCompleteSound() {
	const notes: Note[] = [
		// Quick rising arpeggio
		{ freq: 523.25, start: 0.0, dur: 0.14, gain: 0.18 }, // C5
		{ freq: 659.25, start: 0.1, dur: 0.14, gain: 0.18 }, // E5
		{ freq: 783.99, start: 0.2, dur: 0.14, gain: 0.18 }, // G5
		{ freq: 1046.5, start: 0.3, dur: 0.18, gain: 0.2 }, // C6
		// A brief V chord (G major) before resolution for a fanfare feel
		{ freq: 783.99, start: 0.48, dur: 0.22, gain: 0.15 }, // G5
		{ freq: 987.77, start: 0.48, dur: 0.22, gain: 0.12 }, // B5
		{ freq: 1174.66, start: 0.48, dur: 0.22, gain: 0.1 }, // D6
		// Sustained tonic triad with octave doubling
		{ freq: 523.25, start: 0.72, dur: 1.1, gain: 0.16 }, // C5
		{ freq: 659.25, start: 0.72, dur: 1.1, gain: 0.13 }, // E5
		{ freq: 783.99, start: 0.72, dur: 1.1, gain: 0.13 }, // G5
		{ freq: 1046.5, start: 0.72, dur: 1.1, gain: 0.12 }, // C6
		// Bright highlight on top
		{ freq: 1568.0, start: 0.88, dur: 0.55, gain: 0.09 } // G6
	];
	_playNotes(notes);
}
