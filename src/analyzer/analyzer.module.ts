import { Module } from '@nestjs/common';
import { AnalyzerController } from './analyzer.controller';
import { AnalyzerService } from './analyzer.service';
import { FileExtractorService } from './services/file-extractor/file-extractor.service';
import { TreeSitterService } from './services/tree-sitter/tree-sitter.service';
import { ComponentDetectorService } from './services/component-detector/component-detector.service';
import { ImportAnalyzerService } from './services/import-analyzer/import-analyzer.service';

@Module({
  controllers: [AnalyzerController],
  providers: [
    AnalyzerService,
    FileExtractorService,
    TreeSitterService,
    ComponentDetectorService,
    ImportAnalyzerService,
  ],
})
export class AnalyzerModule {}