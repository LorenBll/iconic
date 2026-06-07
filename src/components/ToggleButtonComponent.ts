import { ButtonComponent, IconName, TooltipOptions, ValueComponent } from 'obsidian';

export default class ToggleButtonComponent extends ValueComponent<boolean> {
	private on = false;
	private iconOn = 'toggle-right';
	private iconOff = 'toggle-left';
	private changeCallback: ((on: boolean) => void) | null = null;

	// Components
	private readonly button: ButtonComponent;

	constructor(containerEl: HTMLElement) {
		super();
		this.button = new ButtonComponent(containerEl).onClick(() => void this.setValue(!this.on));

		// Prevent stealing keyboard focus when clicked
		this.button.buttonEl.addEventListener('pointerdown', event => event.preventDefault());
	}

	/**
	 * Get the on/off state.
	 */
	getValue(): boolean {
		return this.on;
	}

	/**
	 * Set the on/off state.
	 */
	setValue(on: boolean): this {
		this.on = on;
		this.button.setIcon(on ? this.iconOn : this.iconOff);
		this.button.buttonEl.toggleClass('iconic-mode-selected', this.on);
		this.changeCallback?.(on);
		return this;
	}

	/**
	 * Set a tooltip for the button.
	 */
	setTooltip(tooltip: string, options?: TooltipOptions): this {
		this.button.setTooltip(tooltip, options);
		return this;
	}

	/**
	 * Set the icon for each on/off state.
	 */
	setIcons(iconOn: IconName, iconOff: IconName): this {
		this.iconOn = iconOn;
		this.iconOff = iconOff;
		this.button.setIcon(this.on ? this.iconOn : this.iconOff);
		return this;
	}

	/**
	 * Add a class to the button element.
	 */
	setClass(cls: string): this {
		this.button.buttonEl.addClass(cls);
		return this;
	}

	/**
	 * Set a callback for when the on/off state changes.
	 */
	onChange(callback: (on: boolean) => any): this {
		this.changeCallback = callback;
		return this;
	}
}
