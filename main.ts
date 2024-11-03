// @ts-ignore
import {
	App,
	Modal,
	Plugin,
	Workspace,
	// @ts-ignore
	HTMLElement,
	addIcon,
	CachedMetadata,
	TFile,
	MetadataCache,
	TAbstractFile,
} from "obsidian";
// @ts-ignore
import {
	Helper,
	Frontmatter,
	ListMaker,
	// @ts-ignore
	Namespace,
	// @ts-ignore
	Renderer,
	// @ts-ignore
	AutoField,
	// @ts-ignore
	FrontmatterJS,
	DvLib,
	// @ts-ignore
	Generator,
	// @ts-ignore
	notify,
	// @ts-ignore
	Assert,
} from "./api";
// @ts-ignore
import { Paths, Status, Types, Namespace, Default } from "./constants";
// import { randomUUID } from "crypto";
// const { randomUUID } = require("crypto");
import { v4 as uuidv4 } from "uuid";
import { continuedIndent } from "@codemirror/language";
import { throws } from "assert";

// Remember to rename these classes and interfaces!
interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

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
	listMaker: ListMaker;
	frontmatter: Frontmatter;
	generate: Generator;
	notify: any;
	vaultContent: TFile[] = [];

	openInNewTabIfNotOpened(page) {
		console.log(page);
		const active = this.app.workspace.activeLeaf;
		// @ts-ignore
		const root = active.parent;
		// rechercher si pas déja ouvert dans les onglets actifs
		// sinon créer un nouvel onglet, ouvrir le fichier, et en faire l'onglet actif
		let found = false;
		let node = undefined;
		const emptyTabs = [];

		for (const leaf of root.children) {
			const file = this.getFileCacheFromLeaf(leaf);
			if (file === undefined) {
				emptyTabs.push(leaf);
				continue;
			}

			if (
				file.frontmatter !== undefined &&
				file.frontmatter.uuid === page.file.frontmatter.uuid
			) {
				found = true;
				node = leaf;
				break;
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

		node.openFile(this.app.vault.getAbstractFileByPath(page.file.path), {
			active: true,
		});
	}

	getFileCacheFromLeaf(leaf): CachedMetadata {
		let file = undefined;
		try {
			// @ts-ignore
			file = leaf.view.getSyncViewState().state.file;
		} catch {
			return undefined;
		}
		// @ts-ignore
		const abstractPath = app.vault.getAbstractFileByPath(file);
		// @ts-ignore
		return app.metadataCache.getFileCache(abstractPath);
	}

	getFileFromLeaf(leaf): TAbstractFile {
		let file = undefined;
		try {
			// @ts-ignore
			file = leaf.view.getSyncViewState().state.file;
		} catch {
			return undefined;
		}
		// @ts-ignore
		return app.vault.getAbstractFileByPath(file);
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

	getFileFromUUID(_id: string): TAbstractFile {
		for (const f of this.vaultContent) {
			if (f.path.length < 36) {
				continue;
			}

			const path = f.path.split("/");
			if (path[path.length - 1].slice(0, -3) === _id) {
				return this.app.vault.getAbstractFileByPath(f.path);
			}
		}
	}

	getFileCacheFromUUID(_id: string): CachedMetadata {
		for (const f of this.vaultContent) {
			if (f.path.length < 36) {
				continue;
			}

			const path = f.path.split("/");
			if (path[path.length - 1].slice(0, -3) === _id) {
				return app.metadataCache.getFileCache(
					this.app.vault.getAbstractFileByPath(f.path),
				);
			}
		}
	}

	generateJournalEntry() { }

	sneakyTabRenamer(app) {
		// @ts-ignore
		const root = app.workspace.activeLeaf.parent;

		for (const leaf of root.children) {
			let path = undefined;
			try {
				path = leaf.view.getSyncViewState().state.file;
			} catch {
				continue;
			}
			const file = app.vault.getAbstractFileByPath(path);
			// @ts-ignore
			const fm =
				// @ts-ignore
				app.metadataCache.getFileCache(file).frontmatter;

			if (fm === undefined) {
				continue;
			}

			let text = "";

			if (fm.type === 3 && Helper.getProject(fm) !== undefined) {
				if (Helper.getProject(fm) === "project/daily") {
					const at = new Date(fm.at);
					text = `(D) ${dayShort[at.getDay()]}. ${at.getDate()} ${monthShort[at.getMonth()]}`;
					// text = `📅 ${dayShort[at.getDay()]}. ${at.getDay()} ${monthShort[at.getMonth()]}`;
				} else {
					text = `(T) ${Helper.getProject(fm).slice(8)}`;
				}
			} else if (fm.type === 2) {
				if (!Helper.nilCheck(fm.alias)) {
					let buff = "";
					for (const alias of fm.alias) {
						if (buff.length === 0) {
							buff = alias;
						} else if (alias.length < buff.length) {
							buff = alias;
						}
					}

					const note = this.getFileCacheFromLeaf(leaf);
					text = `📜 ${buff}`;

					if (note.headings.length > 1) {
						for (const heading of note.headings) {
							if (
								heading.level === 3 &&
								heading.heading === "index"
							) {
								text = `(I) ${buff}`;
								break;
							}
						}
					}
				} else {
					// read level 3 heading
					const note = this.getFileCacheFromLeaf(leaf);
					if (note.headings.length < 1) {
						continue;
					}

					let found = false;
					for (const heading of note.headings) {
						if (heading.level === 3) {
							found = true;
							text = `📜 ${heading.heading}`;
							break;
						}
					}
					if (!found) {
						text = note.frontmatter.uuid;
					}
				}
			} else if (fm.type === 20) {
				const createdAt = new Date(fm.created_at);
				// text = `📓 ${dayShort[at.getDay()]}. ${at.getDay()} ${monthShort[at.getMonth()]}`;
				if (fm.alias !== undefined) {
					text = `(J) ${fm.alias}`;
				} else {
					text = `(J) ${dayShort[createdAt.getDay()]}. ${createdAt.getDate()} ${monthShort[createdAt.getMonth()]}`;
				}
			} else if (fm.type === 12) {
				if (fm.name !== undefined && fm.name !== "") {
					text = `(P) ${fm.name}`;
				}
			} else if (fm.type === 13) {
				text = `(I) ${fm.uuid}`;
			} else {
				continue;
			}
			if (text !== "") {
				// 📓
				// @ts-ignore
				leaf.tabHeaderInnerTitleEl.innerText = text;
				// @ts-ignore
				leaf.tabHeaderInnerTitleEl.innerHTML = text;
			}
		}
	}

	async onload() {
		console.log("gonext - onload()");
		await this.loadSettings();
		this.metadataCache = this.app.metadataCache;
		this.workspace = this.app.workspace;
		// @ts-ignore
		this.dv = this.app.plugins.plugins.dataview.api;
		// @ts-ignore
		this.frontmatter = new Frontmatter(this);
		this.listMaker = new ListMaker(this, this.dv, this.frontmatter);
		this.generate = new Generator(this.app);
		this.files = {};

		this.api = {
			getArea: Helper.getArea,
			getContext: Helper.getContext,
			getDomain: Helper.getDomain,
			getLayer: Helper.getLayer,
			getOrg: Helper.getOrg,
			getProject: Helper.getProject,
			durationStringToSec: Helper.durationStringToSec,
			paths: Paths,
			types: Types,
			status: Status,
			namespace: Namespace,
			default: Default,
			frontmatter: this.frontmatter,
			listMaker: this.listMaker,
			renderer: Renderer,
			autoField: AutoField,
			dvLib: new DvLib(),
			notify: notify,
		};

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

		this.addRibbonIcon("GoNextIcon", "[g]o[n]ext", async () => {
			this.generate.fleeting();
		});

		this.app.workspace.on("active-leaf-change", () => {
			return this.sneakyTabRenamer(this.app);
		});
		this.app.workspace.on("quick-preview", () => {
			return this.sneakyTabRenamer(this.app);
		});
		this.app.workspace.on("resize", () => {
			return this.sneakyTabRenamer(this.app);
		});

		this.addCommand({
			id: "goto-children",
			name: "Goto Child",
			// @ts-ignore
			callback: () => {
				const file = this.getFileFromLeaf(
					this.app.workspace.activeLeaf,
				);
				if (file === undefined) {
					console.error("goto-child: File is undefined");
					return;
				}

				const cache = this.getFileCacheFromLeaf(
					this.app.workspace.activeLeaf,
				);
				const fm = cache.frontmatter;
				if (fm === undefined) {
					console.error("goto-child: Invalid FrontMatter");
					return;
				}

				const active = this.app.workspace.activeLeaf;
				const dir = file.path.split("/")[0];

				if (dir === Paths.Tasks) {
					const page = { file: { frontmatter: fm, path: file.path } };
					const curFm = new FrontmatterJS(page);
					const curAt = curFm.at.toISOString().slice(0, 10);

					if (curFm.getProject() === "daily") {
						const pages = this.dv
							.pages(`"${Paths.Journal}"`)
							.where((page) => {
								const jFm = new FrontmatterJS(page);
								if (jFm.getProject() !== "mission") {
									return false;
								}

								const jAt = jFm.createdAt
									.toISOString()
									.slice(0, 10);
								if (curAt !== jAt) {
									return false;
								}

								return true;
							});

						if (pages.length === 0) {
							// create journal page
							const note = this.generate.journalEntry();
							note.then((file) => {
								active.openFile(file, { active: true });
							});
							return;
						} else {
							const children =
								this.app.vault.getAbstractFileByPath(
									pages[0].file.path,
								);
							Assert.True(
								!Helper.nilCheck(children),
								`goto-children: Unexpected undefined file: ${pages[0].file.path}`,
							);
							active.openFile(children);
							return;
						}
					} else {
						const pages = this.dv
							.pages(`"${Paths.Logs}/${curFm.uuid}"`)
							.sort((k) => k.created_at, "desc");
						if (pages.length === 0) {
							return;
						}

						const children = this.app.vault.getAbstractFileByPath(
							pages[0].file.path,
						);
						Assert.True(
							!Helper.nilCheck(children),
							`goto-children: Unexpected undefined file: ${pages[0].file.path}`,
						);
						active.openFile(children);
					}
				} else {
					console.error(
						"goto-children: Not Implemented outside Journal, Tasks",
					);
					return;
				}
			},
		});

		this.addCommand({
			id: "goto-parent",
			name: "Goto Parent",
			// @ts-ignore
			callback: () => {
				const file = this.getFileFromLeaf(
					this.app.workspace.activeLeaf,
				);
				if (file === undefined) {
					console.error("goto-parent: File is undefined");
					return;
				}

				const cache = this.getFileCacheFromLeaf(
					this.app.workspace.activeLeaf,
				);
				const fm = cache.frontmatter;
				if (fm === undefined) {
					console.error("goto-parent: Invalid FrontMatter");
					return;
				}

				const active = this.app.workspace.activeLeaf;
				const dir = file.path.split("/")[0];

				if (dir === Paths.Slipbox) {
					// @ts-ignore
					const parent = this.findFirstParentInDomains(file, cache);
					if (parent !== undefined) {
						const file = this.getFileFromUUID(
							parent.frontmatter.uuid,
						);
						active.openFile(file);
						// this.openInNewTabIfNotOpened(page);
					} else {
						active.openFile(
							this.app.vault.getAbstractFileByPath("Index.md"),
						);
					}
				} else if (dir === Paths.Logs) {
					const taskId = file.path.split("/")[1];
					Assert.True(
						taskId !== undefined,
						`Invalid logDir: ${file.path}`,
					);
					const task = this.app.vault.getAbstractFileByPath(
						`${Paths.Tasks}/${fm.parent_id}.md`,
					);
					if (Helper.nilCheck(task)) {
						console.error(`Undefined Task: ${taskId}`);
					} else {
						active.openFile(task);
					}
				} else if (dir === Paths.Tasks) {
					const page = { file: { frontmatter: fm, path: file.path } };
					const curFm = new FrontmatterJS(page);
					const curAt = curFm.at.toISOString().slice(0, 10);
					if (curFm.getProject() === "daily") {
						const pages = this.dv
							.pages(`"${Paths.Journal}"`)
							.where((page) => {
								const jFm = new FrontmatterJS(page);
								if (jFm.getProject() !== "mission") {
									return false;
								}

								const jAt = jFm.at.toISOString().slice(0, 10);
								if (curAt !== jAt) {
									return false;
								}

								return true;
							});
						if (pages.length === 0) {
							// create journal page
							console.log("Must create journal entry first");
							return;
						} else {
							throw new Error("Not Implemented");
						}
					} else {
						console.error(
							"goto-parent: Not Implemented for non-daily Task",
						);
						return;
					}
				} else if (dir === Paths.Journal) {
					const page = { file: { frontmatter: fm, path: file.path } };
					const curFm = new FrontmatterJS(page);
					const curAt = curFm.createdAt.toISOString().slice(0, 10);
					if (curFm.getProject() === "mission") {
						const pages = this.dv
							.pages(`"${Paths.Tasks}"`)
							.where((page) => {
								if (page.file.frontmatter.at === undefined) {
									return false;
								}

								const tFm = new FrontmatterJS(page);
								if (tFm.getProject() !== "daily") {
									return false;
								}

								const tAt = tFm.at.toISOString().slice(0, 10);
								if (curAt !== tAt) {
									return false;
								}

								return true;
							});

						Assert.True(
							pages.length === 1,
							`Non existant or non unique Task: ${pages.file.frontmatter.uuid}`,
						);
						const f = this.app.vault.getAbstractFileByPath(
							pages[0].file.path,
						);
						Assert.True(
							!Helper.nilCheck(f),
							`Unexpected non-existant Task: ${pages[0].file.path}`,
						);
						active.openFile(f);
					} else {
						console.error(
							"goto-parent: Not Implemented for non-mission Journal Entry",
						);
						return;
					}
				} else {
					console.error(
						"goto-parent: Not Implemented outside Index, Logs",
					);
					return;
				}
			},
		});

		this.addCommand({
			id: "goto-active-task",
			name: "Goto Active Task",
			// @ts-ignore
			callback: () => {
				// @ts-ignore
				const pages = this.dv
					.pages(`"${Paths.Tasks}"`)
					.where((page) => {
						if (page.file.frontmatter.status === "doing") {
							return true;
						}

						return false;
					});

				console.log(`found ${pages.length} active task(s)`);
				if (pages.length === 0) {
					return;
				}

				this.openInNewTabIfNotOpened(pages[0]);
			},
		});

		this.addCommand({
			id: "open-todays-daily",
			name: "Open Today's Daily",
			// @ts-ignore
			callback: () => {
				const now = new Date();
				const nowIso = now.toISOString().slice(0, 10);
				// @ts-ignore
				const pages = this.dv
					.pages(`"${Paths.Tasks}"`)
					.where((page) => {
						if (page.file.frontmatter.at === undefined) {
							return false;
						}

						// assign now si at === undefined
						const fm = new FrontmatterJS(page);
						if (fm.getProject() !== "daily") {
							return false;
						}

						let fmIso = undefined;
						try {
							fmIso = fm.at.toISOString().slice(0, 10);
						} catch {
							console.warn(`possible invalid data in ${fm.uuid}`);
							return false;
						}

						if (fmIso === nowIso) {
							return true;
						}

						return false;
					});

				if (pages.length === 0) {
					return;
				}

				this.openInNewTabIfNotOpened(pages[0]);
			},
		});

		this.addCommand({
			id: "gonext-generate-fleeting",
			name: "Generate fleeting note",
			// @ts-ignore
			callback: () => {
				this.generate.fleeting();
			},
		});

		this.addCommand({
			id: "safe-delete",
			name: "Safe Delete",
			// @ts-ignore
			callback: () => {
				const file = app.workspace.getActiveFile();
				const fm = app.metadataCache.getFileCache(file).frontmatter;
				if (fm === undefined) {
					return;
				}

				const rootPath = [
					`${Paths.Journal}.md`,
					`${Paths.Inbox}.md`,
					"Ad Hoc.md",
					"allDoneTasks.md",
					"allDoneTasksWithoutLog.md",
					"allMedia.md",
					"allProgressedTasks.md",
					"noteLocator.md",
					"Praxis.md",
				];
				for (const p of rootPath) {
					if (file.path === p) {
						return;
					}
				}

				// @ts-ignore
				if (
					// @ts-ignore
					file.path.split(0, Paths.Resources.length) ===
					// @ts-ignore
					Paths.Resources
				) {
					return;
				}

				console.log(`deleted file: ${file.path}`);
				app.vault.delete(file);
			},
		});

		this.addCommand({
			id: "display-modal",
			name: "Display modal",
			callback: () => {
				new ExampleModal(this.app).open();
			},
		});

		this.addCommand({
			id: "go-parent",
			name: "Go Parent",
			// @ts-ignore
			callback: () => {
				const file = app.workspace.getActiveFile();
				const fm = app.metadataCache.getFileCache(file).frontmatter;
				if (fm === undefined) {
					return;
				}

				if (fm.parent_id === undefined && fm.ref_id === undefined) {
					console.warn(
						`parent_id: '${fm.parent_id}' ref_id: '${fm.ref_id}'`,
					);
					return;
				}

				if (
					fm.type === undefined ||
					(fm.type !== Types.Log &&
						fm.type !== Types.Media &&
						fm.type !== Types.Fleeting)
				) {
					console.warn(
						`invalid type: '${fm.type}' for note: '${fm.uuid}'`,
					);
					return;
				}

				// https://docs.obsidian.md/Reference/TypeScript+API/Workspace/createLeafInParent
				// app.workspace.createLeafInParent();
				// const leaf = app.workspace.getLeaf(true);
				// parent id
				const parent =
					fm.type === Types.Log
						? `${Paths.Tasks}/${fm.parent_id}.md`
						: `${Paths.Refs}/${fm.ref_id}.md`;
				const page = app.vault.getAbstractFileByPath(parent);
				app.workspace.openLinkText(parent, "/", false);
			},
		});

		// hook pour mettre à jour les alias
		this.app.metadataCache.on(
			"changed",
			(file: TFile, data: string, cache: CachedMetadata) => {
				// console.log("metadataCache - changed");
				const fm = cache.frontmatter;
				if (fm.type === 2) {
					if (this.files[fm.uuid] !== undefined) {
						const [path, note] = this.files[fm.uuid];
						fm.alias = [path.join(" / ")];
					}
				}
			},
		);

		this.app.workspace.onLayoutReady(() => {
			console.log("workspace - layout-ready");
			// il semblerait que l'actuel probleme est que la fonction getFiles ne retourne pas tous les fichiers du vault, mais seulement ceux qui sont chargés
			if (this.vaultContent.length === 0) {
				this.vaultContent = this.app.vault.getFiles();
			}

			this.loadIndex();
		});
	}

	getIndexDomains() {
		const indexPath = this.app.vault.getAbstractFileByPath("Index.md");
		const index = this.app.metadataCache.getFileCache(indexPath);
		const domains = [];

		let start = undefined;
		let end = undefined;
		let found = false;

		// recherche du top level heading `## domains`
		for (const heading of index.headings) {
			if (heading.level === 2 && found) {
				end = heading.position.start.offset;
				break;
			} else if (heading.level === 2 && heading.heading === "domains") {
				start = heading.position.end.offset;
				found = true;
			}
		}

		// recherche des liens qui sont contenus dans les bornes du top level heading `## domains`
		for (const link of index.links) {
			const pos = link.position;
			if (pos.start.offset < start || pos.end.offset > end) {
				continue;
			}

			const indexContent = this.getFileCacheFromUUID(link.link);
			if (indexContent === undefined) {
				continue;
			}

			if (indexContent.headings.length < 2) {
				console.error(`Invalid Index: ${link.link}`);
				continue;
			}

			domains.push(indexContent);
		}

		return domains;
	}

	getDomainComponents(domains) {
		// recherche dans les index des domains respectifs s'il y a présence d'une entry `### patterns`
		// -> components
		const components = {};
		for (const domain of domains) {
			const name = domain.headings[1].heading;
			const start = domain.headings[1].position.end.offset;
			let end = 0;
			if (domain.headings[2] !== undefined) {
				end = domain.headings[2].position.start.offset;
			} else {
				end =
					domain.sections[domain.sections.length - 1].position.end
						.offset;
			}

			for (const component of domain.links) {
				if (
					component.position.start.offset < start ||
					component.position.end.offset > end
				) {
					continue;
				}

				if (components[name] === undefined) {
					components[name] = {};
				}

				const cache = this.getFileCacheFromUUID(
					this.extractUUIDFromLink(component.link),
				);

				const componentName = component.displayText;
				if (
					![
						"patterns",
						"concepts",
						"guidelines",
						"procedures",
						"material",
					].contains(componentName)
				) {
					continue;
				}

				if (components[name][componentName] === undefined) {
					components[name][componentName] = [];
				}

				if (cache.links === undefined || cache.links.length === 0) {
					continue;
				}

				for (const link of cache.links) {
					components[name][componentName].push(
						this.getFileCacheFromUUID(
							this.extractUUIDFromLink(link.link),
						),
					);
				}
			}
		}

		return components;
	}

	commonDataValidation(path: string[], note: CachedMetadata) {
		// pas d'acces au nom du fichier, au chemin avec le CachedMetadata
		// count de headings level 3 === 1
		const fm = note.frontmatter;
		Assert.True(
			fm !== undefined,
			`Invalid FrontMatter in: ${path.join("/")}`,
		);
		Assert.True(note.headings !== undefined, `Blank resource: ${fm.uuid}`);
	}

	getContentBoundaries(note: CachedMetadata) {
		// locate content offset
		const fm = note.frontmatter;
		let found = false;
		let start = 0;
		let end = 0;

		for (const heading of note.headings) {
			if (
				heading.level === 2 &&
				heading.heading.toLowerCase() === "content"
			) {
				found = true;
				start = heading.position.end.offset;
				continue;
			}
			// s'il y a un autre heading level 2 apres, end = start.offset
			if (
				found &&
				heading.level === 2 &&
				heading.heading.toLowerCase() !== "content"
			) {
				end = heading.position.start.offset;
			}
		}
		Assert.True(found, `Resource does not declares content: ${fm.uuid}`);
		// sinon end = end document
		if (end === 0) {
			end = note.sections[note.sections.length - 1].position.end.offset;
		}

		return [start, end];
	}

	getResourceName(note: CachedMetadata, start: number, end: number): string {
		let resourceName = "";
		let lvl3HeadingCount = 0;
		const fm = note.frontmatter;

		for (const heading of note.headings) {
			// heading lvl 3 in bound of `content`
			if (
				heading.level === 3 &&
				heading.position.start.offset > start &&
				heading.position.end.offset < end
			) {
				resourceName = heading.heading;
				lvl3HeadingCount++;
			}
		}

		// dans ## Content
		// un seul heading niveau 3
		// Assert.False(
		//   lvl3HeadingCount === 0,
		//   `Resource does not declares a name: ${fm.uuid}`,
		// );
		Assert.False(
			lvl3HeadingCount > 1,
			`Resource has multiple names: ${fm.uuid}`,
		);

		return resourceName;
	}

	parseComponentConcepts(path: string[], note: CachedMetadata, q, results) {
		this.commonDataValidation(path, note);
		const [start, end] = this.getContentBoundaries(note);
		const resourceName = this.getResourceName(note, start, end);
		const fm = note.frontmatter;

		results.push([[...path, resourceName], note]);

		// leaf
		if (note.links === undefined || note.links.length === 0) {
			return;
		}

		for (const link of note.links) {
			// link in bound content heading
			// should be name, but content boundaries are known and similar
			if (
				link.position.start.offset > start &&
				link.position.end.offset < end
			) {
				// there is an in bound link
				// resource is considered a node
				Assert.True(
					Helper.isUUID(link.link.slice(0, 36)),
					`Invalid link in resource: ${fm.uuid}`,
				);
				if (!Helper.isUUID(link.link.slice(0, 36))) {
					continue;
				}

				const f = this.getFileCacheFromUUID(
					this.extractUUIDFromLink(link.link),
				);
				// erreurs de formats passées sous silence
				// on ignore les lien vers les resources autre que Permanent
				if (
					f === undefined ||
					f.frontmatter === undefined ||
					f.frontmatter.type !== 2
				) {
					continue;
				}

				q.push([[...path, resourceName], f]);
			}
		}
		// utility link
		// detecter uuid
		// detecter link vers resource markdown
		// detecter link vers asset
		//
	}

	parseComponentPatterns(path: string[], note: CachedMetadata, q, results) {
		this.commonDataValidation(path, note);
		const [start, end] = this.getContentBoundaries(note);
		const resourceName = this.getResourceName(note, start, end);

		if (this.isSequence(note)) {
			// domain name / patterns / pattern name a / pattern name b / sequence name -> uuid | file cache | file path
			results.push([[...path, resourceName], note]);
			return;
		}

		if (note.links === undefined || note.links.length === 0) {
			return;
		}

		for (const link of note.links) {
			// link in bound nameHeading
			if (
				link.position.start.offset < start ||
				link.position.end.offset > end
			) {
				continue;
			}

			// console.log(link.link.slice(link.link.length-3, link.link.length))
			if (!Helper.isUUID(link.link.slice(0, 36))) {
				continue;
			}

			const f = this.getFileCacheFromUUID(
				this.extractUUIDFromLink(link.link),
			);

			if (
				f === undefined ||
				f.frontmatter === undefined ||
				f.frontmatter.type !== 2
			) {
				continue;
			}

			q.push([[...path, resourceName], f]);
		}
	}

	parseComponentTree(components, domainName, componentName) {
		const q = [];
		const results = [];

		if (components[domainName][componentName] === undefined) {
			return;
		}

		for (const pattern of components[domainName][componentName]) {
			q.push([[domainName, componentName], pattern]);
		}

		// les links doivent etre in bound dans `### name`
		while (q.length > 0) {
			const [path, note] = q.shift();
			// il y a un bug pour les concepts qui utilisent des liens inline vers d'autres resources dont elles ne sont pas un container direct
			// exemple pour une reference inline
			// avec le scheme actuel
			// le domain se trouve à l'index 0
			// le nom du component se trouve à l'index 1 du chemin
			Assert.True(path.length >= 2, `Invalid component path: ${path}`);
			// console.log(path);
			// console.log(note);
			// console.log("\n\n\n");

			const componentName = path[1];
			switch (componentName) {
				case "patterns":
					this.parseComponentPatterns(path, note, q, results);
					break;
				case "concepts":
					this.parseComponentConcepts(path, note, q, results);
					break;
				default:
					break;
				// console.log(`Unsuported component: ${componentName}`)
				// throw new Error(`Unsuported component: ${componentName}`);
			}
		}

		return results;
	}

	loadIndex() {
		console.log("gonext - loadIndex()");
		const domains = this.getIndexDomains();
		const components = this.getDomainComponents(domains);

		for (const domain of Object.keys(components)) {
			for (const component of Object.keys(components[domain])) {
				const results = this.parseComponentTree(
					components,
					domain,
					component,
				);
				if (results === undefined) {
					continue;
				}

				for (const [path, note] of results) {
					const fm = note.frontmatter;
					this.files[fm.uuid] = [path, note];
					if (fm.type === 2) {
						fm.alias = [path.join(" / ")];
					}
				}
			}
		}
	}

	findFirstParentInDomains(file: TAbstractFile, resource: CachedMetadata) {
		const domains = this.getIndexDomains();
		// const components = this.getDomainComponents(domains);
		const q = [];
		for (const domain of domains) {
			console.log(domain);
			q.push(domain);
		}

		while (q.length > 0) {
			const cur = q.pop();
			if (cur === undefined) {
				// special case for Index
				return undefined;
				return app.metadataCache.getFileCache(
					this.app.vault.getAbstractFileByPath("Index.md"),
				);
			}

			if (cur.links === undefined || cur.links.length === 0) {
				continue;
			}

			// console.log(cur)
			const [start, end] = this.getContentBoundaries(cur);
			for (const link of cur.links) {
				if (link.link.length !== 36) {
					continue;
				}
				// Assert.True(link.link.length === 36, `Non 36 length link: ${link.link}`)

				const pos = link.position;
				if (pos.start.offset < start || pos.end.offset > end) {
					continue;
				}

				if (link.link === resource.frontmatter.uuid) {
					return cur;
				} else {
					q.push(this.getFileCacheFromUUID(link.link));
				}
			}
		}
	}

	isSequence(note: CachedMetadata): boolean {
		Assert.True(
			note.headings.length > 0,
			`isSequence: Invalid parameter: note: ${note.frontmatter.uuid}`,
		);
		for (const heading of note.headings) {
			if (heading.level === 4 && heading.heading === "steps") {
				return true;
			}
		}

		return false;
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
}

export class ExampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		// @ts-ignore
		const dv = this.app.plugins.plugins.dataview.api;
		const tasks = dv.pages().array().slice(0, 10);
		let s = "";
		for (const task of tasks) {
			s += `${task.file.path}\n\n`;
		}
		contentEl.setText(s);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
