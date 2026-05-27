export const DEFAULT_TARGET_LANGUAGE_CODE = "en";

export const supportedOutputLanguages = [
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "fr", name: "French" },
  { code: "ja", name: "Japanese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "de", name: "German" },
  { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesian" },
  { code: "vi", name: "Vietnamese" },
  { code: "it", name: "Italian" },
  { code: "en", name: "English" },
];

export function sanitizeOutputLanguageCode(code) {
  const normalized = normalizeLanguageCode(code);
  return supportedOutputLanguages.some((language) => language.code === normalized)
    ? normalized
    : DEFAULT_TARGET_LANGUAGE_CODE;
}

export function outputLanguageName(code) {
  const sanitized = sanitizeOutputLanguageCode(code);
  return supportedOutputLanguages.find((language) => language.code === sanitized)?.name ?? "English";
}

function normalizeLanguageCode(code) {
  const primary = String(code ?? "")
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];

  if (primary === "in") {
    return "id";
  }

  return primary;
}
