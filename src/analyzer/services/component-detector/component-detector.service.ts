import { Injectable, Logger } from '@nestjs/common';
import { TreeSitterService } from '../tree-sitter/tree-sitter.service';
import { Component } from '../../interfaces/component.interface';
import * as path from 'path';
import { groupCaptures } from '@utils/tree-sitter-utils';

@Injectable()
export class ComponentDetectorService {
  private readonly logger = new Logger(ComponentDetectorService.name);

  constructor(private readonly treeSitterService: TreeSitterService) {}

  // Detecta componentes React em um arquivo
  detectComponents(filePath: string, tree: any): Component[] {
    try {
      if (!tree) {
        this.logger.error(`Árvore inválida para ${filePath}`);
        return [];
      }

      const components: Component[] = [];

      // Detectar componentes de classe
      this.detectClassComponents(tree, components);

      // Detectar componentes funcionais
      this.detectFunctionComponents(tree, components);

      // Detectar componentes arrow function
      this.detectArrowFunctionComponents(tree, components);

      // Se nenhum componente foi encontrado, verificar exportações padrão
      if (components.length === 0) {
        this.detectDefaultExports(tree, components, filePath);
      }

      this.logger.log(`Componentes detectados em ${filePath}: ${components.map(c => c.name).join(', ')}`);

      return components;
    } catch (error) {
      this.logger.error(`Erro ao detectar componentes em ${filePath}: ${error.message}`);
      return [];
    }
  }

  // Detecta componentes de classe React
  private detectClassComponents(tree: any, components: Component[]): void {
    const classComponentQuery = `
  (class_declaration
    name: (identifier) @class_name
    body: (class_body
      (method_definition
        name: (property_identifier) @method_name)))
`;

    try {
      const captures = this.treeSitterService.executeQuery(tree, classComponentQuery);
      this.logger.debug(`Capturas para componentes de classe: ${captures.length}`);

      // Agrupar capturas pelo padrão
      const groups = groupCaptures(captures);

      for (const group of groups) {
        const name = group.find(capture => capture.name === 'name')?.node.text;
        const object = group.find(capture => capture.name === 'object')?.node.text;
        const component = group.find(capture => capture.name === 'component')?.node.text;
        const react = group.find(capture => capture.name === 'react')?.node.text;

        // Verificar se é um componente React
        if (name && ((object === 'React' && component === 'Component') || react === 'Component')) {
          components.push({
            name,
            imports: []
          });
          this.logger.log(`Componente de classe detectado: ${name}`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao detectar componentes de classe: ${error.message}`);
    }
  }

  //Detecta componentes funcionais React
  private detectFunctionComponents(tree: any, components: Component[]): void {
    const functionComponentQuery = `
  (function_declaration
    name: (identifier) @function_name)
`;

    try {
      const captures = this.treeSitterService.executeQuery(tree, functionComponentQuery);
      this.logger.debug(`Capturas para componentes funcionais: ${captures.length}`);

      // Identificar componentes funcionais
      for (const capture of captures) {
        if (capture.name === 'name') {
          const name = capture.node.text;
          components.push({
            name,
            imports: []
          });
          this.logger.log(`Componente funcional detectado: ${name}`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao detectar componentes funcionais: ${error.message}`);
    }
  }

  // Detecta componentes arrow function
  private detectArrowFunctionComponents(tree: any, components: Component[]): void {
    const arrowFunctionComponentQuery = `
  (lexical_declaration
    (variable_declarator
      name: (identifier) @var_name
      value: (arrow_function)))
`;

    try {
      const captures = this.treeSitterService.executeQuery(tree, arrowFunctionComponentQuery);
      this.logger.debug(`Capturas para componentes arrow function: ${captures.length}`);

      // Identificar componentes arrow function
      for (const capture of captures) {
        if (capture.name === 'name') {
          const name = capture.node.text;
          components.push({
            name,
            imports: []
          });
          this.logger.log(`Componente arrow function detectado: ${name}`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao detectar componentes arrow function: ${error.message}`);
    }
  }

  // Detecta exportações padrão que podem ser componentes
  private detectDefaultExports(tree: any, components: Component[], filePath: string): void {
    const defaultExportQuery = `
  (export_statement 
    declaration: (_) @declaration)
`;

    try {
      const captures = this.treeSitterService.executeQuery(tree, defaultExportQuery);
      this.logger.debug(`Capturas para exportações padrão: ${captures.length}`);

      // Identificar exportações padrão
      for (const capture of captures) {
        if (capture.name === 'name') {
          const name = capture.node.text;
          components.push({
            name,
            imports: []
          });
          this.logger.log(`Exportação padrão detectada: ${name}`);
          return;
        }
      }

      // Se nenhuma exportação padrão foi encontrada, usar o nome do arquivo
      const fileName = path.basename(filePath, path.extname(filePath));
      const componentName = fileName.charAt(0).toUpperCase() + fileName.slice(1);

      components.push({
        name: componentName,
        imports: []
      });
      this.logger.log(`Usando nome do arquivo como componente: ${componentName}`);
    } catch (error) {
      this.logger.error(`Erro ao detectar exportações padrão: ${error.message}`);
    }
  }
}
