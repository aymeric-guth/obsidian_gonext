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
  Assert,
} from "./api";
// @ts-ignore
import { Paths, Status, Types, Namespace, Default } from "./constants";

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
  listMaker: ListMaker;
  frontmatter: Frontmatter;
  generate: Generator;
  vaultContent: TFile[] = [];
  vaultContentDict: { [id: string]: TFile } = {};

  openViewInNewTabIfNotOpened(name: string) {
    const f = app.vault.getAbstractFileByPath(name);
    if (f === undefined || f === null) {
      console.warn(`file not found ${name}`);
      return;
    }

    const active = this.app.workspace.activeLeaf;
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

    node.openFile(f, {
      active: true,
    });
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
      if (file === undefined || file === null) {
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
      file = leaf.view.file;
    } catch {
      return undefined;
    }
    if (file === undefined || file === null) {
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

    const [start, end] = this.getContentBoundaries(cache);
    // what is the naming preference?
    // alias > name heading
    let targetName = undefined;
    const nameHeading = this.getResourceName(cache, start, end);

    const fm = cache.frontmatter;

    if (fm.alias !== undefined) {
      if (Array.isArray(fm.alias) && fm.alias.length > 0) {
        // problem atheists?
        targetName = cache.frontmatter.alias[0];
      } else {
        targetName = cache.frontmatter.alias;
      }
    } else {
      targetName = nameHeading;
    }

    const file = this.getFileFromUUID(_id);
    if (file === undefined) {
      console.error(`grugAlias: Cannot grug this id: ${_id}`);
      return "";
    }
    const path = `${file.path.split("/").slice(0, -1)}/${_id}`;

    return `[[${path}#${nameHeading}|${targetName}]]`;
  }

  getFileFromUUID(_id: string): TAbstractFile {
    return this.vaultContentDict[_id];
  }

  getFileCacheFromUUID(_id: string): CachedMetadata {
    const f = this.vaultContentDict[_id];
    if (f === undefined) {
      return undefined;
    }

    return app.metadataCache.getFileCache(f);
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
    // @ts-ignore
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
      FrontmatterJS: FrontmatterJS,
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

    // this.addRibbonIcon("GoNextIcon", "[g]o[n]ext", async () => {
    //   this.generate.fleeting();
    // });

    this.addCommand({
      id: "open-index",
      name: "Open Index",
      // @ts-ignore
      callback: () => {
        this.openViewInNewTabIfNotOpened("INDEX.md");
      },
    });
    this.addCommand({
      id: "open-inbox",
      name: "Open Inbox",
      // @ts-ignore
      callback: () => {
        this.openViewInNewTabIfNotOpened("INBOX.md");
        // app.commands.executeCommandById('markdown:toggle-preview');
      },
    });
    this.addCommand({
      id: "open-projects",
      name: "Open Projects",
      // @ts-ignore
      callback: () => {
        this.openViewInNewTabIfNotOpened(
          "803 Slipbox/664dc855-eabe-40dc-90b8-006223457953.md",
        );
      },
    });
    this.addCommand({
      id: "open-planning",
      name: "Open Planning",
      // @ts-ignore
      callback: () => {
        this.openViewInNewTabIfNotOpened("Planning.md");
      },
    });
    this.addCommand({
      id: "open-journal",
      name: "Open Journal",
      // @ts-ignore
      callback: () => {
        this.openViewInNewTabIfNotOpened(
          "803 Slipbox/67fb49c2-05d1-48be-98ce-27b269660957.md",
        );
      },
    });
    this.addCommand({
      id: "open-next_actions",
      name: "Open Next Actions",
      // @ts-ignore
      callback: () => {
        this.openViewInNewTabIfNotOpened("NEXT ACTIONS.md");
      },
    });
    this.addCommand({
      id: "open-someday_maybe",
      name: "Open Someday Maybe",
      // @ts-ignore
      callback: () => {
        this.openViewInNewTabIfNotOpened("SOMEDAY MAYBE.md");
      },
    });
    this.addCommand({
      id: "open-waiting_for",
      name: "Open Waiting For",
      // @ts-ignore
      callback: () => {
        this.openViewInNewTabIfNotOpened("WAITING FOR.md");
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
        const pages = this.dv
          .pages(`"${Paths.Slipbox}"`)
          .where((page) => {
            const fm = new FrontmatterJS(page);
            const cache = this.getFileCacheFromUUID(fm.uuid);
            const [start, end] = this.getContentBoundaries(cache);
            if (start === 0 && end === 0) {
              return false;
            }
            const nameHeading = this.getResourceName(
              cache,
              start,
              end,
            );
            // console.log(`nameHeading: ${nameHeading}`);

            if (nameHeading === undefined) {
              return false;
            }
            if (nameHeading !== nowIso) {
              return false;
            }
            // this.getResourceName
            return true;
          });

        if (pages.length === 0) {
          // create permanent
          this.generate.permanent(nowIso);
          return;
        }

        this.openInNewTabIfNotOpened(pages[0]);
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
        // @ts-ignore
        const pages = this.dv
          .pages(`"${Paths.Slipbox}"`)
          .where((page) => {
            const fm = new FrontmatterJS(page);
            const cache = this.getFileCacheFromUUID(fm.uuid);
            const [start, end] = this.getContentBoundaries(cache);
            if (start === 0 && end === 0) {
              return false;
            }
            const nameHeading = this.getResourceName(
              cache,
              start,
              end,
            );
            if (nameHeading === undefined) {
              return false;
            }
            if (nameHeading !== nowIso) {
              return false;
            }
            // this.getResourceName
            return true;
          });

        if (pages.length === 0) {
          return;
        }

        this.openInNewTabIfNotOpened(pages[0]);
      },
    });

    this.addCommand({
      id: "list-index-content",
      name: "List Index Content",
      // @ts-ignore
      callback: () => {
        // @ts-ignore
        const abstractPath =
          this.app.vault.getAbstractFileByPath("INDEX.md");
        // @ts-ignore
        const cache = this.app.metadataCache.getFileCache(abstractPath);
        for (const link of cache.links) {
          console.log(link.displayText);
        }
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
      id: "open-tomorrows-daily",
      name: "Open Tomorrow's Daily",
      // @ts-ignore
      callback: () => {
        const now = new Date();
        now.setDate(now.getDate() + 1);
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
      id: "open-yesterdays-daily",
      name: "Open Yesterday's Daily",
      // @ts-ignore
      callback: () => {
        const now = new Date();
        now.setDate(now.getDate() - 1);
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
      id: "generate-note",
      name: "Generate Note",
      // @ts-ignore
      callback: () => {
        this.generate.permanent();
      },
    });

    this.addCommand({
      id: "generate-action",
      name: "Generate Action",
      // @ts-ignore
      callback: () => {
        this.generate.daily();
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
          const rootDir = file.path.split("/")[0];
          const authorized = [Paths.Slipbox, Paths.Refs];
          if (rootDir !== undefined && authorized.contains(rootDir)) {
            const alias = this.grugAlias(_id);
            // navigator.clipboard.writeText(alias).then(() => {console.log("coucou, etc etc")});
            // @ts-ignore
            const activeLeaf = this.app.workspace.activeLeaf;
            // @ts-ignore
            if (activeLeaf) {
              // @ts-ignore
              const editor = activeLeaf.view.sourceMode.cmEditor;
              const cursor = editor.getCursor();
              editor.replaceRange(alias, cursor);
            }
          } else {
            console.log(
              `Does not work outside slibe-box, got ${file.path}`,
            );
            return;
          }
        });
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
        console.log("on changed")
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
    const root = app.workspace.getLeaf().parent;

    for (const leaf of root.children) {
      const file = leaf.view.file;
      if (file === undefined) {
        continue;
      }

      // @ts-ignore
      const cache = app.metadataCache.getFileCache(file);
      // @ts-ignore
      const fm = cache.frontmatter;
      if (fm === undefined) {
        continue;
      }

      let text = "";

      if (fm.type === undefined) {
        console.warn(`type undefined for fm: ${fm}`)
        return
      }

      if (fm.type === 3 && Helper.getProject(fm) === "project/daily") {
        const at = new Date(fm.at);
        text = `${dayShort[at.getDay()]}. ${at.getDate()} ${monthShort[at.getMonth()]}`;
      } else if (fm.type === 2 || fm.type === 1) {
        if (!Helper.nilCheck(fm.alias)) {
          if (typeof(fm.alias) === "string") {
            text = fm.alias;
          } else {
            for (const alias of fm.alias) {
              if (text.length === 0 || alias.length < text.length) {
                text = alias;
              }
            }
          }
        } else {
          const [start, end] = this.getContentBoundaries(cache);
          // what is the naming preference?
          // alias > name heading
          const name = this.getResourceName(cache, start, end);
          text = name;
        }
      } else {
      }

      text = text === "" ? fm.uuid : text;

      if (fm.type === 1) {
        text = `(V) ${text}`;
      } else if (fm.type === 2) {
        text = `(N) ${text}`;
      } else if (fm.type === 3) {
        text = `(A) ${text}`;
      } else {
      }

     // @ts-ignore
     leaf.tabHeaderInnerTitleEl.innerText = text;
     // @ts-ignore
     leaf.tabHeaderInnerTitleEl.innerHTML = text;
    }
  }

  getContentBoundaries(note: CachedMetadata) {
    // locate content offset
    let fm = undefined;
    try {
      fm = note.frontmatter;
    } catch {
      return [0, 0];
    }
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

    for (const heading of note.headings) {
      // heading lvl 3 in bound of `content`
      if (
        heading.level === 3 &&
        heading.position.start.offset > start &&
        heading.position.end.offset < end
      ) {
        resourceName = heading.heading;
        break;
      }
    }

    // dans ## Content
    // un seul heading niveau 3
    // Assert.False(
    //   lvl3HeadingCount === 0,
    //   `Resource does not declares a name: ${fm.uuid}`,
    // );
    // Assert.False(
    //   lvl3HeadingCount > 1,
    //   `Resource has multiple names: ${fm.uuid}`,
    // );

    return resourceName;
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
