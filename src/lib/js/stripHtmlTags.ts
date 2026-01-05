// Function to strip HTML tags from a string
import {load} from 'cheerio';

export function stripHtmlTags(input: string): string {
  const $ = load(input.replace(/&shy;/g, ''));
  return $.text();
}
