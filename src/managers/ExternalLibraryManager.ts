import { Notice, requestUrl } from 'obsidian';
import type IconicPlugin from 'src/IconicPlugin.js';
import { STRINGS } from 'src/IconicPlugin.js';

/**
 * An external icon library: a third-party collection of icons that can be
 * imported alongside the built-in Lucide icons.
 */
export interface ExternalLibrary {
	/** Unique identifier. Icon IDs are namespaced as `{id}:{iconName}`. */
	id: string;
	/** Display name. */
	name: string;
	/**
	 * URLs of JSON files listing the library's icons, tried in order.
	 * Each entry maps an icon name to either an icon node array
	 * (`[[tag, attrs], ...]`), or an object containing `iconNode` and
	 * optional `tags` (search keywords).
	 */
	sources: string[];
}

/**
 * The catalog of supported external libraries. The mechanism is data-driven:
 * adding a new entry here is enough to make it selectable in the settings,
 * so future libraries can be supported without further code changes.
 */
export const EXTERNAL_LIBRARIES: ExternalLibrary[] = [
	{
		id: 'lab',
		name: 'Lab',
		// The primary source mirrors the endpoint used by lucide.dev's icon search.
		// The fallback is the official npm package data.
		sources: [
			'https://lucide.dev/api/lab/icon-details',
			'https://unpkg.com/@lucide/lab@latest/icon-nodes.json',
		],
	},
];

/**
 * Manages icons imported from external libraries: fetches their data,
 * exposes them to search, and renders them as inline SVGs.
 */
export default class ExternalLibraryManager {
	/** Loaded external icons, keyed by their namespaced ID (`{libraryId}:{iconName}`). */
	private static icons = new Map<string, [string, string[]]>();
	/** Keywords ("tags") of all loaded external icons. */
	private static keywords = new Set<string>();
	/** Raw icon node data for rendering, keyed by namespaced ID. */
	private static iconNodes = new Map<string, unknown[][]>();
	/** Libraries whose data is currently loaded. */
	private static loaded = new Set<string>();

	/**
	 * Get the catalog of supported external libraries.
	 */
	static getLibraries(): ExternalLibrary[] {
		return EXTERNAL_LIBRARIES;
	}

	/**
	 * Get a catalog entry by its ID.
	 */
	static getLibrary(libraryId: string): ExternalLibrary | null {
		return EXTERNAL_LIBRARIES.find(library => library.id === libraryId) ?? null;
	}

	/**
	 * Check whether a stored icon ID belongs to a known external library.
	 */
	static isExternalIcon(iconId: string): boolean {
		const [libraryId] = iconId.split(':');
		return this.getLibrary(libraryId ?? '') !== null;
	}

	/**
	 * Get the display name of a loaded external icon.
	 */
	static getName(iconId: string): string | null {
		return this.icons.get(iconId)?.[0] ?? null;
	}

	/**
	 * Get a Map of all loaded external icons, in the same shape as {@link ICONS}.
	 */
	static getIcons(): Map<string, [string, string[]]> {
		return this.icons;
	}

	/**
	 * Get a Set of all keywords from loaded external icons.
	 */
	static getKeywords(): Set<string> {
		return this.keywords;
	}

	/**
	 * Fetch data for every library enabled in the settings, and drop data for
	 * any library that is no longer enabled. Refreshes all icon managers
	 * afterwards so icons react to the change.
	 */
	static async refresh(plugin: IconicPlugin): Promise<void> {
		for (const libraryId of Array.from(this.loaded)) {
			const library = this.getLibrary(libraryId);
			if (!library || !this.isEnabled(plugin, libraryId)) {
				this.unloadLibrary(libraryId);
			}
		}

		for (const library of EXTERNAL_LIBRARIES) {
			if (this.isEnabled(plugin, library.id) && !this.loaded.has(library.id)) {
				try {
					await this.loadLibrary(library);
				} catch (error) {
					console.error(error);
					new Notice(STRINGS.externalLibraries.loadFailed.replace('{#}', library.name));
				}
			}
		}

		plugin.refreshManagers();
	}

