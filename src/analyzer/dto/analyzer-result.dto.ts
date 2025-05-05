export class AnalyzerResultDto {
  files: {
    path: string;
    components: {
      name: string;
      type?: string; // Novo campo
      imports: {
        name: string;
        source: string;
      }[];
    }[];
  }[];
}