// Function to strip HTML tags from a string
export function stripHtmlTags(input: string | undefined | null): string {
  if (!input) {
    return '';
  }
  return input
    .replace(/&shy;/g, '')      // Remove soft hyphens
    .replace(/<[^>]*>/g, '')    // Remove HTML tags
    .replace(/&amp;/g, '&')     // Decode common HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
