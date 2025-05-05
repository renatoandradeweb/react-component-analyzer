import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AnalyzerService } from './analyzer.service';
import { AnalyzerResultDto } from './dto/analyzer-result.dto';
import * as path from 'path';
import * as fs from 'fs';

@Controller('analyzer')
export class AnalyzerController {
  constructor(private readonly analyzerService: AnalyzerService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype !== 'application/zip' &&
          !file.originalname.endsWith('.zip')
        ) {
          return cb(
            new BadRequestException('Apenas arquivos ZIP são permitidos'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  @Post('upload')
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<AnalyzerResultDto> {
    const result = await this.analyzerService.analyzeProject(file.path);

    //console.log('JSON final:', JSON.stringify(result, null, 2));

    return result;
  }
}