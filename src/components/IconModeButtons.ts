import { BaseComponent, ButtonComponent, ExtraButtonComponent } from 'obsidian';
import { STRINGS } from 'src/IconicPlugin.js';

const ICON_ENABLED = 'lucide-image';
const ICON_DISABLED = 'lucide-square';
const EMOJI_ENABLED = 'lucide-smile';
const EMOJI_DISABLED = 'lucide-circle';

/**
 * A dual-button component for filtering icons & emojis.
 */
export default class IconModeButtons extends BaseComponent {
	private iconMode = false;
	private emojiMode = false;
	private modeChangeCallback: (((iconMode: boolean, emojiMode: boolean) => void) | null) = null;

	// Components
	private readonly iconButton: ButtonComponent | ExtraButtonComponent;
	private readonly emojiButton: ButtonComponent | ExtraButtonComponent;
	private readonly iconButtonEl: HTMLElement;
	private readonly emojiButtonEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		super();

		this.iconButton = new ButtonComponent(containerEl).setButtonText('Icons');
		this.emojiButton = new ButtonComponent(containerEl).setButtonText('Emojis');
		this.iconButtonEl = this.iconButton.buttonEl;
		this.emojiButtonEl = this.emojiButton.buttonEl;

		this.iconButton.setTooltip(STRINGS.iconPicker.toggleIcons, { placement: 'top', delay: 300 })
			.onClick(() => void this.setIconMode(!this.iconMode))
			.then(() => this.iconButtonEl.addEventListener('pointerdown', event => {
				event.preventDefault(); // Will not steal keyboard focus when clicked
			}));
		this.emojiButton.setTooltip(STRINGS.iconPicker.toggleEmojis, { placement: 'top', delay: 300 })
			.onClick(() => void this.setEmojiMode(!this.emojiMode))
			.then(() => this.emojiButtonEl.addEventListener('pointerdown', event => {
				event.preventDefault(); // Will not steal keyboard focus when clicked
			}));

		this.setIconMode(true);
		this.setEmojiMode(false);
	}

	/**
	 * Enable or disable the icon mode button.
	 */
	setIconMode(enabled: boolean): this {
		this.iconMode = enabled;
		this.iconButton.setIcon(this.iconMode ? ICON_ENABLED : ICON_DISABLED);
		this.iconButtonEl.toggleClass('is-active', this.iconMode);
		this.modeChangeCallback?.(this.iconMode, this.emojiMode);
		return this;
	}

	/**
	 * Enable or disable the emoji mode button.
	 */
	setEmojiMode(enabled: boolean): this {
		this.emojiMode = enabled;
		this.emojiButton.setIcon(this.emojiMode ? EMOJI_ENABLED : EMOJI_DISABLED);
		this.emojiButtonEl.toggleClass('is-active', this.emojiMode);
		this.modeChangeCallback?.(this.iconMode, this.emojiMode);
		return this;
	}

	/**
	 * Set a callback for when a mode changes.
	 */
	onModeChange(callback: ((iconMode: boolean, emojiMode: boolean) => void)): this {
		this.modeChangeCallback = callback;
		return this;
	}
}
