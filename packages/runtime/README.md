# `@mesaprotocol/runtime`

> **Durable Execution Engine, REST API Server, Scheduler & Console for Mesa Protocol.**

[![npm version](https://img.shields.io/npm/v/@mesaprotocol/runtime?color=00dbe9&label=%40mesaprotocol%2Fruntime)](https://www.npmjs.com/package/@mesaprotocol/runtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)

## 📦 Installation

```bash
npm install @mesaprotocol/runtime
```

## 📖 Usage

```ts
import { startServer } from '@mesaprotocol/runtime';

async function main() {
  await startServer(3001);
  console.log('🚀 Mesa Runtime listening on http://localhost:3001');
}

main();
```

## 📄 License

[MIT](./LICENSE)
