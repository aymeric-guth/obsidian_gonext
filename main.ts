// @ts-ignore
import {
	App,
	FuzzySuggestModal,
	Plugin,
	Workspace,
	// @ts-ignore
	HTMLElement,
	addIcon,
	CachedMetadata,
	TFile,
	parseLinktext,
	Notice,
} from "obsidian";
import { v4 as uuidv4, v1 as uuidv1 } from "uuid";

const INDEX_NOTE_PATH = "Notes/eec0a297-982c-471c-9748-4943ec45fe94.md";

interface IndexLinkEntry {
	target: string;
	alias: string;
}

class IndexLinkSuggestModal extends FuzzySuggestModal<IndexLinkEntry> {
	constructor(
		app: App,
		private entries: IndexLinkEntry[],
		private sourcePath: string,
	) {
		super(app);
		this.setPlaceholder("Search index links...");
		this.emptyStateText = "No matching index link";
	}

	getItems(): IndexLinkEntry[] {
		return this.entries;
	}

	getItemText(item: IndexLinkEntry): string {
		return item.alias;
	}

	onChooseItem(item: IndexLinkEntry): void {
		this.app.workspace
			.openLinkText(item.target, this.sourcePath, false)
			.catch(() => new Notice(`Unable to open: ${item.alias}`));
	}
}

const dayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthShort = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

