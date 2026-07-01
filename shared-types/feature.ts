export interface FeatureManifest {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  adminRoute?: string;
}