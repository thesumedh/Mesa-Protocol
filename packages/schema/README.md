# `@mesaprotocol/schema`

> **Canonical Zod Schemas & TypeScript Types for Mesa Protocol.**

[![npm version](https://img.shields.io/npm/v/@mesaprotocol/schema?color=00dbe9&label=%40mesaprotocol%2Fschema)](https://www.npmjs.com/package/@mesaprotocol/schema)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)

## 📦 Installation

```bash
npm install @mesaprotocol/schema
```

## 📖 Usage

```ts
import { FlowDefinitionSchema, StepSchema } from '@mesaprotocol/schema';

// Validate a flow definition JSON object
const validatedFlow = FlowDefinitionSchema.parse({
  id: 'my-flow',
  name: 'Remittance Corridor',
  version: '1.0.0',
  steps: [
    { name: 'delay', provider: 'delay', params: { seconds: 5 } }
  ]
});
```

## 📄 License

[MIT](./LICENSE)