// Remember to rename these classes and interfaces!
interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	workspace: Workspace;
	metadataCache: any;
	dv: any;
	// @ts-ignore
	render: Render;
	debug: boolean;
	taskInStatusBar: HTMLElement;
	api: any;
	vaultContent: TFile[] = [];
	vaultContentDict: { [id: string]: TFile } = {};

	openViewInNewTabIfNotOpened(name: string) {
		const f = this.app.vault.getAbstractFileByPath(name);
		if (f === undefined || f === null) {
			console.warn(`file not found ${name}`);
			return;
		}

		const active = this.app.workspace.getLeaf();
		// @ts-ignore
		const root = active.parent;
		// rechercher si pas déja ouvert dans les onglets actifs
		// sinon créer un nouvel onglet, ouvrir le fichier, et en faire l'onglet actif
		let found = false;
		let node = undefined;
		const emptyTabs = [];

		for (const leaf of root.children) {
			const file = this.getFileFromLeaf(leaf);
			if (file === undefined || file === null) {
				emptyTabs.push(leaf);
				continue;
			}

			if (file.name === f.name) {
				found = true;
				node = leaf;
			}
		}
		if (!found) {
			if (emptyTabs.length > 0) {
				node = emptyTabs[0];
			} else {
				this.app.workspace.createLeafInParent(
					root,
					root.children.length + 1,
				);
				node = root.children[root.children.length - 1];
			}
		}

		node.openFile(f, { active: true });
	}

	getFileFromLeaf(leaf): TFile {
		let file = undefined;
		try {
			// @ts-ignore
			file = leaf.view.file;
		} catch {
			return undefined;
		}
		// @ts-ignore
		return this.app.vault.getAbstractFileByPath(file);
	}

	extractUUIDFromLink(link: string) {
		Assert.True(
			link.length >= 36,
			`extractUUIDFromLink: Invalid parameter type: link: "${link}"`,
		);

		// at this point link is either form uuid#heading || invalid
		// we can safely assume 0:36 is the uuid
		Assert.True(
			Helper.isUUID(link.slice(0, 36)),
			`extractUUIDFromLink: Invalid parameter type: link: "${link}"`,
		);
		if (link.length === 36) {
			return link;
		} else {
			return link.slice(0, 36);
		}
	}

	getFileFromUUID(_id: string): TFile {
		return this.vaultContentDict[_id];
	}

	getFileCacheFromUUID(_id: string): CachedMetadata {
		const f = this.vaultContentDict[_id];
		if (f === undefined) {
			return undefined;
		}

		return this.app.metadataCache.getFileCache(f);
	}

	getIndexLinkEntries(): IndexLinkEntry[] | null {
		const indexFile = this.app.vault.getAbstractFileByPath(INDEX_NOTE_PATH);
		if (!(indexFile instanceof TFile)) {
			new Notice(`Index note not found: ${INDEX_NOTE_PATH}`);
			return null;
		}

		const cache = this.app.metadataCache.getFileCache(indexFile);
		if (cache === null || cache === undefined) {
			new Notice(`Index note metadata is not ready: ${INDEX_NOTE_PATH}`);
			return null;
		}

		const entries = new Map<string, IndexLinkEntry>();
		for (const link of cache.links ?? []) {
			const alias = link.displayText?.trim();
			if (alias === undefined || alias === "") {
				continue;
			}

			const entry = { target: link.link, alias };
			entries.set(`${entry.target}\u0000${entry.alias}`, entry);
		}

		return Array.from(entries.values());
	}

	async onload() {
		console.log("gonext - onload()");
		await this.loadSettings();
		// @ts-ignore
		this.dv = this.app.plugins.plugins.dataview.api;
		// @ts-ignore
		this.files = {};
		this.api = {};

		// @ts-ignore
		window.gonext = {
			// @ts-ignore
			state: window.gonext?.state ?? {},
			// @ts-ignore
			app: this.app,
		};
		addIcon(
			"GoNextIcon",
			`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="currentColor" d="M20 12V2h2v10zm4 0V2h2v10zm4 0V2h2v10zm-12 8a3.912 3.912 0 0 1-4-4a3.912 3.912 0 0 1 4-4v-2a6 6 0 1 0 6 6h-2a3.912 3.912 0 0 1-4 4"></path><path fill="currentColor" d="M28.893 18.454L26.098 16l-1.318 1.504l2.792 2.452l-2.36 4.088l-3.427-1.16a9.032 9.032 0 0 1-2.714 1.565L18.36 28h-4.72l-.71-3.55a9.095 9.095 0 0 1-2.695-1.572l-3.447 1.166l-2.36-4.088l2.725-2.395a8.926 8.926 0 0 1-.007-3.128l-2.718-2.39l2.36-4.087l3.427 1.16A9.03 9.03 0 0 1 12.93 7.55L13.64 4H16V2h-2.36a2 2 0 0 0-1.961 1.608l-.504 2.519a10.967 10.967 0 0 0-1.327.753l-2.42-.819a1.998 1.998 0 0 0-2.372.895l-2.36 4.088a2 2 0 0 0 .411 2.502l1.931 1.697C5.021 15.495 5 15.745 5 16c0 .258.01.513.028.766l-1.92 1.688a2 2 0 0 0-.413 2.502l2.36 4.088a1.998 1.998 0 0 0 2.374.895l2.434-.824a10.974 10.974 0 0 0 1.312.759l.503 2.518A2 2 0 0 0 13.64 30h4.72a2 2 0 0 0 1.961-1.608l.504-2.519a10.967 10.967 0 0 0 1.327-.753l2.419.818a1.998 1.998 0 0 0 2.373-.894l2.36-4.088a2 2 0 0 0-.411-2.502"></path></svg>`,
		);

		this.addCommand({
			id: "search-index-links",
			name: "Search Index Links",
			callback: () => {
				const entries = this.getIndexLinkEntries();
				if (entries === null) {
					return;
				}

				new IndexLinkSuggestModal(
					this.app,
					entries,
					INDEX_NOTE_PATH,
				).open();
			},
		});

		this.addCommand({
			id: "open-assets",
			name: "Open Assets",
			// @ts-ignore
			callback: async () => {
				const leaf = this.app.workspace.getLeaf();
				const file = this.getFileFromLeaf(leaf);
				const adapter = this.app.vault.adapter;
				// @ts-ignore
				const vaultDir = adapter.basePath;
				const uuid = file.basename;
				const parent = file.parent.name;
				const cache = this.getFileCacheFromUUID(uuid);
				if (cache === undefined) {
					console.warn(`Possible invalid frontmatter for: ${uuid}`);
					return;
				}

				let name = this.getResourceName(cache);
				if (name === undefined) {
					name = uuid;
				}

				if (parent === "Verbatim") {
					if (!(await adapter.exists(`${Paths.Assets}/${uuid}/`))) {
						await this.app.vault.adapter.mkdir(
							`${Paths.Assets}/${uuid}/`,
						);
					}
					const assetPath = `${vaultDir}/${Paths.Assets}/${uuid}/`;
					const { shell } = require("electron");
					shell.showItemInFolder(assetPath);
				} else if (parent === Paths.Actions) {
					const _uuid = this.findResourceNamed(name, Paths.Notes);
					if (_uuid !== "") {
						await leaf.openFile(this.getFileFromUUID(_uuid));
					} else {
						new Notice(`No Log Entry for: ${name}`);
					}
				} else if (parent === Paths.Notes) {
					const _uuid = this.findResourceNamed(name, Paths.Actions);
					if (_uuid !== "") {
						await leaf.openFile(this.getFileFromUUID(_uuid));
					} else {
						new Notice(`No Action for: ${name}`);
					}
				} else if (parent !== Paths.Actions && parent !== Paths.Notes) {
					new Notice(`Unsuported type: ${parent}`);
				}
			},
		});

		this.addCommand({
			id: "properties-toggle",
			name: "Properties: toggle Visible/Hidden",
			callback: () => {
				// @ts-ignore
				const cur = this.app.vault.getConfig("propertiesInDocument");
				const next = cur === "hidden" ? "source" : "hidden";
				// @ts-ignore
				this.app.vault.setConfig("propertiesInDocument", next);
			},
		});

		this.addCommand({
			id: "goto-definition",
			name: "Goto Definition",
			// @ts-ignore
			editorCallback: (editor) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const links = [];

				const collect = (regexp, cursorOffset, extractTarget) => {
					let match = undefined;
					while ((match = regexp.exec(line)) !== null) {
						const value = match[0];
						links.push({
							from: match.index,
							to: match.index + value.length,
							cursor: match.index + cursorOffset(value),
							target: extractTarget(value),
						});
					}
				};

				collect(
					/!?\[\[[^\]]+\]\]/g,
					(value) => (value.startsWith("![[") ? 3 : 2),
					(value) => {
						const start = value.startsWith("![[") ? 3 : 2;
						return value.slice(start, -2).split("|", 1)[0].trim();
					},
				);
				collect(
					/!?\[[^\]\n]*\]\([^)]+\)/g,
					(value) => value.indexOf("](") + 2,
					(value) => {
						const start = value.indexOf("](") + 2;
						let target = value.slice(start, -1).trim();
						if (target.startsWith("<") && target.endsWith(">")) {
							target = target.slice(1, -1);
						}
						return target;
					},
				);
				collect(
					/<https?:\/\/[^>\s]+>/g,
					() => 1,
					(value) => value.slice(1, -1),
				);
				collect(
					/https?:\/\/[^\s<>()]+/g,
					() => 1,
					(value) => value,
				);

				const candidates = links.filter((link) => {
					return !links.some(
						(other) =>
							other !== link &&
							other.from <= link.from &&
							other.to >= link.to &&
							other.to - other.from > link.to - link.from,
					);
				});

				const distance = (link) => {
					if (cursor.ch < link.from) {
						return link.from - cursor.ch;
					}
					if (cursor.ch > link.to) {
						return cursor.ch - link.to;
					}
					return 0;
				};

				const link =
					candidates.find(
						(link) =>
							link.from <= cursor.ch && cursor.ch <= link.to,
					) ||
					candidates.sort(
						(a, b) => distance(a) - distance(b) || a.from - b.from,
					)[0];

				if (link === undefined) {
					new Notice(`No link found`);
					return;
				}

				const sourceFile = this.app.workspace.getActiveFile();
				if (sourceFile !== null) {
					const linktext = parseLinktext(link.target);
					let linkedFile = undefined;
					try {
						linkedFile =
							this.app.metadataCache.getFirstLinkpathDest(
								linktext.path,
								sourceFile.path,
							);
					} catch {
						linkedFile = undefined;
					}

					if (linkedFile?.extension.toLowerCase() === "pdf") {
						this.openPdfExternally(linkedFile, linktext.subpath);
						return;
					}
				}

				editor.focus();
				editor.setCursor(cursor.line, link.cursor);
				// @ts-ignore
				this.app.commands.executeCommandById("editor:follow-link");
			},
		});

		this.addCommand({
			id: "goto-definition-new-leaf",
			name: "Goto Definition Open in New Leaf",
			// @ts-ignore
			editorCallback: (editor) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const links = [];

				const collect = (regexp, cursorOffset) => {
					let match = undefined;
					while ((match = regexp.exec(line)) !== null) {
						const value = match[0];
						links.push({
							from: match.index,
							to: match.index + value.length,
							cursor: match.index + cursorOffset(value),
						});
					}
				};

				collect(/!?\[\[[^\]]+\]\]/g, (value) =>
					value.startsWith("![[") ? 3 : 2,
				);
				collect(
					/!?\[[^\]\n]*\]\([^)]+\)/g,
					(value) => value.indexOf("](") + 2,
				);
				collect(/<https?:\/\/[^>\s]+>/g, () => 1);
				collect(/https?:\/\/[^\s<>()]+/g, () => 1);

				const candidates = links.filter((link) => {
					return !links.some(
						(other) =>
							other !== link &&
							other.from <= link.from &&
							other.to >= link.to &&
							other.to - other.from > link.to - link.from,
					);
				});

				const distance = (link) => {
					if (cursor.ch < link.from) {
						return link.from - cursor.ch;
					}
					if (cursor.ch > link.to) {
						return cursor.ch - link.to;
					}
					return 0;
				};

				const link =
					candidates.find(
						(link) =>
							link.from <= cursor.ch && cursor.ch <= link.to,
					) ||
					candidates.sort(
						(a, b) => distance(a) - distance(b) || a.from - b.from,
					)[0];

				if (link === undefined) {
					new Notice(`No link found`);
					return;
				}

				editor.focus();
				editor.setCursor(cursor.line, link.cursor);
				const activeLeaf = this.app.workspace.getLeaf();
				// @ts-ignore
				const root = activeLeaf.parent;
				// @ts-ignore
				const leaves = [...root.children];
				// @ts-ignore
				this.app.commands.executeCommandById(
					"editor:open-link-in-new-leaf",
				);

				let retry = 0;
				const activateNewLeaf = () => {
					// @ts-ignore
					const leaf = root.children.find(
						(leaf) => !leaves.includes(leaf),
					);
					if (leaf !== undefined) {
						this.app.workspace.setActiveLeaf(leaf, { focus: true });
						return;
					}
					if (retry < 10) {
						retry += 1;
						setTimeout(activateNewLeaf, 50);
					}
				};

				setTimeout(activateNewLeaf, 0);
			},
		});

		this.addCommand({
			id: "goto-next",
			name: "Goto Next",
			// @ts-ignore
			callback: async () => {
				const leaf = this.app.workspace.getLeaf();
				const file = this.getFileFromLeaf(leaf);
				// @ts-ignore
				const uuid = file.basename;
				const parent = file.parent.name;
				const cache = this.getFileCacheFromUUID(uuid);
				if (cache === undefined) {
					console.warn(`Possible invalid frontmatter for: ${uuid}`);
					return;
				}

				let name = this.getResourceName(cache);
				if (name === undefined || !Helper.isDate(name)) {
					new Notice(`Expected format yyyy-mm-dd, got: ${name}`);
					return;
				}

				const dt = new Date(name);
				let closest = undefined;

				if (parent !== Paths.Actions && parent !== Paths.Notes) {
					new Notice(`Unsuported type: ${parent}`);
					return;
				}

				let _closest = 2147483647 * 1000;
				let _closestUuid = undefined;

				this.dv.pages(`"${parent}"`).where((page) => {
					const _uuid = page.file.name;
					const _cache = this.getFileCacheFromUUID(_uuid);
					const _name = this.getResourceName(_cache);
					if (_name === undefined) {
						return false;
					}

					if (!Helper.isDate(_name)) {
						return false;
					}

					const _dt = new Date(_name);
					if (
						_dt.getTime() > dt.getTime() &&
						_dt.getTime() < _closest
					) {
						_closestUuid = _uuid;
						_closest = _dt.getTime();
					}

					return false;
				});

				Assert.True(_closestUuid !== undefined, `Next was not found`);
				await leaf.openFile(this.getFileFromUUID(_closestUuid));
			},
		});

		this.addCommand({
			id: "goto-prev",
			name: "Goto Prev",
			// @ts-ignore
			callback: async () => {
				console.log("goto-prev");
				const leaf = this.app.workspace.getLeaf();
				const file = this.getFileFromLeaf(leaf);
				// @ts-ignore
				const uuid = file.basename;
				const parent = file.parent.name;
				const cache = this.getFileCacheFromUUID(uuid);
				if (cache === undefined) {
					new Notice(`Possible invalid frontmatter for: ${uuid}`);
					return;
				}

				const name = this.getResourceName(cache);
				if (name === undefined || !Helper.isDate(name)) {
					new Notice(`Expected format yyyy-mm-dd, got: ${name}`);
					return;
				}

				const dt = new Date(name);
				let closest = undefined;
				let _closest = 0;
				let _closestUuid = undefined;

				if (parent !== Paths.Actions && parent !== Paths.Notes) {
					new Notice(`Unsuported type: ${parent}`);
					return;
				}

				this.dv.pages(`"${parent}"`).where((page) => {
					const _uuid = page.file.name;
					const _cache = this.getFileCacheFromUUID(_uuid);
					const _name = this.getResourceName(_cache);
					if (_name === undefined) {
						return false;
					}

					if (!Helper.isDate(_name)) {
						return false;
					}

					const _dt = new Date(_name);

					// if (closest === undefined && _dt.getTime() < dt.getTime()) {
					// 	page.dt = _dt;
					// 	closest = page;
					// }
					//
					// if (_dt.getTime() < dt.getTime() && _dt.getTime() > closest.dt.getTime()) {
					// 	page.dt = _dt;
					// 	closest = page;
					// }
					if (
						_dt.getTime() < dt.getTime() &&
						_dt.getTime() > _closest
					) {
						_closest = _dt.getTime();
						_closestUuid = _uuid;
					}

					return false;
				});

				Assert.True(_closestUuid !== undefined, `Next was not found`);
				await leaf.openFile(this.getFileFromUUID(_closestUuid));
			},
		});

		this.addCommand({
			id: "open-index",
			name: "Open Index",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened(
					"Notes/eec0a297-982c-471c-9748-4943ec45fe94.md",
				);
			},
		});

		this.addCommand({
			id: "open-journal",
			name: "Open Journal",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened(
					"Notes/a66c1ed1-3022-4197-9ade-152b138813d9.md",
				);
			},
		});

		this.addCommand({
			id: "open-inbox",
			name: "Open Inbox",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened(
					"Notes/8c7aad2a-b67f-44b7-86fd-27a50410be65.md",
				);
			},
		});

		this.addCommand({
			id: "open-planning",
			name: "Open Planning",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened(
					"Notes/db5a4532-9025-404b-84ab-85e571884e2d.md",
				);
			},
		});

		this.addCommand({
			id: "open-next_actions",
			name: "Open Next Actions",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened(
					"Notes/ab7aec92-2273-40bc-9632-da70937b5575.md",
				);
			},
		});

		this.addCommand({
			id: "open-someday_maybe",
			name: "Open Someday Maybe",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened(
					"Notes/e7b605b9-4d3a-4c17-bf4e-e7f1a51f7a30.md",
				);
			},
		});

		this.addCommand({
			id: "open-waiting_for",
			name: "Open Waiting For",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened(
					"Notes/7a13d7ac-732b-4cec-91f0-1498c824b82e.md",
				);
			},
		});

		this.addCommand({
			id: "open-todays-log",
			name: "Open Today's Logs",
			// @ts-ignore
			callback: () => {
				const now = new Date();
				const nowIso = now.toISOString().slice(0, 10);
				// @ts-ignore
				if (!this.loadNoteNamed(nowIso)) {
					this.note(nowIso);
				}
			},
		});

		this.addCommand({
			id: "check-duplicates",
			name: "Check for Duplicates",
			// @ts-ignore
			callback: () => {
				const res = {};
				// @ts-ignore
				const pages = this.dv.pages(`"${Paths.Notes}"`);
				for (const page of pages) {
					const uuid = page.file.name;
					const cache = this.getFileCacheFromUUID(uuid);
					if (cache === undefined) {
						console.warn(
							`Possible invalid frontmatter for: ${uuid}`,
						);
						return;
					}

					const name = this.getResourceName(cache);

					if (name === undefined) {
						continue;
					}

					// is not date format
					if (!Helper.isDate(name)) {
						continue;
					}

					if (res[name] === undefined || res[name] === null) {
						res[name] = [uuid];
					} else {
						res[name].push(uuid);
					}
				}

				const keys = Object.keys(res);
				keys.sort();
				for (const key of keys) {
					if (res[key].length > 1) {
						console.log(key);
						for (const page of res[key]) {
							console.log(`	${page}`);
						}
					}
				}
			},
		});

		this.addCommand({
			id: "open-yesterdays-logs",
			name: "Open Yesterday's Logs",
			// @ts-ignore
			callback: () => {
				const now = new Date();
				now.setDate(now.getDate() - 1);
				const nowIso = now.toISOString().slice(0, 10);
				this.loadNoteNamed(nowIso);
			},
		});

		this.addCommand({
			id: "open-todays-daily",
			name: "Open Today's Daily",
			// @ts-ignore
			callback: () => {
				const now = new Date();
				const nowIso = now.toISOString().slice(0, 10);
				this.loadActionNamed(nowIso);
			},
		});

		this.addCommand({
			id: "open-tomorrows-daily",
			name: "Open Tomorrow's Daily",
			// @ts-ignore
			callback: () => {
				const now = new Date();
				now.setDate(now.getDate() + 1);
				const nowIso = now.toISOString().slice(0, 10);
				this.loadActionNamed(nowIso);
			},
		});

		this.addCommand({
			id: "open-yesterdays-daily",
			name: "Open Yesterday's Daily",
			// @ts-ignore
			callback: () => {
				const now = new Date();
				now.setDate(now.getDate() - 1);
				const nowIso = now.toISOString().slice(0, 10);
				this.loadActionNamed(nowIso);
			},
		});

		this.addCommand({
			id: "generate-note",
			name: "Generate Note",
			// @ts-ignore
			callback: () => {
				this.note();
			},
		});

		this.addCommand({
			id: "generate-verbatim",
			name: "Generate Verbatim",
			// @ts-ignore
			callback: () => {
				this.verbatim();
			},
		});

		this.addCommand({
			id: "generate-action",
			name: "Generate Action",
			// @ts-ignore
			callback: () => {
				this.action();
			},
		});

		this.addCommand({
			id: "open-pdf",
			name: "Open PDF",
			// @ts-ignore
			callback: () => {
				const leaf = this.app.workspace.getLeaf();
				const file = this.getFileFromLeaf(leaf);
				// @ts-ignore
				const uuid = file.basename;
				const parent = file.parent.name;
				const cache = this.getFileCacheFromUUID(uuid);
				if (cache === undefined) {
					new Notice(`Possible invalid frontmatter for: ${uuid}`);
					return;
				}

				const candidates = [];
				for (const l of cache.links) {
					const linktext = parseLinktext(l.link);
					let linkedFile = undefined;
					try {
						linkedFile =
							this.app.metadataCache.getFirstLinkpathDest(
								linktext.path,
								file.path,
							);
					} catch {
						console.warn(
							`getFirstLinkpathDest failed for: ${linktext}`,
						);
						continue;
					}

					if (linkedFile?.extension === "pdf") {
						candidates.push(linkedFile);
					}
				}

				if (candidates.length === 0) {
					new Notice(`No PDF in current view where found`);
					return;
				} else if (candidates.length > 1) {
					new Notice(
						`More than one PDF in current view, opening first link`,
					);
				}
				const candidate = candidates[0];

				if (!Helper.isUUID(candidate.parent.name)) {
					console.log(candidate.parent.name);
					new Notice(`Invalid asset location: ${candidate.path}`);
					return;
				}

				if (
					candidate.parent.parent === undefined ||
					candidate.parent.parent.name !== "Assets"
				) {
					new Notice(`Invalid asset location: ${candidate.path}`);
					return;
				}

				const adapter = this.app.vault.adapter;
				// @ts-ignore
				const path = `${adapter.basePath}/${candidate.parent.path}`;

				const { spawn } = require("child_process");

				const command = `systemd-run --user --working-directory=${path} /usr/bin/zathura ${candidate.name}`;
				const child = spawn("/bin/sh", ["-lc", command], {
					stdio: ["ignore", "pipe", "pipe"], // ignore stdin => non interactif
				});
			},
		});

		this.addCommand({
			id: "clippy-the-clipper",
			name: "Clippy Clip",
			// @ts-ignore
			editorCallback: (editor) => {
				navigator.clipboard.readText().then((clipboardText) => {
					const text = clipboardText.replace(/[\r\n]+/g, "");
					console.log(text);
					let _name = undefined;
					let _fqdn = undefined;
					let file = undefined;
					let linkText = "";

					if (text.slice(0, 7) === "Assets/") {
						file = this.app.vault.getAbstractFileByPath(text);
						if (Helper.nilCheck(file)) {
							return;
						}

						_fqdn = file.path;
						_name = file.name;
						linkText = `[asset:: [[${_fqdn}| ${_name}]]]`;
					} else {
						let _id = undefined;
						try {
							_id = this.extractUUIDFromLink(text);
						} catch {
							new Notice(
								`Unaible to process clipboard: ${text} `,
							);
							return;
						}

						file = this.getFileFromUUID(_id);
						Assert.True(
							file !== undefined,
							`getFileFromUUID: returned undefined for uuid: ${_id} `,
						);

						const cache = this.getFileCacheFromUUID(_id);
						if (cache === undefined) {
							console.warn(
								`Possible invalid frontmatter for: ${_id} `,
							);
							return;
						}
						_name = this.getResourceName(cache);
						_fqdn = _id;

						if (_name === undefined) {
							linkText = `[[${_fqdn}|${_name}]]`;
						} else {
							linkText = `[[${file.path.split("/").slice(0, -1)}/${_fqdn}|${_name}]]`;
						}
					}

					console.log(`linkText: "${linkText}"`);
					const cursor = editor.getCursor();
					const ch = Math.min(
						cursor.ch + 1,
						editor.getLine(cursor.line).length,
					);
					editor.replaceRange(linkText, {
						line: cursor.line,
						ch: ch,
					});
				});
			},
		});

		this.addCommand({
			id: "copy-uuid",
			name: "Copy UUID",
			// @ts-ignore
			callback: async () => {
				const leaf = this.app.workspace.getLeaf();
				const file = this.getFileFromLeaf(leaf);
				const uuid = file.basename;
				const parent = file.parent.name;

				if (["Verbatim", "Notes", "Actions"].contains(parent)) {
					await navigator.clipboard.writeText(uuid);
				} else if (
					Helper.isUUID(parent) &&
					file.parent.parent.name === "Assets"
				) {
					await navigator.clipboard.writeText(file.path);
				}
			},
		});

		this.addCommand({
			id: "safe-delete",
			name: "Safe Delete",
			// @ts-ignore
			callback: () => {
				const file = this.app.workspace.getActiveFile();
				if (file === undefined) {
					return;
				}

				this.app.vault.delete(file);
			},
		});

		this.addCommand({
			id: "append-to-inbox",
			name: "Append to Inbox",
			// @ts-ignore
			callback: () => {
				// ouverture pas instantanée
				const f = this.app.vault.getAbstractFileByPath("INBOX.md");
				if (f === undefined || f === null) {
					console.warn(`file not found INBOX.md`);
					return;
				}

				const active = this.app.workspace.getLeaf();
				// @ts-ignore
				const root = active.parent;
				// rechercher si pas déja ouvert dans les onglets actifs
				// sinon créer un nouvel onglet, ouvrir le fichier, et en faire l'onglet actif
				let found = false;
				let node = undefined;
				const emptyTabs = [];

				for (const leaf of root.children) {
					const file = this.getFileFromLeaf(leaf);
					if (file === undefined || file === null) {
						emptyTabs.push(leaf);
						continue;
					}

					if (file.name === f.name) {
						found = true;
						node = leaf;
					}
				}

				if (!found) {
					if (emptyTabs.length > 0) {
						node = emptyTabs[0];
					} else {
						this.app.workspace.createLeafInParent(
							root,
							root.children.length + 1,
						);
						node = root.children[root.children.length - 1];
					}
				}

				const editorAction = (node) => {
					// @ts-ignore
					const editor = node.view.sourceMode.cmEditor;
					editor.insertText("\n\n---\n\n", editor.lastLine());
					editor.setCursor(editor.lastLine(), 0);
				};

				if (
					this.app.workspace.getActiveFile() === null ||
					this.app.workspace.getActiveFile().name !== "INBOX.md"
				) {
					node.openFile(f, {
						active: true,
					}).then((_) => editorAction(node));
				} else {
					editorAction(node);
				}
			},
		});

		this.app.workspace.onLayoutReady(() => {
			console.log("workspace - layout-ready");
			for (const f of this.app.vault.getFiles()) {
				const uuid = f.basename;
				if (!Helper.isUUID(uuid)) {
					continue;
				}

				this.vaultContentDict[uuid] = f;
			}
		});

		this.app.metadataCache.on(
			"changed",
			(file: TFile, data: string, cache: CachedMetadata) => {
				const uuid = file.basename;
				if (Helper.isUUID(uuid)) {
					this.vaultContentDict[uuid] = file;
				}
			},
		);

		this.app.workspace.on("active-leaf-change", () => {
			return this.sneakyTabRenamer(this.app);
		});

		this.app.workspace.on("quick-preview", () => {
			return this.sneakyTabRenamer(this.app);
		});

		this.app.workspace.on("resize", () => {
			return this.sneakyTabRenamer(this.app);
		});
	}

	sneakyTabRenamer(app) {
		// @ts-ignore
		const root = this.app.workspace.getLeaf().parent;

		for (const leaf of root.children) {
			const file = leaf.view.file;
			if (file === undefined) {
				continue;
			}

			const uuid = file.basename;
			const parent = file.parent.name;
			if (Helper.isUUID(parent) && file.parent.parent.name === "Assets") {
				return;
			}

			// @ts-ignore
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache === undefined) {
				console.warn(`Possible invalid frontmatter for: ${uuid} `);
				return;
			}

			let text = this.getResourceName(cache);

			if (parent === "Actions") {
				if (!Helper.isDate(text)) {
					// new Notice(`Invalid format for: ${ uuid } `);
					return;
				}

				if (text === undefined) {
					text = `(A) ${uuid} `;
				} else {
					const dt = new Date(text);
					text = `(A) ${dayShort[dt.getDay()]}.${dt.getDate()} ${monthShort[dt.getMonth()]}`;
				}
			} else if (parent === "Notes") {
				if (text === undefined) {
					text = `(N) ${uuid}`;
				} else {
					text = `(N) ${text}`;
				}
			} else if (parent === "Verbatim") {
				if (text === undefined) {
					text = `(N) ${uuid}`;
				} else {
					text = `(N) ${text}`;
				}
			} else {
				new Notice(`Type undefined for file: ${file.path} `);
				return;
			}

			// @ts-ignore
			leaf.tabHeaderInnerTitleEl.innerText = text;
			// @ts-ignore
			leaf.tabHeaderInnerTitleEl.innerHTML = text;
		}
	}

	getResourceName(cache: CachedMetadata): string {
		if (cache.headings === undefined) {
			return undefined;
		}

		if (cache.headings.length > 0 && cache.headings[0].level === 1) {
			return cache.headings[0].heading;
		} else {
			return cache.frontmatter.uuid;
		}
	}

	findResourceNamed(name: string, path: string): string {
		const pages = this.dv.pages(`"${path}"`).where((page) => {
			const _uuid = page.file.name;
			const _cache = this.getFileCacheFromUUID(_uuid);
			if (_cache === undefined) {
				console.warn(`Possible invalid frontmatter for: ${_uuid} `);
				return false;
			}

			const _name = this.getResourceName(_cache);
			if (_name === undefined) {
				return false;
			}

			if (_name !== name) {
				return false;
			}

			return true;
		});

		if (pages.length === 0) {
			return "";
		} else {
			return pages[0].file.name;
		}
	}

	loadResourceNamed(name: string, path: string): boolean {
		const pages = this.dv.pages(`"${path}"`).where((page) => {
			const uuid = page.file.name;
			const cache = this.getFileCacheFromUUID(uuid);
			if (cache === undefined) {
				console.warn(`Possible invalid frontmatter for: ${uuid} `);
				return false;
			}

			const _name = this.getResourceName(cache);
			if (_name === undefined) {
				return false;
			}

			if (_name !== name) {
				return false;
			}

			return true;
		});

		if (pages.length === 0) {
			return false;
		}

		if (pages.length > 1) {
			console.warn(`Multiple matches for: ${path}/${name}`);
		}

		this.openViewInNewTabIfNotOpened(`${path}/${pages[0].file.name}.md`);
		return true;
	}

	loadActionNamed(name: string): boolean {
		return this.loadResourceNamed(name, Paths.Actions);
	}

	loadNoteNamed(name: string): boolean {
		return this.loadResourceNamed(name, Paths.Notes);
	}

	onunload() {
		console.log("gonext - onunload()");
		// @ts-ignore
		delete window.gonext;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	action() {
		const dt = new Date();
		const note = {
			uuid: uuidv4(),
			created_at: dt.toISOString(),
			path: "",
			data: "",
		};

		note.path = `${Paths.Actions}/${note.uuid}.md`;
		note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# \n## content\n`;

		const f = this.app.vault.create(note.path, note.data).then((f) => {
			return f;
		});
		const active = this.app.workspace.getLeaf();
		// @ts-ignore
		const root = active.parent;
		this.app.workspace.createLeafInParent(root, root.children.length + 1);
		const leaf = root.children[root.children.length - 1];
		f.then((file) => {
			leaf.openFile(file, { active: true });
		});
	}

	verbatim(name?: string) {
		const dt = new Date();
		const note = {
			uuid: uuidv4(),
			created_at: dt.toISOString(),
			path: "",
			data: "",
		};

		note.path = `${Paths.Verbatim}/${note.uuid}.md`;
		note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# ${name}\n## Content\n`;

		if (name === undefined) {
			note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# \n## Content\n`;
		} else {
			note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# ${name}\n## Content\n`;
		}

		const f = this.app.vault.create(note.path, note.data).then((f) => {
			return f;
		});
		const active = this.app.workspace.getLeaf();
		// @ts-ignore
		const root = active.parent;
		this.app.workspace.createLeafInParent(root, root.children.length + 1);
		const leaf = root.children[root.children.length - 1];
		f.then((file) => {
			leaf.openFile(file, { active: true });
		});
	}

	note(name?: string) {
		const dt = new Date();
		const note = {
			uuid: uuidv4(),
			created_at: dt.toISOString(),
			path: "",
			data: "",
		};

		note.path = `${Paths.Notes}/${note.uuid}.md`;
		if (name === undefined) {
			note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# \n## Content\n`;
		} else {
			note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# ${name}\n## Content\n`;
		}

		const f = this.app.vault.create(note.path, note.data).then((f) => {
			return f;
		});
		const active = this.app.workspace.getLeaf();
		// @ts-ignore
		const root = active.parent;
		this.app.workspace.createLeafInParent(root, root.children.length + 1);
		const leaf = root.children[root.children.length - 1];
		f.then((file) => {
			leaf.openFile(file, { active: true });
		});
	}
}

