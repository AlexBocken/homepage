// Function to strip HTML tags from a string
function stripHtmlTags(input) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  const textContent = doc.body.textContent || "";
  return textContent;
}
