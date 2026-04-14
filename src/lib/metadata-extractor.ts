export interface ExtractedMetadata {
  title: string;
  tags: string[];
  subject: string;
  year: string;
  authors: string;
}

const SUBJECT_MAP: Record<string, string> = {
  KUGU: "KI3131",
  SKA: "KI2231",
  LTKK: "KI3231",
};

export function extractMetadataFromFilename(filename: string): ExtractedMetadata {
  let nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  const metadata: ExtractedMetadata = {
    title: nameWithoutExt,
    tags: [],
    subject: "",
    year: "",
    authors: "",
  };

  // 1. Extract Tags (e.g., [SLIDE], [UJIAN 1])
  const tagRegex = /\[(.*?)\]/g;
  let match;
  const tagsFound: string[] = [];
  
  // We'll collect all brackets, but typically the first one is the category and others might be author
  while ((match = tagRegex.exec(nameWithoutExt)) !== null) {
      const content = match[1];
      // Check if it looks like an author tag e.g. [Er'19]
      if (/^[A-Za-z]+'\d{2}$/.test(content)) {
          metadata.authors = content;
      } else {
          tagsFound.push(content.toUpperCase());
      }
  }
  if (tagsFound.length > 0) {
      metadata.tags = tagsFound;
  }

  // Remove bracketed parts to clean up title
  let cleanedTitle = nameWithoutExt.replace(/\[.*?\]/g, "").trim();

  // 2. Extract Year (e.g., 2019, 2024)
  const yearRegex = /\b((?:19|20)\d{2})\b/;
  const yearMatch = cleanedTitle.match(yearRegex);
  if (yearMatch) {
      metadata.year = yearMatch[1];
      // remove year from title
      cleanedTitle = cleanedTitle.replace(yearRegex, "").replace(/\s{2,}/g, " ").trim();
  }

  // 3. Extract Subject
  // Check for known abbreviations like KUGU, SKA, LTKK
  const subjectRegex = /\b(KUGU|SKA|LTKK)\b/i;
  const subjectMatch = cleanedTitle.match(subjectRegex);
  if (subjectMatch) {
      const abbr = subjectMatch[1].toUpperCase();
      metadata.subject = abbr; // Alternatively save SUBJECT_MAP[abbr] or use BOTH
      // Let's just save the abbreviation, users can pick from their Dropdown in UI
      cleanedTitle = cleanedTitle.replace(subjectRegex, "").replace(/\s{2,}/g, " ").trim();
  }

  // Cleanup: remove any leading/trailing dashes, underscores, spaces
  cleanedTitle = cleanedTitle.replace(/^[-_\s]+|[-_\s]+$/g, "");
  
  // If the cleaned title is empty (unlikely but possible), fallback to original without ext
  metadata.title = cleanedTitle || nameWithoutExt;

  return metadata;
}