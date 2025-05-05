# Analisador de Componentes React 🔍

Um analisador de componentes React desenvolvido com NestJS e Tree-sitter, que examina projetos React compactados em formato ZIP para identificar componentes e suas importações.

## ✨ Funcionalidades

- Análise de projetos React/Next.js (JavaScript e TypeScript)
- Detecção de diferentes tipos de componentes (classe, função, arrow function)
- Rastreamento de importações e suas origens
- API REST para integração com outras ferramentas
- Processamento assíncrono de arquivos ZIP

## 🛠️ Tecnologias Utilizadas

- **[NestJS](https://nestjs.com/)**: Framework para backend em Node.js
- **[Tree-sitter](https://tree-sitter.github.io/tree-sitter/)**: Parser para análise de código
- **[Express](https://expressjs.com/)**: Framework web para Node.js
- **[TypeScript](https://www.typescriptlang.org/)**: Linguagem de programação tipada

## 📋 Pré-requisitos

- Node.js (versão 20+)
- npm
- Git

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/renatoandradeweb/react-component-analyzer.git
cd react-component-analyzer
```

### 2. Instale as dependências

```bash
npm install
```

## ⚙️ Execução

### Ambiente de desenvolvimento

```bash
# Modo de desenvolvimento com hot-reload
npm run start:dev
```

### Ambiente de produção

```bash
# Compilar o projeto
npm run build

# Iniciar em modo de produção
npm run start:prod
```

## 🔌 API

O projeto expõe um endpoint REST para análise de componentes:

### Analisar Projeto React

**Endpoint:** `POST http://localhost:3000/analyzer/upload`

**Parâmetro:**
- `file`: Arquivo ZIP contendo o projeto React para análise

**Resposta:**
```json
{
  "files": [
    {
      "path": "/path/to/Component.jsx",
      "components": [
        {
          "name": "ComponentName",
          "type": "javascript",
          "imports": [
            {
              "name": "React",
              "source": "react"
            },
            {
              "name": "ComponentA",
              "source": "./components/ComponentA"
            }
          ]
        }
      ]
    }
  ]
}
```

## 📦 Exemplo de Uso

Você pode testar o endpoint usando ferramentas como cURL, Postman ou Insomnia:

```bash
curl -X POST http://localhost:3000/analyzer/upload \
  -F "file=@react-test-project.zip" \
  -o resultado.json
```
Arquivo `resultado.json` conterá a análise do projeto.
O arquivo de teste `react-test-project.zip` pode ser encontrado na pasta raiz do projeto.


## Possíveis Erros iniciais
- **Caso dê erro na hora de fazer o upload criar as pastas na raiz do projeto /uploads e /temp**

## 📝 Detalhes da Implementação

O analisador usa o Tree-sitter para criar uma Árvore de Sintaxe Abstrata (AST) do código React e executa consultas para identificar:

- Componentes baseados em classe (class XYZ extends React.Component)
- Componentes funcionais (function XYZ() { return <jsx> })
- Componentes arrow function (const XYZ = () => <jsx>)
- Importações e exportações de componentes

O sistema identifica vários padrões de componentes React e captura suas dependências.

