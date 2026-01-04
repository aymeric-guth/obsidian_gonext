// @ts-ignore
import {
	Plugin,
	Workspace,
	// @ts-ignore
	HTMLElement,
	addIcon,
	CachedMetadata,
	TFile,
	TAbstractFile,
} from "obsidian";
import { v4 as uuidv4, v1 as uuidv1 } from "uuid";

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

		node.openFile(f, { active: true, });
	}

	getFileCacheFromLeaf(leaf): CachedMetadata {
		let file = undefined;
		try {
			// @ts-ignore
			file = leaf.view.file;
		} catch {
			return undefined;
		}
		if (file === undefined || file === null) {
			return undefined;
		}
		// @ts-ignore
		const abstractPath = this.app.vault.getAbstractFileByPath(file);
		// @ts-ignore
		return this.app.metadataCache.getFileCache(abstractPath);
	}

	getFileFromLeaf(leaf): TAbstractFile {
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

	grugAlias(_id: string): string {
		const cache = this.getFileCacheFromUUID(_id);
		if (cache === undefined) {
			console.error(`grugAlias: file not found in grug cache ${_id}`);
			return "";
		}

		console.log(cache);
		console.log();
		// what is the naming preference?
		// alias > name heading
		let targetName = undefined;
		const fm = cache.frontmatter;

		if (cache.headings.length > 0 && cache.headings[0].level === 1) {
			targetName = cache.headings[0].heading;
		} else if (fm.alias !== undefined) {
			if (Array.isArray(fm.alias) && fm.alias.length > 0) {
				// problem atheists?
				targetName = cache.frontmatter.alias[0];
			} else {
				targetName = cache.frontmatter.alias;
			}
		} else {
			targetName = _id;
		}

		const file = this.getFileFromUUID(_id);
		if (file === undefined) {
			console.error(`grugAlias: Cannot grug this id: ${_id}`);
			return "";
		}
		const path = `${file.path.split("/").slice(0, -1)}/${_id}`;

		return `[[${path}|${targetName}]]`;
	}

	getFileFromUUID(_id: string): TAbstractFile {
		return this.vaultContentDict[_id];
	}

	getFileCacheFromUUID(_id: string): CachedMetadata {
		const f = this.vaultContentDict[_id];
		if (f === undefined) {
			return undefined;
		}

		return this.app.metadataCache.getFileCache(f);
	}

	async onload() {
		console.log("gonext - onload()");
		await this.loadSettings();
		this.metadataCache = this.app.metadataCache;
		this.workspace = this.app.workspace;
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
			id: "open-assets",
			name: "Open Assets",
			// @ts-ignore
			callback: async () => {
				const leaf = this.app.workspace.getLeaf();
				const file = this.getFileFromLeaf(leaf);
				const cache = this.getFileCacheFromLeaf(leaf);
				const adapter = this.app.vault.adapter;
				// @ts-ignore
				const vaultDir = adapter.basePath;

				const fm = cache.frontmatter;
				if (fm === undefined) {
					console.log(`file does not have a frontmatter: ${file.path}`);
					return;
				}
				// console.log(fm)

				const uuid = fm.uuid;
				if (uuid === undefined) {
					console.log(`file does not have a uuid: ${file.path}`);
					return;
				}

				if (!await adapter.exists(`${Paths.Assets}/${uuid}/`)) {
					await this.app.vault.adapter.mkdir(`${Paths.Assets}/${uuid}/`);
				}

				const assetPath = `${vaultDir}/${Paths.Assets}/${uuid}/`;
				console.log(assetPath);
				const { shell } = require("electron");
				shell.showItemInFolder(assetPath);
			},
		});

		this.addCommand({
			id: "open-index",
			name: "Open Index",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened("Notes/eec0a297-982c-471c-9748-4943ec45fe94.md");
			},
		});

		this.addCommand({
			id: "open-inbox",
			name: "Open Inbox",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened("Notes/8c7aad2a-b67f-44b7-86fd-27a50410be65.md");
			},
		});

		this.addCommand({
			id: "open-planning",
			name: "Open Planning",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened("Notes/d371e0f9-1a7f-4cd0-8fa4-260c176da4a4.md");
			},
		});

		this.addCommand({
			id: "open-next_actions",
			name: "Open Next Actions",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened("Notes/ab7aec92-2273-40bc-9632-da70937b5575.md");
			},
		});

		this.addCommand({
			id: "open-someday_maybe",
			name: "Open Someday Maybe",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened("Notes/e7b605b9-4d3a-4c17-bf4e-e7f1a51f7a30.md");
			},
		});

		this.addCommand({
			id: "open-waiting_for",
			name: "Open Waiting For",
			// @ts-ignore
			callback: () => {
				this.openViewInNewTabIfNotOpened("Notes/7a13d7ac-732b-4cec-91f0-1498c824b82e.md");
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


		// link brut -> path
		// link sous forme indeterminé
		this.addCommand({
			id: "list-orphaned",
			name: "List Orphaned",
			// @ts-ignore
			callback: async () => {
				const files = this.app.vault.getFiles();
				const links = {}
				const r = [];
				let i = 0;
				let failed = 0;

				for (const f of files) {
					links[f.path] = 0;
				}

				// app.metadataCache.getLinks()
				// app.metadataCache.linkResolverQueue
				// app.metadataCache.linkResolver
				// app.metadataCache.resolveLink
				// app.metadataCache.fileToLinkText
				// app.metadataCache.getLinkPathDest
				// app.metadataCache.getFirstLinkPathDest
				//
				// app.metadataCache.getBacklinksForFile
				const mdc = this.app.metadataCache;


				for (const f of files) {
					// console.log(f)
					i++;
					const cache = this.app.metadataCache.getFileCache(f);
					if (cache.links === undefined) {
						continue;
					}

					// console.log(cache);
					for (const l of cache.links) {
						const link = await this.app.metadataCache.linkResolver(l.link);
						if (link === undefined) {
							failed++;
							// console.log(f)
							// console.log(cache)
							// console.log(l.link)
							// console.log("\n\n")
						}
						// console.log(this.app.metadataCache.getLinkpath(l.link));

					}
				}
				console.log(failed);

				for (const l of r) {
					;
					// console.log(l)
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
				let i = 0;
				const pages = this.dv.pages(`"${Paths.Notes}"`);
				for (const page of pages) {
					const uuid = page.file.name;
					const cache = this.getFileCacheFromUUID(uuid);
					const nameHeading = this.getResourceName(
						cache,
					);

					if (nameHeading === undefined || nameHeading === "") {
						continue;
					}

					// is not date format
					if (nameHeading.length !== 10 || nameHeading[0] !== "2") {
						continue;
					}

					if (res[nameHeading] === undefined || res[nameHeading] === null) {
						res[nameHeading] = [uuid];
					} else {
						res[nameHeading].push(uuid);
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
			id: "clippy-the-clipper",
			name: "Clippy Clip",
			// @ts-ignore
			callback: () => {
				navigator.clipboard.readText().then((text) => {
					let _id = undefined;
					try {
						_id = this.extractUUIDFromLink(text);
					} catch {
						return;
					}
					const file = this.getFileFromUUID(_id);
					Assert.True(
						file !== undefined,
						`getFileFromUUID: returned undefined for uuid: ${_id}`,
					);
					const alias = this.grugAlias(_id);
					// @ts-ignore
					const activeLeaf = this.app.workspace.getLeaf();
					// @ts-ignore
					if (activeLeaf) {
						// @ts-ignore
						const editor = activeLeaf.view.sourceMode.cmEditor;
						const cursor = editor.getCursor();
						editor.replaceRange(alias, cursor);
					}
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
				const cache = this.getFileCacheFromLeaf(leaf);
				const fm = cache.frontmatter;
				if (fm === undefined) {
					console.log(`file does not have a frontmatter: ${file.path}`);
					return;
				}

				const uuid = fm.uuid;
				if (uuid === undefined) {
					console.log(`file does not have a uuid: ${file.path}`);
					return;
				}

				if (["Verbatim", "Notes", "Actions"].contains(file.parent.name)) {
					await navigator.clipboard.writeText(String(cache.frontmatter.uuid));
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

				const safeFromHarm = [
					"INBOX.md",
					"INDEX.md",
					"Logs.md",
					"NEXT ACTIONS.md",
					"SOMEDAY MAYBE.md",
					"WAITING FOR.md",
					"Planning.md",
				];
				const fm =
					this.app.metadataCache.getFileCache(file).frontmatter;
				if (safeFromHarm.contains(file.path)) {
					console.log(
						"Oopsie, almost did an oopsie. Got your back bro",
					);
					return;
				}

				if (fm.tags !== undefined && fm.tags.length >= 0) {
					for (const tag of fm.tags) {
						if (tag === "project/daily") {
							console.log(
								"Hey George What's up George, You cannot do that George",
							);
							return;
						}
					}
				}

				console.log(`deleted file: ${file.path}`);
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
				if (!Helper.isUUID(f.basename)) {
					continue;
				}

				this.vaultContentDict[f.basename] = f;
			}
		});
		// this.app.metadataCache.on
		this.app.metadataCache.on(
			"changed",
			(file: TFile, data: string, cache: CachedMetadata) => {
				if (Helper.isUUID(file.basename)) {
					this.vaultContentDict[file.basename] = file;
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

			// @ts-ignore
			const cache = this.app.metadataCache.getFileCache(file);
			// @ts-ignore
			const fm = cache.frontmatter;
			if (fm === undefined) {
				continue;
			}

			let text = "";
			if (file.parent.name === "Actions") {
				const at = new Date(fm.at);
				text = `(A) ${dayShort[at.getDay()]}. ${at.getDate()} ${monthShort[at.getMonth()]}`;
			} else if (file.parent.name === "Notes") {
				if (cache.headings.length > 0 && cache.headings[0].level === 1) {
					text = `(N) ${cache.headings[0].heading}`;
				} else {
					text = `(N) ${fm.uuid}`;
				}
			} else if (file.parent.name === "Verbatim") {
				if (cache.headings.length > 0 && cache.headings[0].level === 1) {
					text = `(V) ${cache.headings[0].heading}`;
				} else {
					text = `(V) ${fm.uuid}`;
				}
			} else {
				console.warn(`type undefined for fm: ${fm}`)
				return
			}

			// @ts-ignore
			leaf.tabHeaderInnerTitleEl.innerText = text;
			// @ts-ignore
			leaf.tabHeaderInnerTitleEl.innerHTML = text;
		}
	}

	getResourceName(cache: CachedMetadata): string {
		let resourceName = "";

		if (cache.headings.length > 0 && cache.headings[0].level === 1) {
			resourceName = cache.headings[0].heading;
		} else if (cache.frontmatter.alias !== undefined) {
			if (Array.isArray(cache.frontmatter.alias) && cache.frontmatter.alias.length > 0) {
				// problem atheists?
				resourceName = cache.frontmatter.alias[0];
			} else {
				resourceName = cache.frontmatter.alias;
			}
		} else {
			resourceName = cache.frontmatter.uuid;
		}
		return resourceName;

	}

	loadResourceNamed(name: string, path: string): boolean {
		const pages = this.dv
			.pages(`"${path}"`)
			.where((page) => {
				const uuid = page.file.name;
				const cache = this.getFileCacheFromUUID(uuid);
				const nameHeading = this.getResourceName(cache);

				if (nameHeading === undefined) {
					return false;
				}

				if (nameHeading !== name) {
					return false;
				}

				return true;
			});

		if (pages.length === 0) {
			return;
		}

		if (pages.length === 0) {
			return false;
		} else {
			this.openViewInNewTabIfNotOpened(`${path}/${pages[0].file.name}.md`);
			return true;
		}
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
		const active = this.app.workspace.activeLeaf;
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
		const active = this.app.workspace.activeLeaf;
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
		const active = this.app.workspace.activeLeaf;
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
