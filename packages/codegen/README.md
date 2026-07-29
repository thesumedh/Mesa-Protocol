# `@mesaprotocol/codegen`

> **TypeScript AST Parser, cURL Generator, & Runnable App Exporter for Mesa Protocol.**

[![npm version](https://img.shields.io/npm/v/@mesaprotocol/codegen?color=00dbe9&label=%40mesaprotocol%2Fcodegen)](https://www.npmjs.com/package/@mesaprotocol/codegen)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)

## 📦 Installation

```bash
npm install @mesaprotocol/codegen
```

## 📖 Usage

```ts
import { generateSDKCode, generateJSON, parseSDKCode, generateRunnableAppZip } from '@mesaprotocol/codegen';

// Generate TypeScript builder code from AST
const tsCode = generateSDKCode(flow);

// Parse TypeScript builder code into FlowDefinition AST
const flowAst = parseSDKCode(tsCode);
```

## 📄 License

[MIT](./LICENSE)
