import { ColorComponent, Menu, displayTooltip, setTooltip } from 'obsidian';
import ColorUtils from 'src/ColorUtils.js';
import { STRINGS } from 'src/IconicPlugin.js';

export default class IconColorComponent extends ColorComponent {
	private color: string | null = null;
	private readonly colorOptions: [color: string, display: string][] = [[ '#ffffff', 'White' ]];
	private primaryMode: 'list' | 'rgb' = 'list';
	private secondaryMode: 'list' | 'rgb' = 'rgb';
	private isHovered = false;
	private colorChangeCallback: ((color: string | null) => void) | null = null;

	// Components
	readonly colorEl: HTMLInputElement | null = null;

	constructor(containerEl: HTMLElement) {
		super(containerEl);
		// @ts-expect-error (Private API)
		if (this.colorPickerEl instanceof HTMLInputElement) this.colorEl = this.colorPickerEl;

		// Track when cursor is hovering over color picker
		this.colorEl?.addEventListener('pointerenter', () => this.isHovered = true);
		this.colorEl?.addEventListener('pointerleave', () => this.isHovered = false);

		// Primary color picker
		this.colorEl?.addEventListener('click', event => {
			event.preventDefault();
			if (this.primaryMode === 'list') {
				this.showColorOptions(event.x, event.y);
			} else {
				this.colorEl?.showPicker();
			}
		});

		// Secondary color picker
		this.colorEl?.addEventListener('contextmenu', event => {
			event.preventDefault();
			if (this.secondaryMode === 'list') {
				this.showColorOptions(event.x, event.y);
			} else {
				this.colorEl?.showPicker();
			}
		});

		// Scroll to rapid-cycle colors
		this.colorEl?.addEventListener('wheel', event => {
			if (event.deltaY + event.deltaX < 0) {
				this.previousColor();
			} else {
				this.nextColor();
			}
		}, { passive: true });

		// React to native color picker changes
		this.colorEl?.addEventListener('change', () => {
			const value = this.colorEl?.value ?? null;
			this.setColor(value);
		});
	}

	/**
	 * Set or reset the current color and its tooltip.
	 */
	setColor(color: string | null): this {
		this.color = color;
		this.updateTooltip();
		this.setValueRgb(ColorUtils.toRgbObject(color));
		this.colorChangeCallback?.(color);
		return this;
	}

	/**
	 * Set the color options displayed in `list` mode.
	 */
	setColorOptions(colorOptions: Record<string, string>): this {
		this.colorOptions.length = 0;
		this.colorOptions.push(...Object.entries(colorOptions));
		this.updateTooltip();
		return this;
	}

	/**
	 * Choose the primary color picker.
	 */
	setPrimaryMode(mode: 'list' | 'rgb'): this {
		this.primaryMode = mode;
		return this;
	}

	/**
	 * Choose the secondary color picker.
	 */
	setSecondaryMode(mode: 'list' | 'rgb'): this {
		this.secondaryMode = mode;
		return this;
	}

	/**
	 * Set a callback for when the color changes. More specialized than {@link onChange}.
	 */
	onColorChange(callback: (color: string | null) => void): this {
		this.colorChangeCallback = callback;
		return this;
	}

	/**
	 * Select previous color in list. Used by keyboard and scrollwheel events.
	 */
	previousColor(): this {
		if (this.colorOptions.length === 0) return this;

		const index = this.colorOptions.findIndex(([color]) => color === this.color);
		const prevIndex = (index > 0) ? index - 1 : this.colorOptions.length - 1;
		const entry = this.colorOptions[prevIndex];
		if (!entry) return this;

		const [color] = entry;
		this.setColor(color);
		return this;
	}

	/**
	 * Select next color in list. Used by keyboard and scrollwheel events.
	 */
	nextColor(): this {
		if (this.colorOptions.length === 0) return this;

		const index = this.colorOptions.findIndex(([color]) => color === this.color);
		const nextIndex = (index < this.colorOptions.length - 1) ? index + 1 : 0;
		const entry = this.colorOptions[nextIndex];
		if (!entry) return this;

		const [color] = entry;
		this.setColor(color);
		return this;
	}

	/**
	 * Display the list of color options.
	 */
	showColorOptions(x: number, y: number): void {
		const menu = new Menu();
		for (const [color, display] of this.colorOptions) {
			menu.addItem(menuItem => { menuItem
				.setTitle(display)
				.setIcon('lucide-paint-bucket')
				.setSection('color')
				.setChecked(color === this.color)
				.onClick(() => {
					this.color = (color === this.color) ? null : color;
					this.setColor(this.color);
				});
				// @ts-expect-error Private API
				const iconEl: unknown = menuItem.iconEl;
				if (iconEl instanceof HTMLElement) {
					iconEl.setCssProps({ color: ColorUtils.toRgb(color) });
				}
			});
		}
		this.colorEl?.addClass('has-active-menu');
		menu.onHide(() => this.colorEl?.removeClass('has-active-menu'));
		menu.showAtPosition({ x, y });
	}

	/**
	 * Update tooltip to reflect the current color.
	 */
	private updateTooltip(): void {
		if (!this.colorEl) return;

		const [, name] = this.colorOptions.find(([color]) => color === this.color) ?? [];
		const tooltip = name ?? this.color ?? STRINGS.iconPicker.changeColor;
		setTooltip(this.colorEl, tooltip, { delay: 300 });

		// Appear instantly if cursor is hovering over color picker
		if (this.isHovered) {
			displayTooltip(this.colorEl, tooltip, { delay: 0 });
		}
	}
}
