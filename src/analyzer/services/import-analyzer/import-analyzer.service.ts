import { Injectable, Logger } from '@nestjs/common';
import { TreeSitterService } from '../tree-sitter/tree-sitter.service';
import { Component, ImportInfo } from '../../interfaces/component.interface';
import { groupCaptures } from '@utils/tree-sitter-utils';

@Injectable()
export class ImportAnalyzerService {
  private readonly logger = new Logger(ImportAnalyzerService.name);

  constructor(private readonly treeSitterService: TreeSitterService) {}

  private addImportIfNotDuplicate(component: Component, importInfo: ImportInfo): void {
    const isDuplicate = component.imports.some(
      imp => imp.name === importInfo.name && imp.source === importInfo.source
    );

    if (!isDuplicate) {
      component.imports.push(importInfo);
      this.logger.debug(`Adicionada importação: ${importInfo.name} de ${importInfo.source}`);
    }
  }

  // Analisa importações em um arquivo
  analyzeImports(
    rootNode: any,
    components: Component[],
    filePath: string,
  ): void {
    try {
      // Verificar se temos um nó válido
      if (!rootNode) {
        this.logger.warn(`Nó inválido para analisar importações em ${filePath}`);
        return;
      }

      // Map para armazenar todas as importações
      const allImports = new Map<string, ImportInfo>();

      // Detectar importações nomeadas
      this.detectNamedImports(rootNode, allImports, components);

      // Detectar importações padrão
      this.detectDefaultImports(rootNode, allImports, components);

      // Adicionar importações aos componentes
      for (const component of components) {
        // Adicionar importações do React
        if (allImports.has('React') || allImports.has('Component')) {
          if (allImports.has('React')) {
            const reactImport = allImports.get('React');
            if (reactImport) {
              this.addImportIfNotDuplicate(component, reactImport);
            }
          }
          if (allImports.has('Component')) {
            const componentImport = allImports.get('Component');
            if (componentImport) {
              this.addImportIfNotDuplicate(component, componentImport);
            }
          }
        }

        // Adicionar importações específicas do componente
        if (allImports.has(component.name)) {
          const componentNameImport = allImports.get(component.name);
          if (componentNameImport) {
            this.addImportIfNotDuplicate(component, componentNameImport);
          }
        }

        // Detectar uso de outros componentes
        this.detectComponentUsage(rootNode, component, allImports);
      }
    } catch (error) {
      this.logger.error(`Erro ao analisar importações: ${error.message}`);
    }
  }

  // Detecta importações nomeadas (import { X } from 'source'
  private detectComponentUsage(
    rootNode: any,
    component: Component,
    allImports: Map<string, ImportInfo>,
  ): void {
    const jsxQuery = `(jsx_opening_element name: (identifier) @tag)`;

    try {
      const captures = this.treeSitterService.executeQuery({ rootNode }, jsxQuery);

      const usedComponents = new Set<string>();

      for (const capture of captures) {
        const tagName = capture.node.text;

        // Verifica se é um nome válido de componente React (começa com letra maiúscula)
        if (tagName[0] === tagName[0].toUpperCase() && allImports.has(tagName)) {
          usedComponents.add(tagName);
        }
      }

      // Adicionar componentes usados às importações
      for (const usedComp of usedComponents) {
        // Em detectComponentUsage:
        if (allImports.has(usedComp)) {
          const usedCompImport = allImports.get(usedComp);
          if (usedCompImport) {
            this.addImportIfNotDuplicate(component, usedCompImport);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Erro ao detectar uso de componentes: ${error.message}`,
      );
    }
  }

  // Detecta importações padrão (import X from 'source')
  private detectDefaultImports(rootNode: any, allImports: Map<string, ImportInfo>, components: Component[]): void {
    const defaultImportQuery = `
    (import_statement
      source: (string) @source
      (import_clause
        (identifier) @name))
  `;

    try {
      const captures = this.treeSitterService.executeQuery({ rootNode }, defaultImportQuery);

      // Processar as capturas
      let currentSource = '';
      let currentName = '';

      for (const capture of captures) {
        if (capture.name === 'source') {
          currentSource = capture.node.text.replace(/['"]/g, '');
        } else if (capture.name === 'name') {
          currentName = capture.node.text;

          // Em vez de adicionar ao mapa
          // allImports.set(currentName, { name: currentName, source: currentSource });

          // Adicionar diretamente a todos os componentes
          for (const component of components) {
            component.imports.push({
              name: currentName,
              source: `import ${currentName} from '${currentSource}'`
            });
          }

          this.logger.debug(`Importação padrão detectada: ${currentName} de ${currentSource}`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao detectar importações padrão: ${error.message}`);
    }
  }

  private detectNamedImports(rootNode: any, allImports: Map<string, ImportInfo>, components: Component[]): void {
    const namedImportQuery = `
    (import_statement
      source: (string) @source
      (import_clause
        (named_import_specifiers
          (named_import_specifier
            name: (identifier) @name))))
  `;

    try {
      const captures = this.treeSitterService.executeQuery({ rootNode }, namedImportQuery);

      // Processar as capturas
      let currentSource = '';

      for (const capture of captures) {
        if (capture.name === 'source') {
          currentSource = capture.node.text.replace(/['"]/g, '');
        } else if (capture.name === 'name') {
          const name = capture.node.text;

          // Em vez de adicionar ao mapa allImports
          // allImports.set(name, { name, source: currentSource });

          // Adicionar diretamente a todos os componentes
          for (const component of components) {
            component.imports.push({
              name: name,
              source: `import { ${name} } from '${currentSource}'`
            });
          }

          this.logger.debug(`Importação nomeada detectada: ${name} de ${currentSource}`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao detectar importações nomeadas: ${error.message}`);
    }
  }
}
