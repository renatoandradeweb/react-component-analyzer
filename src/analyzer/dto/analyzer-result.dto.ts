export class AnalyzerResultDto {
  files: {
    path: string;
    components: {
      name: string;
      imports: {
        name: string;
        source: string;
      }[];
    }[];
  }[];
}
