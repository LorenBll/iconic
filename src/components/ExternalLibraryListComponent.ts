import { ButtonComponent, DropdownComponent, setIcon } from 'obsidian';
import IconicPlugin, { STRINGS } from 'src/IconicPlugin.js';
import ExternalLibraryManager, { ExternalLibrary } from 'src/managers/ExternalLibraryManager.js';

/**
 * List of external libraries to import, styled like Obsidian's native list
 * settings: each selected library is a removable row, and an add row below
 * appends libraries from the known catalog via a dropdown.
 */
export default class ExternalLibraryListComponent {
	private readonly plugin: IconicPlugin;
	private readonly containerEl: HTMLElement;
	private readonly rowsEl: HTMLElement;
	private readonly addRowEl: HTMLElement;
	private readonly addDropdown: DropdownComponent;
	private readonly addButton: ButtonComponent;

	constructor(containerEl: HTMLElement, plugin: IconicPlugin) {
		this.plugin = plugin;
		this.containerEl = containerEl;
		containerEl.addClass('iconic-external-library-list');

		this.rowsEl = containerEl.createDiv({ cls: 'iconic-external-library-list-rows' });
		this.renderRows();

		// ADD ROW: dropdown of remaining libraries + add button
		this.addRowEl = containerEl.createDiv({ cls: 'iconic-external-library-list-add' });
		this.addDropdown = new DropdownComponent(this.addRowEl)
			.onChange(() => this.updateAddButton());
		this.addButton = new ButtonComponent(this.addRowEl)
			.setButtonText(STRINGS.settings.externalLibraries.addLibrary)
			.onClick(() => {
				const libraryId = this.addDropdown.getValue();
				if (libraryId) this.addLibrary(libraryId);
			});
		this.updateAddOptions();
	}

	/**
	 * Enable or disable the add row.
	 */
	setDisabled(disabled: boolean): this {
		this.addDropdown.setDisabled(disabled);
		this.updateAddButton(disabled);
		return this;
	}

	/**
	 * Render the current tags as rows.
	 */
	private renderRows(): void {
		this.rowsEl.empty();
		for (const libraryId of ExternalLibraryListComponent.getLibraries(this.plugin)) {
			const library = ExternalLibraryManager.getLibrary(libraryId);
			const rowEl = this.rowsEl.createDiv({ cls: 'iconic-external-library-list-item' });
			rowEl.createSpan({ cls: 'iconic-external-library-list-item-name', text: library?.name ?? libraryId });
			const removeEl = rowEl.createEl('button', {
				cls: 'iconic-external-library-list-item-remove',
				attr: { 'aria-label': STRINGS.settings.externalLibraries.removeLibrary },
			});
			setIcon(removeEl, 'lucide-x');
			removeEl.addEventListener('click', () => this.removeLibrary(libraryId));
		}
	}

	/**
	 * Add a library to the list.
	 */
	private addLibrary(libraryId: string): void {
		if (ExternalLibraryListComponent.getLibraries(this.plugin).includes(libraryId)) return;
		this.plugin.settings.externalLibraries.push(libraryId);
		void this.plugin.saveSettings();
		void ExternalLibraryManager.refresh(this.plugin);
		this.renderRows();
		this.updateAddOptions();
	}

	/**
	 * Remove a library from the list.
	 */
	private removeLibrary(libraryId: string): void {
		this.plugin.settings.externalLibraries = ExternalLibraryListComponent.getLibraries(this.plugin)
			.filter(id => id !== libraryId);
		void this.plugin.saveSettings();
		void ExternalLibraryManager.refresh(this.plugin);
		this.renderRows();
		this.updateAddOptions();
	}

	/**
	 * Repopulate the add dropdown with libraries that aren't in the list yet.
	 */
	private updateAddOptions(): void {
		this.addDropdown.selectEl.empty();
		const remaining = ExternalLibraryManager.getLibraries()
			.filter(library => !ExternalLibraryListComponent.getLibraries(this.plugin).includes(library.id));
		for (const library of remaining) {
			this.addDropdown.addOption(library.id, library.name);
		}
		const firstLibrary: ExternalLibrary | undefined = remaining.first();
		if (firstLibrary) this.addDropdown.setValue(firstLibrary.id);
		this.addRowEl.toggleClass('iconic-invisible', remaining.length === 0);
		this.updateAddButton();
	}

	/**
	 * Disable the add button while nothing is selected or the component is disabled.
	 */
	private updateAddButton(disabled?: boolean): void {
		const isDisabled = disabled ?? this.addDropdown.disabled;
		this.addButton.setDisabled(isDisabled || !this.addDropdown.getValue());
	}

	/**
	 * Get the list of selected library IDs.
	 */
	static getLibraries(plugin: IconicPlugin): string[] {
		return Array.isArray(plugin.settings.externalLibraries) ? plugin.settings.externalLibraries : [];
	}
}