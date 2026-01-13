/**
 * Image validation utility with comprehensive security checks
 *
 * Implements 5-layer security validation:
 * 1. File size check (5MB max)
 * 2. Magic bytes validation (detects actual file type)
 * 3. MIME type verification
 * 4. Extension validation
 * 5. Sharp structure validation
 */

import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// Valid magic bytes for image formats
const MAGIC_BYTES = {
	jpeg: [0xFF, 0xD8, 0xFF],
	png: [0x89, 0x50, 0x4E, 0x47],
	webp: [0x52, 0x49, 0x46, 0x46] // RIFF header (WebP)
};

/**
 * Validates an uploaded image file with comprehensive security checks
 * @param file - The File object to validate
 * @returns ValidationResult with valid flag and optional error message
 */
export async function validateImageFile(file: File): Promise<ValidationResult> {
	// Layer 1: Check file size
	if (file.size > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
		};
	}

	if (file.size === 0) {
		return {
			valid: false,
			error: 'File is empty'
		};
	}

	// Layer 2: Check MIME type (client-provided)
	if (!ALLOWED_MIME_TYPES.includes(file.type)) {
		return {
			valid: false,
			error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}. Received: ${file.type || 'unknown'}`
		};
	}

	// Layer 3: Check file extension
	const extension = file.name.split('.').pop()?.toLowerCase();
	if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
		return {
			valid: false,
			error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}. Received: ${extension || 'none'}`
		};
	}

	// Convert File to Buffer for magic bytes validation
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	// Layer 4: Magic bytes validation using file-type library
	try {
		const fileType = await fileTypeFromBuffer(buffer);

		if (!fileType) {
			return {
				valid: false,
				error: 'Unable to detect file type from file headers. File may be corrupted or not a valid image.'
			};
		}

		// Verify detected type matches allowed types
		if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
			return {
				valid: false,
				error: `File headers indicate type "${fileType.mime}" which is not allowed. This file may have been renamed to bypass filters.`
			};
		}

		// Verify MIME type consistency
		if (fileType.mime !== file.type) {
			return {
				valid: false,
				error: `File type mismatch: claimed to be "${file.type}" but actual type is "${fileType.mime}". Possible file spoofing attempt.`
			};
		}
	} catch (error) {
		return {
			valid: false,
			error: `Failed to validate file headers: ${error.message}`
		};
	}

	// Layer 5: Validate image structure with Sharp
	try {
		const metadata = await sharp(buffer).metadata();

		if (!metadata.width || !metadata.height) {
			return {
				valid: false,
				error: 'Invalid image: unable to read image dimensions'
			};
		}

		if (metadata.width > 10000 || metadata.height > 10000) {
			return {
				valid: false,
				error: `Image dimensions too large: ${metadata.width}x${metadata.height}. Maximum: 10000x10000px`
			};
		}
	} catch (error) {
		return {
			valid: false,
			error: `Invalid or corrupted image file: ${error.message}`
		};
	}

	return { valid: true };
}

/**
 * Validates a Buffer containing image data (for base64-decoded images)
 * @param buffer - The Buffer to validate
 * @param filename - Original filename for extension validation
 * @returns ValidationResult with valid flag and optional error message
 */
export async function validateImageBuffer(buffer: Buffer, filename: string): Promise<ValidationResult> {
	// Layer 1: Check buffer size
	if (buffer.length > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `Buffer size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB. Current size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`
		};
	}

	if (buffer.length === 0) {
		return {
			valid: false,
			error: 'Buffer is empty'
		};
	}

	// Layer 2: Check file extension
	const extension = filename.split('.').pop()?.toLowerCase();
	if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
		return {
			valid: false,
			error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}. Received: ${extension || 'none'}`
		};
	}

	// Layer 3: Magic bytes validation
	try {
		const fileType = await fileTypeFromBuffer(buffer);

		if (!fileType) {
			return {
				valid: false,
				error: 'Unable to detect file type from buffer headers. Buffer may be corrupted.'
			};
		}

		if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
			return {
				valid: false,
				error: `Buffer headers indicate type "${fileType.mime}" which is not allowed.`
			};
		}
	} catch (error) {
		return {
			valid: false,
			error: `Failed to validate buffer headers: ${error.message}`
		};
	}

	// Layer 4: Validate image structure with Sharp
	try {
		const metadata = await sharp(buffer).metadata();

		if (!metadata.width || !metadata.height) {
			return {
				valid: false,
				error: 'Invalid image buffer: unable to read image dimensions'
			};
		}

		if (metadata.width > 10000 || metadata.height > 10000) {
			return {
				valid: false,
				error: `Image dimensions too large: ${metadata.width}x${metadata.height}. Maximum: 10000x10000px`
			};
		}
	} catch (error) {
		return {
			valid: false,
			error: `Invalid or corrupted image buffer: ${error.message}`
		};
	}

	return { valid: true };
}
