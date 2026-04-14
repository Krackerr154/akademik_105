import {
  DEFAULT_DOCUMENT_TYPE_CODES,
  normalizeDocumentTypeCode,
} from "@/types";

export interface ExtractedMetadata {
  title: string;
  docType: string;
  subject: string;
  year: string;
  authors: string;
}

const DOC_TYPE_ALIASES: Record<string, string> = {
  UJIAN1: "UJIAN 1",
  UJIAN2: "UJIAN 2",
  UJIAN3: "UJIAN 3",
};

function resolveDocumentTypeToken(token: string): string {
  const normalized = normalizeDocumentTypeCode(token);
  const compact = normalized.replace(/\s+/g, "");

  if (DOC_TYPE_ALIASES[normalized]) {
    return DOC_TYPE_ALIASES[normalized];
  }
  if (DOC_TYPE_ALIASES[compact]) {
    return DOC_TYPE_ALIASES[compact];
  }
  if ((DEFAULT_DOCUMENT_TYPE_CODES as readonly string[]).includes(normalized)) {
    return normalized;
  }

  return normalized || "OTHER";
}

export function extractMetadataFromFilename(filename: string): ExtractedMetadata {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  const metadata: ExtractedMetadata = {
    title: nameWithoutExt,
    docType: "OTHER",
    subject: "",
    year: "",
    authors: "",
  };

  // 1. Extract bracket tokens and map primary one to document type.
  const tagRegex = /\[(.*?)\]/g;
  let match;
  const nonAuthorTokens: string[] = [];
  
  // Collect all brackets, author-like token can still be parsed separately.
  while ((match = tagRegex.exec(nameWithoutExt)) !== null) {
      const content = match[1];
      // Detect author marker, e.g. [Er'19].
      if (/^[A-Za-z]+'\d{2}$/.test(content)) {
          metadata.authors = content;
      } else {
          nonAuthorTokens.push(content);
      }
  }

  if (nonAuthorTokens.length > 0) {
      metadata.docType = resolveDocumentTypeToken(nonAuthorTokens[0]);
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