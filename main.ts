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
	AutoField,
	// @ts-ignore
	DvLib,
} from "./api";
// @ts-ignore
import { Paths, Status, Types, Namespace, Default } from "./constants";
const { randomUUID } = require("crypto");

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

	// reviewLog() {
	// 	const fm = this.getCurrentFrontmatter();
	// 	if (fm === undefined) {
	// 		return;
	// 	}
	//
	// 	if (fm.type === undefined) {
	// 		// console.warn(`file: ${fm} does not have a valid schema`);
	// 		return;
	// 	}
	//
	// 	if (fm.type !== 6) {
	// 		// console.warn(`file: ${fm} is not of "log" type`);
	// 		return;
	// 	}
	//
	// 	const currentReviewed = fm.reviewed;
	// 	// obsidian plugin API, write file on disk, frontmatter changed
	// }

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

		this.taskInStatusBar = this.addStatusBarItem();
		this.taskInStatusBar.setText("");

		// console.log(window.app);
		// this.statusBar = this.app.createDiv();
		// this.statusBar.innerHTML = "";
		// this.app.dom.statusBarEl.appendChild(el);

		this.app.workspace.on("active-leaf-change", () => {
			// const activeTasks = this.dv
			// 	.pages(`"813 Tasks"`)
			// 	.where((fm) => fm.status === "doing");
			// this.taskInStatusBar.setText(`${activeTasks.length} active`);

			// @ts-ignore
			const leaf = app.workspace.activeLeaf;
			// @ts-ignore
			const tabTitleOrig = leaf.tabHeaderInnerTitleEl.innerText;
			// @ts-ignore
			if (tabTitleOrig.length !== 36) {
				// console.warn("'tabTitleOrig.length' !== 36");
				return;
			}

			// @ts-ignore
			const fm = this.frontmatter.getCurrentFrontmatter();
			// @ts-ignore
			if (fm === undefined) {
				return undefined;
			}

			// @ts-ignore
			const alias = fm.alias;
			// @ts-ignore
			if (Helper.nilCheck(alias) || alias === "") {
				return;
			}

			// @ts-ignore
			leaf.tabHeaderInnerTitleEl.innerText = alias;
			// @ts-ignore
			leaf.tabHeaderInnerTitleEl.innerHTML = alias;

			// app.workspace.activeLeaf.containerEl.children -> html, good luck pour retrouver la bonne div
			// this.statusBarEl.setText("coucou");
			// this.addStatusBarItem().createEl("span", { text: "Hello from the status bar 👋" });
		});

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "gonext-utils-copy-current-file-uuid",
			name: "Copy current file UUID",
			// @ts-ignore
			editorCallback: (editor: Editor, view: MarkdownView) => {
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

		// this.addCommand({
		// 	id: "gonext-generate-fleeting",
		// 	name: "Generate fleeting note",
		// 	// @ts-ignore
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		const dt = new Date();
		// 		var note = {
		// 			uuid: randomUUID(),
		// 			type: 13,
		// 			version: "0.0.4",
		// 			created_at: dt.toISOString(),
		// 			path: "",
		// 			data: "",
		// 		}
		// 		
		// 		note.path = `800 Inbox/${note.uuid}.md`;
		// 		note.data = `---\ntype: 13\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\nversion: "0.0.4"\n---\n## Content\n`;
		//
		// 		const f = app.vault.create(note.path, note.data).then((f) => {
		// 			return f;
		// 		});
		//
		// 		// const newLeaf = this.app.workspace.splitActiveLeaf();
		// 		// app.workspace.openLinkText(note.path, "/", true, newLeaf).then(() => {});
		// 		// revealLeaf(leaf: WorkspaceLeaf): Promise<void>;
		// 		const active = app.workspace.activeLeaf;
		// 		// @ts-ignore
		// 		const root = active.parent;
		// 		app.workspace.createLeafInParent(root, root.children.length+1);
		// 		const leaf = root.children[root.children.length-1];
		// 		// createLeafInParent(parent: WorkspaceSplit, index: number): WorkspaceLeaf;
		// 		// setActiveLeaf(leaf: WorkspaceLeaf, params?: {focus?: boolean;}): void;
		// 		f.then((file) => {leaf.openFile(file, {active: true})});
		// 		// WorkspaceLeaf.openFile()
		// 		// openFile(file: TFile, openState?: OpenViewState): Promise<void>;
		// 	},
		// });

		this.addCommand({
			id: "safe-delete",
			name: "Safe Delete",
			// @ts-ignore
			editorCallback: (editor: Editor, view: MarkdownView) => {
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
			editorCallback: (editor: Editor, view: MarkdownView) => {
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
