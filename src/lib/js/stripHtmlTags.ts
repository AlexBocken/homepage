// Function to strip HTML tags from a string
import {load} from 'cheerio';

export function stripHtmlTags(input) {
  const $ = load(input)
  return $.text();
}
