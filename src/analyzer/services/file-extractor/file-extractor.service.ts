import { Injectable, Logger } from '@nestjs/common';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import * as fg from 'fast-glob';

@Injectable()
export class FileExtractorService {
  private readonly logger = new Logger(FileExtractorService.name);

  /**
   * Descompacta o buffer ZIP recebido em um diretório temporário
   * e retorna o caminho absoluto onde os arquivos foram extraídos.
   */
  async extractZip(buffer: Buffer): Promise<string> {
    const extractRoot = path.join(__dirname, '..', '..', 'temp', `extract_${Date.now()}`);
    await fsPromises.mkdir(extractRoot, { recursive: true });

    const zipStream = unzipper.Parse();
    zipStream.on('entry', async entry => {
      // Ignora diretórios
      if (entry.type === 'Directory') {
        entry.autodrain();
        return;
      }
      const filePath = path.join(extractRoot, entry.path);
      const dir = path.dirname(filePath);
      await fsPromises.mkdir(dir, { recursive: true });
      entry.pipe(fs.createWriteStream(filePath));
    });
    zipStream.on('error', err => {
      this.logger.error('Erro ao descompactar ZIP', err);
      throw err;
    });

    // Iniciar a extração
    zipStream.end(buffer);

    // Aguarda o término da extração
    await new Promise<void>(resolve => zipStream.on('close', () => resolve()));
    this.logger.log(`ZIP extraído em: ${extractRoot}`);
    return extractRoot;
  }

  /**
   * Remove recursivamente o diretório de extração após o processamento.
   */
  async cleanupFiles(extractPath: string): Promise<void> {
    await fsPromises.rm(extractPath, { recursive: true, force: true });
    this.logger.log(`Diretório removido: ${extractPath}`);
  }

  /**
   * Varre recursivamente todo o diretório de extração
   * e retorna todos os arquivos .js, .jsx, .ts e .tsx encontrados.
   */
  async extractFilePaths(extractRoot: string): Promise<string[]> {
    const pattern = path.join(extractRoot, '**/*.{js,jsx,ts,tsx}');
    this.logger.log(`Procurando arquivos com o pattern: ${pattern}`);

    // fast-glob aceita array de padrões
    const files = await fg([pattern], {
      onlyFiles: true,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.*/**'],
    });

    this.logger.log(`Total de arquivos encontrados: ${files.length}`);
    return files;
  }
}
