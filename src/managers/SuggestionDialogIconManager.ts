import { Instruction, Plugin, SuggestModal, TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import IconicPlugin, { PLUGIN_TAB_TYPES } from 'src/IconicPlugin.js';
import IconManager from 'src/managers/IconManager.js';
import ObsidianUtils from 'src/ObsidianUtils.js';

type PluginModal = SuggestModal<unknown> & { plugin: Plugin };

/**
 * Allow type-safe access to a modal.plugin property.
 */
function isPluginModal(modal: SuggestModal<unknown>): modal is PluginModal {
	return (modal as PluginModal).plugin instanceof Plugin;
}

const QUICK_SWITCHER = 'qs';
const QUICK_SWITCHER_PP = 'qs++';
const ANOTHER_QUICK_SWITCHER = 'aqs';
const MOVE_FILE_DIALOG = 'mfd';

/**
 * Intercepts suggestion dialogs like quick switchers and "Move file" dialogs to add custom icons.
 */
export default class SuggestionDialogIconManager extends IconManager {
	private onOpenOriginal: typeof SuggestModal.prototype.onOpen;
	private onOpenProxy: typeof SuggestModal.prototype.onOpen;
	private setInstructionsOriginal: typeof SuggestModal.prototype.setInstructions;
	private setInstructionsProxy: typeof SuggestModal.prototype.setInstructions;

	constructor(plugin: IconicPlugin) {
		super(plugin);
		const manager = this;

		// Store original methods
		this.onOpenOriginal = SuggestModal.prototype.onOpen;
		this.setInstructionsOriginal = SuggestModal.prototype.setInstructions;

		// Catch Quick Switcher, Quick Switcher++, and "Move file" dialogs
		this.onOpenProxy = new Proxy(SuggestModal.prototype.onOpen, {
			apply(onOpen, modal) {
				if (manager.isDisabled()) {
					return onOpen.call(modal);
				}

				const modalType = manager.getModalType(modal);
				if (!modalType) {
					return onOpen.call(modal);
				}

				// Proxy renderSuggestion() for each instance
				modal.renderSuggestion = new Proxy(modal.renderSuggestion, {
					apply(renderSuggestion, modal: SuggestModal<unknown>, args: [unknown, HTMLElement]) {
						// Call base method first to pre-populate elements
						const returnValue = renderSuggestion.call(modal, ...args);

						switch (modalType) {
							case QUICK_SWITCHER: {
								modal.modalEl.addClass('iconic-prompt');
								manager.refreshSuggestionIconQS(...args);
								break;
							}
							case QUICK_SWITCHER_PP: {
								modal.modalEl.addClass('iconic-prompt');
								manager.refreshSuggestionIconQSPP(...args);
								break;
							}
							case MOVE_FILE_DIALOG: {
								modal.modalEl.addClass('iconic-prompt');
								manager.refreshSuggestionIconMFD(...args);
								break;
							}
						}

						return returnValue;
					}
				});

				return onOpen.call(modal);
			}
		});

		// Catch Another Quick Switcher, which never call super.onOpen()
		this.setInstructionsProxy = new Proxy(SuggestModal.prototype.setInstructions, {
			apply(setInstructions, modal: SuggestModal<unknown>, args: [Instruction[]]) {
				if (manager.isDisabled()) {
					return setInstructions.call(modal, ...args);
				}

				const modalType = manager.getModalType(modal);
				if (modalType !== ANOTHER_QUICK_SWITCHER) {
					return setInstructions.call(modal, ...args);
				}

				// Proxy renderSuggestion() for every instance
				modal.renderSuggestion = new Proxy(modal.renderSuggestion, {
					apply(renderSuggestion, modal: SuggestModal<unknown>, args: [unknown, HTMLElement]) {
						if (manager.isDisabled()) {
							return renderSuggestion.call(modal, ...args);
						}
						// Call base method first to pre-populate elements
						const returnValue = renderSuggestion.call(modal, ...args);
						modal.modalEl.addClass('iconic-another-quick-switcher');
						// Refresh suggestions
						manager.refreshSuggestionIconAQS(...args);
						return returnValue;
					}
				});

				return setInstructions.call(modal, ...args);
			}
		});

		// Replace original methods
		SuggestModal.prototype.onOpen = this.onOpenProxy;
		SuggestModal.prototype.setInstructions = this.setInstructionsProxy;
	}

	/**
	 * Determine which type of modal this is.
	 */
	private getModalType(modal: SuggestModal<unknown>): string | null {
		// Check for Another Quick Switcher
		if (modal.modalEl.hasClass('another-quick-switcher__modal-prompt')) {
			return ANOTHER_QUICK_SWITCHER;
		}

		// Check for Quick Switcher++
		if (isPluginModal(modal) && modal.plugin.manifest.id === 'darlal-switcher-plus') {
			return QUICK_SWITCHER_PP;
		}

		// Check for Quick Switcher
		if ('shouldShowMarkdown' in modal) {
			return QUICK_SWITCHER;
		}

		// Check for "Move file" dialog
		if ('files' in modal && 'emptyMatch' in modal) {
			return MOVE_FILE_DIALOG;
		}

		return null;
	}

	/**
	 * Refresh icon of a Quick Switcher suggestion.
	 */
	private refreshSuggestionIconQS(value: unknown, el: HTMLElement): void {
		if (!ObsidianUtils.isObject(value)) return;

		switch (value.type) {
			case 'alias': // Fallthrough
			case 'file': {
				if (!(value.file instanceof TFile)) break;
				const file = this.plugin.getFileItem(value.file.path);
				const rule = this.plugin.ruleManager?.checkRuling('file', file.id) ?? file;
				if (rule.icon || rule.color) {
					const iconEl = el.find('.iconic-icon') ?? el.createDiv();
					el.prepend(iconEl);
					this.refreshIcon(rule, iconEl);
				}
				break;
			}
			case 'bookmark': {
				if (!ObsidianUtils.isObsidianBookmark(value.item)) break;
				const oBmark = value.item;
				if (oBmark.type === 'file' && oBmark.path) {
					const file = this.plugin.getFileItem(oBmark.path);
					const rule = this.plugin.ruleManager?.checkRuling('file', file.id) ?? file;
					if (rule.icon || rule.color) {
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						this.refreshIcon(rule, iconEl);
					}
				}
				break;
			}
		}
	}

	/**
	 * Refresh icon of a Quick Switcher++ suggestion.
	 */
	private refreshSuggestionIconQSPP(value: unknown, el: HTMLElement): void {
		if (!ObsidianUtils.isObject(value)) return;

		switch (value.type) {
			case 'relatedItemsList': // Fallthrough
			case 'file': {
				if (!(value.file instanceof TFile)) break;
				const file = this.plugin.getFileItem(value.file.path);
				const rule = this.plugin.ruleManager?.checkRuling('file', file.id) ?? file;
				if (rule.icon || rule.color) {
					const iconEl = el.find('.iconic-icon') ?? el.createDiv();
					el.prepend(iconEl);
					this.refreshIcon(rule, iconEl);
				}
				break;
			}
			case 'bookmark': {
				if (!ObsidianUtils.isObsidianBookmark(value.item)) break;
				const oBmark = value.item;
				if ((oBmark.type === 'file' || oBmark.type === 'folder') && oBmark.path) {
					const file = this.plugin.getFileItem(oBmark.path);
					const rule = this.plugin.ruleManager?.checkRuling(oBmark.type, file.id) ?? file;
					if (rule.icon || rule.color) {
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						el.prepend(iconEl);
						this.refreshIcon(rule, iconEl);
					}
				}
				break;
			}
			case 'editorList': { // Represents an open tab in Editor Mode
				if (!(value.item instanceof WorkspaceLeaf)) break;
				const tabType = value.item.view.getViewType();
				const iconDefault = value.item.view.getIcon();

				// Distinguish between file tabs and plugin tabs
				if (!PLUGIN_TAB_TYPES.includes(tabType) && value.file instanceof TFile) {
					const file = this.plugin.getFileItem(value.file.path);
					const rule = this.plugin.ruleManager?.checkRuling('file', file.id) ?? file;
					if (rule.icon || rule.color) {
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						el.prepend(iconEl);
						this.refreshIcon(rule, iconEl);
					}
				} else {
					const tab = this.plugin.getTabItem(tabType);
					if (tab) {
						tab.iconDefault = iconDefault;
						const iconEl = el.find('.iconic-icon') ?? el.createDiv();
						el.prepend(iconEl);
						this.refreshIcon(tab, iconEl);
					}
				}
				break;
			}
		}
	}

	/**
	 * Refresh icon of Another Quick Switcher suggestion.
	 */
	private refreshSuggestionIconAQS(value: unknown, el: HTMLElement): void {
		if (!ObsidianUtils.isObject(value) || !(value.file instanceof TFile)) return;

		const itemEl = el.find('.another-quick-switcher__item');
		const file = this.plugin.getFileItem(value.file.path);
		const rule = this.plugin.ruleManager?.checkRuling('file', file.id) ?? file;

		if (rule.icon || rule.color) {
			const iconEl = itemEl.find('.iconic-icon') ?? itemEl.createDiv();
			itemEl.prepend(iconEl);
			this.refreshIcon(rule, iconEl);
		}
	}

	/**
	 * Refresh icon of a "Move file" dialog suggestion.
	 */
	private refreshSuggestionIconMFD(value: unknown, el: HTMLElement): void {
		if (!ObsidianUtils.isObject(value) || !(value.item instanceof TFolder)) return;

		el.addClass('mod-complex');
		const contentEl = el.createDiv({ cls: 'suggestion-content' });
		const titleEl = contentEl.createDiv({ cls: 'suggestion-title '});

		// Move text nodes and .suggestion-highlights into .suggestion-title
		for (const node of [...el.childNodes]) {
			if (node !== contentEl) titleEl.append(node);
		}

		const folder = this.plugin.getFileItem(value.item.path);
		const rule = this.plugin.ruleManager?.checkRuling('folder', folder.id) ?? folder;

		if (rule.icon || rule.color) {
			const iconEl = el.find('.iconic-icon') ?? el.createDiv();
			el.prepend(iconEl);
			this.refreshIcon(rule, iconEl);
		}
	}

	/**
	 * Check whether user has disabled all suggestion dialog icons.
	 */
	private isDisabled(): boolean {
		return !this.plugin.settings.showQuickSwitcherIcons && !this.plugin.settings.showMoveFileIcons;
	}

	/**
	 * @override
	 */
	unload(): void {
		super.unload();
		if (SuggestModal.prototype.onOpen === this.onOpenProxy) {
			SuggestModal.prototype.onOpen = this.onOpenOriginal;
		}
		if (SuggestModal.prototype.setInstructions === this.setInstructionsProxy) {
			SuggestModal.prototype.setInstructions = this.setInstructionsOriginal;
		}
	}
}
