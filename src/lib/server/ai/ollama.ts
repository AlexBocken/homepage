import { OLLAMA_URL } from '$env/static/private';
import { readFile } from 'fs/promises';

/**
 * Ollama API client for local vision model inference
 */

export interface OllamaGenerateRequest {
	model: string;
	prompt: string;
	images?: string[]; // base64 encoded images
	stream?: boolean;
	/**
	 * Reasoning models (the Qwen3 family among them) emit a long hidden chain of
	 * thought before the answer unless this is false. For a one-sentence image
	 * caption that thinking is pure latency.
	 */
	think?: boolean;
	/** How long to keep the model resident after the call, e.g. "15m". */
	keep_alive?: string;
	options?: {
		temperature?: number;
		top_p?: number;
		/**
		 * Ollama's cap on generated tokens. NOTE: it is `num_predict`, NOT the
		 * OpenAI-style `max_tokens` — an unknown key in `options` is silently
		 * ignored, so `max_tokens` let the model ramble to its own stop token.
		 */
		num_predict?: number;
		/** Context window. Oversizing this wastes VRAM and can force CPU offload. */
		num_ctx?: number;
	};
}

export interface OllamaGenerateResponse {
	model: string;
	created_at: string;
	response: string;
	done: boolean;
	// Nanosecond timings Ollama reports on a completed non-streaming generate.
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	prompt_eval_duration?: number;
	eval_count?: number;
	eval_duration?: number;
}

/**
 * Hard ceiling on a single generate call. Without it a stalled Ollama leaves the
 * request hanging forever and the caller never learns why.
 */
const OLLAMA_TIMEOUT_MS = 10 * 60 * 1000;

let requestCounter = 0;

const ms = (start: number) => `${((Date.now() - start) / 1000).toFixed(1)}s`;
const nsToS = (n?: number) => (typeof n === 'number' ? `${(n / 1e9).toFixed(1)}s` : '?');

/**
 * Generate text response from Ollama model with optional image input
 */
