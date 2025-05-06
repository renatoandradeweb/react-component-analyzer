export interface ImportInfo {
  name: string;
  source: string;
  id?: string;
}

export interface Component {
  name: string;
  imports: ImportInfo[];
}

export interface FileAnalysisResult {
  filePath: string;
  components: Component[];
}
