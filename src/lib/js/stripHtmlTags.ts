// Function to strip HTML tags from a string
import {load} from 'cheerio';

export function stripHtmlTags(input: string | undefined | null): string {
  if (!input) {
    return '';
  }
  const $ = load(input.replace(/&shy;/g, ''));
  return $.text();
}