export const Helper = {
	nilCheck(val: any): boolean {
		return val === undefined || val === null;
	},

	roundToOneDecimal(val: number): number {
		return Math.round(val * 10) / 10;
	},

	durationStringToSec(val) {
		if (val === undefined || val.length === 0) {
			return 0;
		}
		const mult = val.slice(-1);
		let m = 0;
		if (mult === "h") {
			m = 60 * 60;
		} else if (mult === "m") {
			m = 60;
		} else if (mult === "d") {
			m = 24 * 60 * 60;
		} else if (mult == "w") {
			m = 24 * 60 * 60 * 7;
		} else {
			console.warn(`Unhandled case val: ${val}`);
			return undefined;
		}

		return m * parseInt(val.slice(0, -1));
	},

	msecToStringDuration(val: number) {
		const oneHourInMsec = 3600000; // 1 hour in msec
		const oneDayInMsec = 86400000; // 1 day in msec
		if (val >= 24 * oneHourInMsec) {
			return (
				String(Helper.roundToOneDecimal(val / oneDayInMsec)).padStart(
					2,
					"0",
				) + " d"
			);
		} else {
			return (
				String(Helper.roundToOneDecimal(val / oneHourInMsec)).padStart(
					2,
					"0",
				) + " h"
			);
		}
	},

	isUUID(val: string): boolean {
		if (typeof val !== "string") {
			return false;
		}
		return val.length === 36;
	},

	isDate(val: string): boolean {
		if (val.length != 10) {
			return false;
		}

		const dt = new Date(val);
		if (dt.toString() === "Invalid Date") {
			return false;
		}

		return true;
	},
};

class ValidationError extends Error {
	constructor(message) {
		super(message); // (1)
		this.name = "ValidationError"; // (2)
	}
}

export const Assert = {
	True(predicate: boolean, message: string, strict = true) {
		if (!predicate) {
			if (strict) {
				throw new ValidationError(message);
			} else {
				console.error(message);
			}
		}
	},
	False(predicate: boolean, message: string, strict = false) {
		if (predicate) {
			if (strict) {
				throw new ValidationError(message);
			} else {
				console.error(message);
			}
		}
	},
};

export const Paths = {
	Actions: "Actions",
	Notes: "Notes",
	Verbatim: "Verbatim",
	Assets: "Assets",
	Tasks: "Actions",
};
