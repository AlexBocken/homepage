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
	options?: {
		temperature?: number;
		top_p?: number;
		max_tokens?: number;
	};
}

export interface OllamaGenerateResponse {
	model: string;
	created_at: string;
	response: string;
	done: boolean;
}

/**
 * Generate text response from Ollama model with optional image input
 */
export async function generateWithOllama(
	request: OllamaGenerateRequest
): Promise<string> {
	const ollamaUrl = OLLAMA_URL || 'http://localhost:11434';

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
		});

		if (!response.ok) {
			throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
		}

		const data = (await response.json()) as OllamaGenerateResponse;
		return data.response.trim();
	} catch (error) {
		console.error('Ollama API error:', error);
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
		});
		return response.ok;
	} catch {
		return false;
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
		return data.models?.map((m: any) => m.name) || [];
	} catch (error) {
		console.error('Failed to list Ollama models:', error);
		return [];
	}
}
