export interface ImportInfo {
  name: string;
  source: string;
  id?: string;
}

export interface Component {
  name: string;
  imports: ImportInfo[];
  type?: string;
}

export interface FileAnalysisResult {
  filePath: string;
  components: Component[];
}
