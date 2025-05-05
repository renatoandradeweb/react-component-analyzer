import { Injectable, Logger } from '@nestjs/common';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { FileExtractorService } from './services/file-extractor/file-extractor.service';
import { TreeSitterService } from './services/tree-sitter/tree-sitter.service';
import { ComponentDetectorService } from './services/component-detector/component-detector.service';
import { ImportAnalyzerService } from './services/import-analyzer/import-analyzer.service';
import { AnalyzerResult } from './interfaces/analyzer-result.interface';
import { FileAnalysisResult } from './interfaces/component.interface';
import { AnalyzerResultDto } from './dto/analyzer-result.dto';

@Injectable()
export class AnalyzerService {
  private readonly logger = new Logger(AnalyzerService.name);

  constructor(
    private readonly fileExtractorService: FileExtractorService,
    private readonly treeSitterService: TreeSitterService,
    private readonly componentDetectorService: ComponentDetectorService,
    private readonly importAnalyzerService: ImportAnalyzerService,
  ) {}

  // Analisa um projeto React e retorna informações sobre componentes
  async analyzeProject(zipPath: string): Promise<AnalyzerResultDto> {
    try {
      // Ler arquivo ZIP como buffer
      const zipBuffer = await fsPromises.readFile(zipPath);

      // Extrair o arquivo ZIP
      const extractPath = await this.fileExtractorService.extractZip(zipBuffer);

      // Encontrar arquivos React
      const reactFiles = await this.fileExtractorService.extractFilePaths(extractPath);
      this.logger.log(`Encontrados ${reactFiles.length} arquivos React para análise`);

      // Analisar cada arquivo
      const result: AnalyzerResult = { files: [] };

      for (const file of reactFiles) {
        try {
          const fileResult = await this.analyzeFile(file);

          // Modificação: adicionar arquivo mesmo sem componentes
          if (fileResult.components.length === 0) {
            const fileName = path.basename(file, path.extname(file));
            const componentName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
            const fileType = this.detectFileType(file);

            fileResult.components.push({
              name: componentName,
              type: fileType,
              imports: [],
            });
          }

          result.files.push(fileResult);
        } catch (error) {
          this.logger.error(`Erro ao analisar arquivo ${file}: ${error.message}`);
        }
      }

      // Converter para DTO
      const resultDto = this.mapToDto(result);

      // Limpar arquivos temporários (async)
      setTimeout(() => {
        this.fileExtractorService.cleanupFiles(extractPath);
      }, 5000);

      return resultDto;
    } catch (error) {
      this.logger.error(`Erro durante análise do projeto: ${error.message}`);
      throw error;
    }
  }

  private detectFileType(filePath: string): string {
    const normalizedPath = filePath.replace(/\\/g, '/');

    if (normalizedPath.includes('/hooks/')) {
      return 'hook';
    } else if (normalizedPath.includes('/pages/')) {
      return 'page';
    } else if (normalizedPath.includes('/components/')) {
      return 'component';
    } else {
      const fileName = path.basename(filePath).toLowerCase();
      if (fileName.includes('config')) {
        return 'config';
      }
      return 'other';
    }
  }

  // Analisa um único arquivo React
  private async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
    try {
      const fileResult: FileAnalysisResult = { filePath, components: [] };

      // Analisar o arquivo com Tree-sitter
      const tree = this.treeSitterService.parseFile(filePath);

      if (!tree) {
        this.logger.error(`Não foi possível analisar o arquivo ${filePath}`);
        return fileResult;
      }

      // Detectar componentes
      const components = this.componentDetectorService.detectComponents(filePath, tree);
      fileResult.components = components;

      // Analisar importações se houver componentes
      if (components.length > 0) {
        this.importAnalyzerService.analyzeImports(tree.rootNode, components, filePath);
      }

      return fileResult;
    } catch (error) {
      this.logger.error(`Erro ao analisar arquivo ${filePath}: ${error.message}`);
      return { filePath, components: [] };
    }
  }

  // Mapeia o resultado para o DTO
  private mapToDto(result: AnalyzerResult): AnalyzerResultDto {
    const dto = new AnalyzerResultDto();
    dto.files = result.files.map(file => {
      const components = file.components.map(component => ({
        name: component.name,
        type: component.type || 'component',
        imports: component.imports,
      }));

      return { path: file.filePath, components };
    });

    this.logger.debug(`DTO gerado com ${dto.files.length} arquivos`);
    return dto;
  }
}
