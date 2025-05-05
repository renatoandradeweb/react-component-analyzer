import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { createReadStream } from 'fs';

@Injectable()
export class FileExtractorService {
  private readonly logger = new Logger(FileExtractorService.name);

  // Extrai um arquivo ZIP para um diretório temporário
  async extractZip(zipPath: string): Promise<string> {
    const extractPath = path.join(process.cwd(), 'temp', `extract_${Date.now()}`);

    // Garantir que o diretório existe
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'));
    }

    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    this.logger.log(`Extraindo arquivo ZIP para ${extractPath}`);

    await createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    return extractPath;
  }

  // Encontra todos os arquivos React no diretório extraído
  findReactFiles(dir: string): string[] {
    const reactFiles: string[] = [];

    const traverse = (currentDir: string) => {
      this.logger.log(`Verificando diretório: ${currentDir}`);
      try {
        const files = fs.readdirSync(currentDir);

        for (const file of files) {
          const filePath = path.join(currentDir, file);

          try {
            const stat = fs.statSync(filePath);

            this.logger.log(`Encontrado: ${filePath}, é diretório: ${stat.isDirectory()}`);

            if (stat.isDirectory() && !file.startsWith('node_modules') && !file.startsWith('.') && !file.startsWith('__MACOSX')) {
              traverse(filePath);
            } else if (stat.isFile() && this.isReactFile(file)) {
              this.logger.log(`Arquivo React encontrado: ${filePath}`);
              reactFiles.push(filePath);
            }
          } catch (error) {
            this.logger.error(`Erro ao processar o arquivo ${filePath}: ${error.message}`);
          }
        }
      } catch (error) {
        this.logger.error(`Erro ao ler o diretório ${currentDir}: ${error.message}`);
      }
    };

    traverse(dir);
    this.logger.log(`Total de arquivos React encontrados: ${reactFiles.length}`);
    return reactFiles;
  }

  // Verifica se o arquivo pode conter componentes React
  private isReactFile(filename: string): boolean {
    const extensions = ['.jsx', '.tsx', '.js', '.ts'];
    const ext = path.extname(filename).toLowerCase();
    const isReactFile = extensions.includes(ext);
    if (isReactFile) {
      this.logger.log(`${filename} é um arquivo React válido`);
    }
    return isReactFile;
  }

  // Limpa os arquivos temporários
  cleanupFiles(extractPath: string): void {
    try {
      fs.rmSync(extractPath, { recursive: true, force: true });
      this.logger.log(`Arquivos temporários removidos: ${extractPath}`);
    } catch (error) {
      this.logger.error(`Erro ao remover arquivos temporários: ${error.message}`);
    }
  }
}