export async function generateWithOllama(
	request: OllamaGenerateRequest
): Promise<string> {
	const ollamaUrl = OLLAMA_URL || 'http://localhost:11434';
	const id = ++requestCounter;
	const startedAt = Date.now();

	const imageBytes = (request.images ?? []).reduce((sum, img) => sum + img.length, 0);
	console.log(
		`[ollama #${id}] POST ${ollamaUrl}/api/generate model=${request.model} ` +
			`prompt=${request.prompt.length}chars images=${request.images?.length ?? 0} ` +
			`imageB64=${(imageBytes / 1024).toFixed(0)}KB timeout=${OLLAMA_TIMEOUT_MS / 1000}s`
	);

	try {
		const response = await fetch(`${ollamaUrl}/api/generate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				...request,
				stream: false, // Always use non-streaming for simpler handling
			}),
			signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
		});

		console.log(`[ollama #${id}] headers received after ${ms(startedAt)} status=${response.status}`);

		if (!response.ok) {
			// Ollama puts the actual reason (unknown model, bad request, OOM) in the body.
			const body = await response.text().catch(() => '<unreadable body>');
			console.error(`[ollama #${id}] error body: ${body.slice(0, 500)}`);
			throw new Error(
				`Ollama API error: ${response.status} ${response.statusText} — ${body.slice(0, 200)}`
			);
		}

		const data = (await response.json()) as OllamaGenerateResponse;
		console.log(
			`[ollama #${id}] body read after ${ms(startedAt)} done=${data.done} ` +
				`response=${data.response?.length ?? 0}chars ` +
				`total=${nsToS(data.total_duration)} load=${nsToS(data.load_duration)} ` +
				`promptEval=${data.prompt_eval_count ?? '?'}tok/${nsToS(data.prompt_eval_duration)} ` +
				`eval=${data.eval_count ?? '?'}tok/${nsToS(data.eval_duration)}`
		);

		if (typeof data.response !== 'string') {
			console.error(`[ollama #${id}] no "response" field. Raw keys: ${Object.keys(data).join(', ')}`);
			throw new Error('Ollama response had no "response" field');
		}

		return data.response.trim();
	} catch (error) {
		const name = error instanceof Error ? error.name : 'Unknown';
		console.error(`[ollama #${id}] failed after ${ms(startedAt)} (${name}):`, error);
		if (name === 'TimeoutError') {
			throw new Error(
				`Ollama did not respond within ${OLLAMA_TIMEOUT_MS / 1000}s (model=${request.model})`
			);
		}
		throw new Error(`Failed to generate response from Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * Convert image file path to base64 string
 */
export async function imageToBase64(imagePath: string): Promise<string> {
	const imageBuffer = await readFile(imagePath);
	return imageBuffer.toString('base64');
}

/**
 * Check if Ollama server is available
 */
export async function checkOllamaHealth(): Promise<boolean> {
	const ollamaUrl = OLLAMA_URL || 'http://localhost:11434';

	try {
		const response = await fetch(`${ollamaUrl}/api/tags`, {
			method: 'GET',
			signal: AbortSignal.timeout(5000),
		});
		console.log(`[ollama] health check ${ollamaUrl} -> ${response.status}`);
		return response.ok;
	} catch (err) {
		console.error(`[ollama] health check ${ollamaUrl} failed:`, err);
		return false;
	}
}

/**
 * Log whether the requested model is actually present on the server. Purely
 * diagnostic — never throws, so it can't break a generation run.
 */
export async function logModelAvailability(modelName: string): Promise<void> {
	try {
		const models = await listOllamaModels();
		const present = models.includes(modelName);
		console.log(
			`[ollama] model "${modelName}" ${present ? 'is present' : 'NOT FOUND'}. ` +
				`Available: ${models.join(', ') || '<none>'}`
		);
	} catch (err) {
		console.error('[ollama] model availability check failed:', err);
	}
}

/**
 * Log where a loaded model actually lives. If `size_vram` is materially below
 * `size`, the remainder is running on CPU and generation will be an order of
 * magnitude slower — the usual cause of "why is my GPU box this slow". Purely
 * diagnostic; never throws.
 */
export async function logRuntimePlacement(): Promise<void> {
	const ollamaUrl = OLLAMA_URL || 'http://localhost:11434';

	try {
		const response = await fetch(`${ollamaUrl}/api/ps`, { signal: AbortSignal.timeout(5000) });
		if (!response.ok) {
			console.warn(`[ollama] /api/ps returned ${response.status}`);
			return;
		}

		const data = (await response.json()) as {
			models?: Array<{ name: string; size?: number; size_vram?: number }>;
		};

		if (!data.models?.length) {
			console.log('[ollama] no models currently loaded');
			return;
		}

		for (const m of data.models) {
			const size = m.size ?? 0;
			const vram = m.size_vram ?? 0;
			const gpuPct = size > 0 ? Math.round((vram / size) * 100) : 0;
			console.log(
				`[ollama] loaded ${m.name}: ${(size / 1e9).toFixed(1)}GB total, ` +
					`${(vram / 1e9).toFixed(1)}GB in VRAM (${gpuPct}% GPU)` +
					(gpuPct < 95 ? ' <-- PARTIAL CPU OFFLOAD, expect it to be very slow' : '')
			);
		}
	} catch (err) {
		console.error('[ollama] runtime placement check failed:', err);
	}
}

/**
 * List available models on Ollama server
 */
export async function listOllamaModels(): Promise<string[]> {
	const ollamaUrl = OLLAMA_URL || 'http://localhost:11434';

	try {
		const response = await fetch(`${ollamaUrl}/api/tags`, {
			method: 'GET',
		});

		if (!response.ok) {
			throw new Error('Failed to fetch models');
		}

		const data = await response.json();
		return data.models?.map((m: { name: string }) => m.name) || [];
	} catch (error) {
		console.error('Failed to list Ollama models:', error);
		return [];
	}
}
