export interface EntryTranslation {
    entry: string; 
    lang: string; 
    literalTranslations: string[]; 
    colloquialTranslations: string[]; 
    source_ai: string; // Source of the translation (e.g., "Google Translate", "DeepL")
}