	/**
	 * Check whether a library is enabled in the plugin settings.
	 */
	private static isEnabled(plugin: IconicPlugin, libraryId: string): boolean {
		return plugin.settings.enableExternalLibraries && plugin.settings.externalLibraries.includes(libraryId);
	}

	/**
	 * Fetch and store the icon data of a single library.
	 */
	private static async loadLibrary(library: ExternalLibrary): Promise<void> {
		let data: Record<string, unknown> | null = null;
		for (const source of library.sources) {
			try {
				const response = await requestUrl({ url: source });
				const json: unknown = response.json;
				if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
					data = json as Record<string, unknown>;
					break;
				}
			} catch (error) {
				console.error(`Iconic: failed to fetch external library "${library.name}" from ${source}`, error);
			}
		}
		if (!data) throw new Error(`Iconic: failed to load external library "${library.name}"`);

		for (const [iconName, raw] of Object.entries(data)) {
			const iconId = library.id + ':' + iconName;
			const keywords: string[] = [];
			let node: unknown[][] | null = null;

			if (Array.isArray(raw)) {
				node = raw as unknown[][];
			} else if (typeof raw === 'object' && raw !== null) {
				const entry = raw as Record<string, unknown>;
				if (Array.isArray(entry.iconNode)) {
					node = entry.iconNode as unknown[][];
					if (Array.isArray(entry.tags)) {
						keywords.push(...entry.tags.map(String));
					}
				}
			}

			if (!node) continue;
			this.icons.set(iconId, [this.iconIdToName(iconName), keywords.sort()]);
			for (const keyword of keywords) this.keywords.add(keyword);
			this.iconNodes.set(iconId, node);
		}

		// Keep keywords sorted for predictable search behaviour
		this.keywords = new Set(Array.from(this.keywords).sort());
		this.loaded.add(library.id);
	}

	/**
	 * Remove a library's icon data from memory.
	 */
	private static unloadLibrary(libraryId: string): void {
		const prefix = libraryId + ':';
		for (const iconId of Array.from(this.icons.keys())) {
			if (iconId.startsWith(prefix)) {
				this.icons.delete(iconId);
				this.iconNodes.delete(iconId);
			}
		}
		this.keywords = new Set();
		for (const [, [, keywords]] of this.icons) {
			for (const keyword of keywords) this.keywords.add(keyword);
		}
		this.loaded.delete(libraryId);
	}

	/**
	 * Render a loaded external icon inside a given element.
	 * @returns Whether the icon was found and rendered.
	 */
	static setIcon(iconEl: HTMLElement, iconId: string): boolean {
		const node = this.iconNodes.get(iconId);
		if (!node) return false;
		const [, iconName = ''] = iconId.split(':');

		iconEl.empty();
		const svgEl = iconEl.createSvg('svg', {
			cls: ['svg-icon', 'lucide', 'lucide-' + iconName],
			attr: {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				'stroke-width': '2',
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round',
				'aria-hidden': 'true',
			},
		});
		for (const nodeEntry of node) {
			const [tag, attrs] = nodeEntry;
			if (typeof tag !== 'string' || typeof attrs !== 'object' || attrs === null) continue;
			const cleanAttrs: Record<string, string> = {};
			for (const [attr, value] of Object.entries(attrs)) {
				if (attr === 'key') continue; // React key, not a real attribute
				cleanAttrs[attr] = String(value);
			}
			svgEl.createSvg(tag as keyof SVGElementTagNameMap, { attr: cleanAttrs });
		}
		return true;
	}

	/**
	 * Generate a readable name for an icon name:
	 * 1) Replace hyphens with spaces
	 * 2) Use sentence case
	 */
	private static iconIdToName(iconId: string): string {
		if (!iconId) return '';
		const replacedName = iconId.replaceAll('-', ' ');
		const capitalizedName = replacedName[0]?.toUpperCase() + replacedName.slice(1);
		return capitalizedName;
	}
}