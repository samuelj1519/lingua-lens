/** Minimal shape of `ConfigurationInspect` for unit tests without loading vscode. */
export interface ConfigurationInspect<T> {
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
}
