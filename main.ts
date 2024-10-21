// @ts-ignore
import {
	App,
	Modal,
	Plugin,
	Workspace,
	// @ts-ignore
	HTMLElement,
	MarkdownView,
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
} from "./api";
// @ts-ignore
import { Paths, Status, Types, Namespace, Default } from "./constants";
// import { randomUUID } from "crypto";
// const { randomUUID } = require("crypto");
import { v4 as uuidv4 } from "uuid";

// Remember to rename these classes and interfaces!
interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

// représente la vue actuelle, l'onglet actif, le focus
// contient une ref au frontmatter qui est preprocess,
// ie champs fm.project, fm.area, ... sont populés
class Current {
	constructor() { }
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

	printCoucou() {
		console.log("Couou, tu veux voir ma bite?");
	}

	openInNewTabIfNotOpened(page) {
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

	getFileCacheFromLeaf(leaf) {
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
			// console.log(`Helper.getProject(fm): ${Helper.getProject(fm)}`);

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
		this.metadataCache = app.metadataCache;
		this.workspace = app.workspace;
		// @ts-ignore
		this.dv = app.plugins.plugins.dataview.api;
		// @ts-ignore
		this.frontmatter = new Frontmatter(this);
		this.listMaker = new ListMaker(this, this.dv, this.frontmatter);

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
		};

		// @ts-ignore
		window.gonext = {
			// @ts-ignore
			state: window.gonext?.state ?? {},
			// @ts-ignore
			app: this.app,
		};

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

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "gonext-utils-copy-current-file-uuid",
			name: "Copy current file UUID",
			// @ts-ignore
			callback: () => {
				// @ts-ignore
				const fm = this.gonext.getCurrentFrontmatter();
				// @ts-ignore
				if (fm === undefined) {
					// console.warn(
					// 	"Current file does not have a valid `frontmatter`",
					// );
					return;
				}

				if (fm.uuid == undefined) {
					// console.warn("Current file does not have a valid `UUID`");
					return;
				}

				// console.log("editor callback function");
				// console.log(editor.getSelection());
				// editor.replaceSelection('Sample Editor Command');
			},
		});

		this.addCommand({
			id: "gonext-generate-fleeting",
			name: "Generate fleeting note",
			// @ts-ignore
			callback: () => {
				const dt = new Date();
				const note = {
					uuid: uuidv4(),
					type: 13,
					version: "0.0.4",
					created_at: dt.toISOString(),
					path: "",
					data: "",
				};

				note.path = `800 Inbox/${note.uuid}.md`;
				note.data = `---\ntype: 13\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\nversion: "0.0.4"\n---\n## Content\n`;

				const f = this.app.vault
					.create(note.path, note.data)
					.then((f) => {
						return f;
					});
				const active = this.app.workspace.activeLeaf;
				// @ts-ignore
				const root = active.parent;
				this.app.workspace.createLeafInParent(
					root,
					root.children.length + 1,
				);
				const leaf = root.children[root.children.length - 1];
				f.then((file) => {
					leaf.openFile(file, { active: true });
				});
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
