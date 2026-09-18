import { AbstractInputSuggest, TextComponent, prepareFuzzySearch } from 'obsidian';
import IconicPlugin, { STRINGS } from 'src/IconicPlugin.js';
import ExternalLibraryManager, { ExternalLibrary } from 'src/managers/ExternalLibraryManager.js';

/**
 * Tag cloud for choosing which external libraries to import.
 * Libraries are inserted as removable tags via a text input that only
 * accepts libraries from the known catalog.
 */
export default class ExternalLibraryTagComponent {
	private readonly plugin: IconicPlugin;
	private readonly inputComponent: TextComponent;
	private readonly tagsEl: HTMLElement;

	constructor(containerEl: HTMLElement, plugin: IconicPlugin) {
		this.plugin = plugin;
		containerEl.addClass('iconic-external-library-tags');

		this.tagsEl = containerEl.createDiv({ cls: 'iconic-external-library-tags-list' });
		this.renderTags();

		this.inputComponent = new TextComponent(containerEl)
			.setPlaceholder(STRINGS.settings.externalLibraries.addLibrary)
			.onChange(() => void this.updateInputState());
		this.inputComponent.inputEl.addClass('iconic-external-library-input');

		new ExternalLibrarySuggest(plugin, this.inputComponent, library => {
			this.addLibrary(library.id);
		});

		this.inputComponent.inputEl.addEventListener('keydown', event => {
			if (event.key === 'Enter') {
				event.preventDefault();
				this.addExactMatch();
			}
		});
	}

	/**
	 * Enable or disable the tag cloud input.
	 */
	setDisabled(disabled: boolean): this {
		this.inputComponent.setDisabled(disabled);
		return this;
	}

	/**
	 * Render the current tags.
	 */
	private renderTags(): void {
		this.tagsEl.empty();
		for (const libraryId of this.plugin.settings.externalLibraries) {
			const library = ExternalLibraryManager.getLibrary(libraryId);
			const pillEl = this.tagsEl.createDiv({ cls: 'multi-select-pill' });
			pillEl.createSpan({ cls: 'multi-select-pill-content', text: library?.name ?? libraryId });
			const removeEl = pillEl.createEl('button', {
				cls: 'multi-select-pill-remove-button',
				attr: { 'aria-label': STRINGS.settings.externalLibraries.removeLibrary },
			});
			removeEl.setText('×');
			removeEl.addEventListener('click', () => this.removeLibrary(libraryId));
		}
	}

	/**
	 * Add a library to the tag cloud.
	 */
	private addLibrary(libraryId: string): void {
		if (this.plugin.settings.externalLibraries.includes(libraryId)) return;
		this.plugin.settings.externalLibraries.push(libraryId);
		void this.plugin.saveSettings();
		void ExternalLibraryManager.refresh(this.plugin);
		this.renderTags();
		this.inputComponent.setValue('');
		this.updateInputState();
	}

	/**
	 * Remove a library from the tag cloud.
	 */
	private removeLibrary(libraryId: string): void {
		this.plugin.settings.externalLibraries = this.plugin.settings.externalLibraries.filter(id => id !== libraryId);
		void this.plugin.saveSettings();
		void ExternalLibraryManager.refresh(this.plugin);
		this.renderTags();
		this.updateInputState();
	}

	/**
	 * Add the library matching the current input exactly, if it's in the catalog.
	 */
	private addExactMatch(): void {
		const query = this.inputComponent.getValue().trim().toLowerCase();
		if (!query) return;
		const library = ExternalLibraryManager.getLibraries()
			.find(library => library.name.toLowerCase() === query || library.id.toLowerCase() === query);
		if (library) this.addLibrary(library.id);
	}

	/**
	 * Hide the input once every known library has been added.
	 */
	private updateInputState(): void {
		const hasRemainingLibraries = ExternalLibraryManager.getLibraries()
			.some(library => !this.plugin.settings.externalLibraries.includes(library.id));
		this.inputComponent.inputEl.toggleClass('iconic-invisible', !hasRemainingLibraries);
	}
}

/**
 * Popover that suggests known external libraries which haven't been added yet.
 */
class ExternalLibrarySuggest extends AbstractInputSuggest<ExternalLibrary> {
	private readonly plugin: IconicPlugin;
	private readonly inputComponent: TextComponent;
	private readonly selectCallback: (library: ExternalLibrary) => void;

	constructor(plugin: IconicPlugin, inputComponent: TextComponent, selectCallback: (library: ExternalLibrary) => void) {
		super(plugin.app, inputComponent.inputEl);
		this.plugin = plugin;
		this.inputComponent = inputComponent;
		this.selectCallback = selectCallback;
	}

	/**
	 * @override
	 */
	protected getSuggestions(query: string): ExternalLibrary[] {
		const queryLower = query.trim().toLowerCase();
		const selected = new Set(this.plugin.settings.externalLibraries);
		const remaining = ExternalLibraryManager.getLibraries()
			.filter(library => !selected.has(library.id));
		if (!queryLower) return remaining;
		const fuzzySearch = prepareFuzzySearch(query);
		return remaining.filter(library => fuzzySearch(library.name) || library.name.toLowerCase().includes(queryLower));
	}

	/**
	 * @override
	 */
	renderSuggestion(suggestion: ExternalLibrary, el: HTMLElement): void {
		el.setText(suggestion.name);
	}

	/**
	 * @override
	 */
	selectSuggestion(suggestion: ExternalLibrary): void {
		this.selectCallback(suggestion);
		this.inputComponent.setValue('');
		this.close();
	}
}