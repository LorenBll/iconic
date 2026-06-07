import { BaseComponent } from 'obsidian';
import ColorUtils from 'src/ColorUtils.js';
import IconButtonComponent from 'src/components/IconButtonComponent.js';

export default class CalloutComponent extends BaseComponent {
	// Components
	readonly calloutEl: HTMLElement;
	private readonly titleEl: HTMLElement;
	private readonly iconButton: IconButtonComponent;
	private readonly innerEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		super();
		this.calloutEl = containerEl.createDiv({ cls: 'callout' });
		this.titleEl = this.calloutEl.createDiv({ cls: 'callout-title' });
		this.iconButton = new IconButtonComponent(this.titleEl).setClass('callout-icon');
		this.iconButton.extraSettingsEl.removeClasses(['clickable-icon', 'extra-setting-button']);
		this.innerEl = this.titleEl.createDiv({ cls: 'callout-title-inner' });
	}

	/**
	 * Set the icon or emoji to display.
	 */
	setIcon(icon: string | null): this {
		this.iconButton.setIcon(icon);
		return this;
	}

	/**
	 * Set the icon color and the faded background color.
	 */
	setColor(color: string | null): this {
		const cssColor = ColorUtils.toRgb(color ?? 'gray');
		this.calloutEl.setCssProps({ '--callout-color': cssColor });
		this.iconButton.setColor(color);
		return this;
	}

	/**
	 * Set the title.
	 */
	setTitle(title: string | DocumentFragment): this {
		this.innerEl.setText(title);
		return this;
	}

	/**
	 * Set whether to show or hide the callout.
	 */
	setVisibility(visible: boolean): this {
		this.calloutEl.tabIndex = visible ? 0 : -1;
		this.calloutEl.toggleClass('iconic-invisible', !visible);
		return this;
	}
}
