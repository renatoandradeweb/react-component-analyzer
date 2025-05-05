import { Module } from '@nestjs/common';
import { AnalyzerModule } from './analyzer/analyzer.module';

@Module({
  imports: [AnalyzerModule],
})
export class AppModule {}
