export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  entryPoint: string;
  permissions?: string[];
};

export interface PluginRegistry {
  list(): Promise<PluginManifest[]>;
  get(pluginId: string): Promise<PluginManifest | null>;
}

export class DisabledPluginRegistry implements PluginRegistry {
  async list(): Promise<PluginManifest[]> {
    return [];
  }

  async get(): Promise<PluginManifest | null> {
    return null;
  }
}
