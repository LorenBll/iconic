import ObsidianUtils from 'src/utils/ObsidianUtils.js';
import DEFAULT_STRINGS from 'i18n/en.json';
import LUCIDE_NAMES from 'res/lucide-names.json';

/**
 * 1,736 Lucide icon IDs. Includes 3,581 keywords ("tags") for search filtering.
 * @version 1.21
 * @license ISC
 * @see {@link https://unpkg.com/lucide-static@1.21.0/tags.json}
 */
import LUCIDE_KEYWORDS from 'res/lucide-keywords.json';

/**
 * 1,923 emojis, with alternate encodings / skin tone variants excluded.
 * @version 17.0
 * @license Unicode-3.0
 * @see {@link https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt}
 *
 * Includes 3,714 keywords ("annotations") from the Unicode CLDR Project.
 * @version 48.2.0
 * @license Unicode-3.0
 * @see {@link https://github.com/unicode-org/cldr-json/blob/main/cldr-json/cldr-annotations-full/annotations/en/annotations.json}
 */
import EMOJIS from 'res/emojis.json';

/**
 * Dynamically imports data for strings, icons, and emojis.
 */
export default class ResourceUtils {
	/**
	 * Get strings localized for a given language.
	 */
	static getStrings(language: string): typeof DEFAULT_STRINGS {
		let promise: Promise<{ default: typeof DEFAULT_STRINGS }>;
		switch (language) {
			case 'ar': promise = import('i18n/ar.json'); break;
			case 'de': promise = import('i18n/de.json'); break;
			case 'en-GB': promise = import('i18n/en-GB.json'); break;
			case 'es': promise = import('i18n/es.json'); break;
			case 'fr': promise = import('i18n/fr.json'); break;
			case 'id': promise = import('i18n/id.json'); break;
			case 'ja': promise = import('i18n/ja.json'); break;
			case 'ru': promise = import('i18n/ru.json'); break;
			case 'uk': promise = import('i18n/uk.json'); break;
			case 'zh': promise = import('i18n/zh.json'); break;
			default: return DEFAULT_STRINGS;
		}
		promise.then(localizedStrings => {
			this.localizeStrings(DEFAULT_STRINGS, localizedStrings);
		});
		return DEFAULT_STRINGS;
	}

	/**
	 * Get a list of icon IDs (mapped to their names and keywords), and a flat list of their keywords.
	 * @param iconIds The icon IDs supported by this Obsidian client.
	 */
	static getIcons(iconIds: string[]): [
		icons: Map<string, [string, string[]]>,
		keywords: Set<string>,
	] {
		const lucideNames = new Map<string, string>(
			(LUCIDE_NAMES as [string, string][]).map(([id, name]) => ['lucide-' + id, name])
		);
		const lucideKeywords = new Map<string, string[]>(
			(LUCIDE_KEYWORDS as [string, string[]][]).map(([id, keywords]) => ['lucide-' + id, keywords])
		);
		const allIcons = new Map<string, [string, string[]]>();
		const allKeywords = new Set<string>();

		for (const iconId of iconIds) {
			const name = lucideNames.get(iconId) ?? this.iconIdToName(iconId);
			const keywords = lucideKeywords.get(iconId) ?? [];

			allIcons.set(iconId, [name, keywords.sort()]);
			for (const keyword of keywords) {
				allKeywords.add(keyword);
			}
		}

		const sortedKeywords = new Set(Array.from(allKeywords).sort());
		return [allIcons, sortedKeywords];
	}

	/**
	 * Get a list of emoji glyphs (mapped to their names and keywords), and a flat list of their keywords.
	 */
	static getEmojis(): [
		emojis: Map<string, [string, string[]]>,
		keywords: Set<string>,
	] {
		const allEmojis = new Map<string, [string, string[]]>(
			EMOJIS as [string, [string, string[]]][]
		);
		const allKeywords = new Set<string>();

		// Find all unique keywords
		for (const [, [, keywords]] of allEmojis) {
			for (const keyword of keywords) {
				allKeywords.add(keyword);
			}
		}

		const sortedKeywords = new Set(Array.from(allKeywords).sort());
		return [allEmojis, sortedKeywords];
	}

	/**
	 * Replace default strings with localized strings.
	 */
	private static localizeStrings(defaultStrings: Record<string, unknown>, localizedStrings: Record<string, unknown>): void {
		for (const [key, localizedValue] of Object.entries(localizedStrings)) {
			const defaultValue = defaultStrings[key];
			if (ObsidianUtils.isObject(defaultValue) && ObsidianUtils.isObject(localizedValue)) {
				this.localizeStrings(defaultValue, localizedValue);
			} else if (typeof defaultValue === 'string' && typeof localizedValue === 'string') {
				defaultStrings[key] = localizedValue;
			}
		}
	}

	/**
	 * Generate a readable name for an icon ID:
	 * 1) Remove any lucide- prefix
	 * 2) Replace hyphens with spaces
	 * 3) Use sentence case
	 */
	private static iconIdToName(iconId: string): string {
		if (!iconId) return '';
		const replacedName = iconId.replace(/^lucide-/, '').replaceAll('-', ' ');
		const capitalizedName = replacedName[0]?.toUpperCase() + replacedName.slice(1);
		return capitalizedName;
	}
}
