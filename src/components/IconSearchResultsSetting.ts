import { Setting } from 'obsidian';
import IconButtonComponent from 'src/components/IconButtonComponent.js';
import { IconSearchResult } from 'src/components/IconSearchComponent.js';

export default class IconSearchResultsSetting extends Setting {
	private color: string | null = null;
	private limit = 50;
	private forEachCallback: ((button: IconButtonComponent, result: IconSearchResult) => void) | null = null;

	// Components
	private readonly iconButtons: IconButtonComponent[] = [];
	private placeholderButton: IconButtonComponent | null = null;

	constructor(containerEl: HTMLElement) {
		super(containerEl);
		this.setClass('iconic-search-results');
		this.settingEl.tabIndex = 0;
		this.infoEl.remove();
	}

	/**
	 * Set the color of all icons.
	 */
	setColor(color: string | null): this {
		this.color = color;
		for (const iconButton of this.iconButtons) {
			iconButton.setColor(color);
		}
		return this;
	}

	/**
	 * The maximum number of icons to display. Range is limited between 10 and 300.
	 */
	setLimit(limit: number): this {
		this.limit = Math.max(10, Math.min(limit, 300));

		// Remove any excess buttons
		if (this.iconButtons.length > limit) {
			for (let i = limit; i < this.iconButtons.length; i += 1) {
				this.iconButtons[i]?.extraSettingsEl.remove();
			}
			this.iconButtons.length = limit;
		}

		return this;
	}

	/**
	 * Update the current list of icons.
	 */
	async setResults(results: IconSearchResult[]): Promise<void> {
		this.settingEl.scrollLeft = 0;
		const forLength = Math.max(results.length, this.iconButtons.length);

		// Remove any placeholder button
		if (forLength > 0) {
			this.placeholderButton?.extraSettingsEl.remove();
			this.placeholderButton = null;
		}

		// Populate icons by recycling existing buttons
		for (let i = 0; i < forLength; i += 1) {
			const result = results[i];
			const iconButton = this.iconButtons[i] ?? new IconButtonComponent(this.controlEl);
			this.iconButtons[i] = iconButton;

			if (result && i < this.limit) {
				// Set up or modify button
				const [id] = result;
				iconButton
					.setIcon(id)
					.setColor(this.color)
					.setClass('iconic-search-result')
					.setClass('iconic-icon')
					.then(() => this.forEachCallback?.(iconButton, result));
			} else {
				// Remove excess button
				iconButton?.extraSettingsEl.remove();
			}
		}

		// Resize buttons array
		if (this.iconButtons.length > results.length) {
			this.iconButtons.length = results.length;
		}

		// If container is empty, add a placeholder button to preserve height
		if (this.iconButtons.length === 0 && !this.placeholderButton) {
			this.placeholderButton = new IconButtonComponent(this.controlEl)
				.setClass('iconic-invisible')
				.setClass('iconic-search-result');
		}
	}

	/**
	 * Set a callback for each icon button.
	 */
	forEach(callback: (iconButton: IconButtonComponent, result: IconSearchResult) => void): this {
		this.forEachCallback = callback;
		return this;
	}
}
