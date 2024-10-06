export function get_active_file(app) {
    return app.workspace.activeEditor?.file ?? app.workspace.getActiveFile();
}

/**
 * @param path Normalized file path
 * @returns Folder path
 * @example
 * get_folder_path_from_path(normalizePath("path/to/folder/file", "md")) // path/to/folder
 */
export function get_folder_path_from_file_path(path: string) {
    const path_separator = path.lastIndexOf("/");
    if (path_separator !== -1) return path.slice(0, path_separator);
    return "";
}

