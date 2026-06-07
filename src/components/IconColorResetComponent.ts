import { ExtraButtonComponent } from 'obsidian';
import { STRINGS } from 'src/IconicPlugin.js';

/**
 * Component that displays a clickable reset button.
 */
export default class IconColorResetComponent extends ExtraButtonComponent {
	constructor(containerEl: HTMLElement) {
		super(containerEl);
		super.setIcon('lucide-rotate-ccw');
		super.setTooltip(STRINGS.iconPicker.resetColor);
		this.extraSettingsEl.addClass('iconic-reset-color');
		this.extraSettingsEl.tabIndex = 0;
	}

	/**
	 * Set whether to show or hide the button.
	 */
	toggleVisibility(visible: boolean): this {
		this.extraSettingsEl.tabIndex = visible ? 0 : -1;
		this.extraSettingsEl.toggleClass('iconic-invisible', !visible);
		return this;
	}
}
