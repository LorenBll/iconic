import { prepareFuzzySearch, SearchComponent } from 'obsidian';
import { ICONS, EMOJIS, STRINGS } from 'src/IconicPlugin.js';

type IconSearchModes = { iconMode?: boolean, emojiMode?: boolean };
export type IconSearchResult = [id: string, name: string, score: number];

/**
 * Search field that searches the icon list and passes the results to a callback.
 */
export default class IconSearchComponent extends SearchComponent {
	private iconMode = true;
	private emojiMode = false;
	private searchCallback: ((query: string, results: IconSearchResult[]) => void) | null = null;

	constructor(containerEl: HTMLElement) {
		super(containerEl);
		this.onChange(() => void this.dispatchResults());
	}

	/**
	 * Enable or disable icon & emoji results.
	 */
	setModes(modes: IconSearchModes): this {
		const { iconMode, emojiMode } = modes;
		if (iconMode !== undefined) this.iconMode = iconMode;
		if (emojiMode !== undefined) this.emojiMode = emojiMode;
		this.updatePlaceholder();
		void this.dispatchResults();
		return this;
	}

	/**
	 * Set a callback to receive search results.
	 */
	onSearch(callback: (query: string, results: IconSearchResult[]) => void): this {
		this.searchCallback = callback;
		return this;
	}

	/**
	 * Update placeholder text based on current icon & emoji modes.
	 */
	private updatePlaceholder(): void {
		if (this.iconMode && this.emojiMode) {
			this.setPlaceholder(STRINGS.iconPicker.searchMix);
		} else if (this.emojiMode) {
			this.setPlaceholder(STRINGS.iconPicker.searchEmojis);
		} else {
			this.setPlaceholder(STRINGS.iconPicker.searchIcons);
		}
	}

	private async dispatchResults(): Promise<void> {
		if (!this.searchCallback) return;

		const query = this.getValue();
		if (!query) {
			this.searchCallback(query, []);
			return;
		}
		
		const queryLower = query.toLowerCase();
		const fuzzySearch = prepareFuzzySearch(query);
		const iconEntries = [
			...(this.iconMode ? ICONS : []),
			...(this.emojiMode ? EMOJIS : []),
		];
		const results: IconSearchResult[] = [];

		for (const [id, [name]] of iconEntries) {
			const idLower = id.toLowerCase();
			const nameLower = name.toLowerCase();

			// Check for an exact ID or name match
			if (queryLower === idLower || queryLower === nameLower) {
				results.push([id, name, 1]);
				continue;
			}

			// Check for a start-of-name match
			if (nameLower.startsWith(queryLower)) {
				results.push([id, name, 0]);
				continue;
			}

			// Check for a fuzzy name match
			const nameScore = fuzzySearch(name)?.score;
			if (!nameScore) continue;

			results.push([id, name, nameScore]);
		}

		// Sort results by score
		results.sort(([, nameA, scoreA], [, nameB, scoreB]) => {
			if (scoreA === scoreB) {
				return nameA.localeCompare(nameB);
			} else {
				return scoreA < scoreB ? 1 : -1
			}
		});

		// Send results to callback
		this.searchCallback(query, results);
	}
}
