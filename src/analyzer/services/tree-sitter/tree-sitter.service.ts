import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TreeSitterService implements OnModuleInit {
  private readonly logger = new Logger(TreeSitterService.name);
  private parser: any;
  private language: any;

  onModuleInit() {
    try {
      // Importar diretamente os módulos
      const Parser = require('tree-sitter');

      // Criar uma instância do parser
      this.parser = new Parser();

      // Carregar o módulo JavaScript
      const JavaScript = require('tree-sitter-javascript');

      // Verificar se o JavaScript foi carregado corretamente
      if (!JavaScript) {
        this.logger.error('Não foi possível carregar o tree-sitter-javascript');
        return;
      }

      // Definir explicitamente a linguagem
      this.language = JavaScript;
      this.parser.setLanguage(this.language);

      // Testar a geração de uma árvore básica
      const testTree = this.parser.parse('const x = 1;');
      if (!testTree || !testTree.rootNode) {
        this.logger.error('Falha no teste de análise simples');
        return;
      }

      this.logger.log('Tree-sitter inicializado com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao inicializar Tree-sitter: ${error.message}`);
      if (error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
    }
  }

  // Analisa um arquivo usando o parser
  parseFile(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const extension = path.extname(filePath).toLowerCase();

      this.logger.log(`Analisando arquivo ${filePath} com extensão ${extension}`);

      // Verificar se o parser está disponível
      if (!this.parser) {
        this.logger.error(`Parser não disponível para analisar ${filePath}`);
        return null;
      }

      // Executar o parse
      const tree = this.parser.parse(content);

      // Verificar se a árvore foi gerada corretamente
      if (!tree || !tree.rootNode) {
        this.logger.error(`Árvore inválida para ${filePath}`);
        return null;
      }

      // Verificar a estrutura da árvore para depuração
      this.logger.log(`Tipo de nó raiz: ${tree.rootNode.type}`);
      this.logger.log(`Filho 0 tipo: ${tree.rootNode.children[0]?.type || 'nenhum filho'}`);

      return tree;
    } catch (error) {
      this.logger.error(`Erro ao analisar arquivo ${filePath}: ${error.message}`);
      return null;
    }
  }

  // Executa uma query na árvore gerada pelo parser
  executeQuery(tree: any, queryString: string): QueryCapture[] {
    try {
      // Extrair rootNode do objeto ou usar diretamente
      const rootNode = tree.rootNode ? tree.rootNode : tree;

      // Verificar se o rootNode é válido
      if (!rootNode) {
        this.logger.error('Nó inválido para executar query');
        return [];
      }

      // Garantir que o parser e a linguagem estão configurados
      if (!this.parser || !this.language) {
        this.logger.error('Parser ou linguagem não configurados');
        return [];
      }

      // Log para debugging
      this.logger.debug(`Executando query: ${queryString.trim()}`);

      // Criar a query
      let query;
      let useNativeQuery = false;

      try {
        // Tentar criar a query usando a API do Tree-sitter
        if (this.parser.getLanguage() && typeof this.parser.getLanguage().query === 'function') {
          query = this.parser.getLanguage().query(queryString);
          useNativeQuery = true;
          this.logger.log('Usando query nativa do Tree-sitter');
        } else if (typeof this.language.Query === 'function') {
          query = new this.language.Query(queryString);
          useNativeQuery = true;
          this.logger.warn('Usando construtor Query do Tree-sitter');
        } else {
          this.logger.warn('Usando implementação personalizada de query');
          query = new TreeSitterQuery(queryString);
        }
      } catch (error) {
        this.logger.error(`Erro ao criar query nativa: ${error.message}`);
        this.logger.warn('Usando implementação personalizada de query');
        query = new TreeSitterQuery(queryString);
      }

      if (!query) {
        this.logger.error('Não foi possível criar objeto query');
        return [];
      }

      // Executar a query
      let captures: QueryCapture[] = [];

      try {
        if (useNativeQuery) {
          // Para a forma do Tree-sitter
          if (typeof query.captures === 'function') {
            const rawCaptures = query.captures(rootNode);

            // Converter as capturas para nosso formato
            for (const capture of rawCaptures) {
              captures.push(new QueryCapture(
                capture.node,
                capture.name
              ));
            }
          }
          // Para API alternativa que usa matches
          else if (typeof query.matches === 'function') {
            const matches = query.matches(rootNode);
            for (const match of matches) {
              if (match.captures) {
                for (const capture of match.captures) {
                  captures.push(new QueryCapture(
                    capture.node,
                    capture.name
                  ));
                }
              }
            }
          }
        } else {
          // Usar nossa implementação personalizada
          captures = query.captures(rootNode);
        }
      } catch (error) {
        this.logger.error(`Erro ao executar query: ${error.message}`);

        // Tentar fallback para a implementação personalizada se a nativa falhar
        if (useNativeQuery) {
          this.logger.warn('Tentando fallback para implementação personalizada');
          try {
            const fallbackQuery = new TreeSitterQuery(queryString);
            captures = fallbackQuery.captures(rootNode);
          } catch (fbError) {
            this.logger.error(`Erro no fallback: ${fbError.message}`);
          }
        }
      }

      // Log para debugging
      if (captures.length === 0) {
        this.logger.warn(`Nenhuma captura encontrada para query: ${queryString}`);
      } else {
        this.logger.log(`${captures.length} capturas encontradas`);
        const firstCapture = captures[0];
        this.logger.debug(`Primeira captura: ${JSON.stringify({
          name: firstCapture.name,
          text: firstCapture.node?.text || 'N/A'
        })}`);
      }

      return captures;
    } catch (error) {
      this.logger.error(`Erro ao executar query: ${error.message}`);
      return [];
    }
  }
}

class QueryCapture {
  node: any;
  name: string;

  constructor(node: any, name: string) {
    this.node = node;
    this.name = name;
  }
}

class TreeSitterQuery {
  private queryString: string;

  constructor(queryString: string) {
    this.queryString = queryString;
  }

  captures(rootNode: any): QueryCapture[] {
    const results: QueryCapture[] = [];

    // Analisar a queryString para entender o que estamos procurando
    const queryParts = this.parseQuery(this.queryString);
    if (!queryParts) {
      return results;
    }

    // Percorrer a árvore recursivamente
    this.visitNode(rootNode, queryParts, results);

    return results;
  }

  // Método para analisar a queryString e extrair informações relevantes
  private parseQuery(queryString: string): any {
    // Extrair o tipo de nó e o nome da captura
    // Formato básico: (node_type) @capture_name
    // ou formatos mais complexos
    try {
      // Remover espaços extras e quebras de linha
      const cleanQuery = queryString.trim().replace(/\s+/g, ' ');

      // Extrair o tipo de nó principal
      const nodeTypeMatch = cleanQuery.match(/\(([a-z_]+)/);
      if (!nodeTypeMatch) return null;

      const nodeType = nodeTypeMatch[1];

      // Extrair o nome da captura
      const captureMatch = cleanQuery.match(/@([a-z_]+)/);
      const captureName = captureMatch ? captureMatch[1] : 'capture';

      // Verificar se há condições específicas
      const hasNameCondition = cleanQuery.includes('name:');

      return {
        nodeType,
        captureName,
        hasNameCondition
      };
    } catch (e) {
      console.error('Erro ao analisar query:', e);
      return null;
    }
  }

  // Método para visitar cada nó da árvore e aplicar a query
  private visitNode(node: any, queryParts: any, results: QueryCapture[]): void {
    if (!node || !queryParts) return;

    // Verificar se o nó atual corresponde ao tipo que estamos procurando
    if (node.type === queryParts.nodeType) {
      results.push(new QueryCapture(node, queryParts.captureName));
    }

    // Para queries que buscam elementos JSX
    if (queryParts.nodeType === 'jsx_opening_element' && node.type === 'jsx_opening_element') {
      // Encontrar o nome do tag
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type === 'identifier') {
          results.push(new QueryCapture(child, 'tag'));
        }
      }
    }

    // Para classes e funções, buscando declarações específicas
    if ((queryParts.nodeType === 'class_declaration' && node.type === 'class_declaration') ||
      (queryParts.nodeType === 'function_declaration' && node.type === 'function_declaration')) {
      // Encontrar o nome
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type === 'identifier') {
          results.push(new QueryCapture(node, queryParts.captureName));
          break;
        }
      }
    }

    // Para declarações de variáveis (arrow functions)
    if (queryParts.nodeType === 'variable_declaration' && node.type === 'variable_declaration') {
      results.push(new QueryCapture(node, queryParts.captureName));
    }

    // Para declarações de export
    if (queryParts.nodeType === 'export_statement' && node.type === 'export_statement') {
      results.push(new QueryCapture(node, queryParts.captureName));
    }

    // Para import statements com condições específicas
    if (queryParts.nodeType === 'import_statement' && node.type === 'import_statement') {
      results.push(new QueryCapture(node, queryParts.captureName));

      // Se a query também busca o source ou name
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type === 'string') {
          results.push(new QueryCapture(child, 'source'));
        }
        if (child && child.type === 'import_clause') {
          // Procurar por named imports ou default import
          for (let j = 0; j < child.childCount; j++) {
            const importChild = child.child(j);
            if (importChild && importChild.type === 'identifier') {
              results.push(new QueryCapture(importChild, 'name'));
            }
            if (importChild && importChild.type === 'named_import_specifiers') {
              // Procurar por named import specifiers
              for (let k = 0; k < importChild.childCount; k++) {
                const specifier = importChild.child(k);
                if (specifier && specifier.type === 'named_import_specifier') {
                  for (let l = 0; l < specifier.childCount; l++) {
                    const nameNode = specifier.child(l);
                    if (nameNode && nameNode.type === 'identifier') {
                      results.push(new QueryCapture(nameNode, 'name'));
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // ler e/ou buscar os filhos recursivamente
    if (node.children) {
      for (const child of node.children) {
        this.visitNode(child, queryParts, results);
      }
    } else if (node.childCount && node.childCount > 0) {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) {
          this.visitNode(child, queryParts, results);
        }
      }
    }
  }
}