# @mesaprotocol/sdk

Mesa is a financial workflow orchestration runtime for Stellar. This package contains the developer SDK used to define and execute resilient workflows.

## Installation

```bash
npm install @mesaprotocol/sdk
```

## Quickstart

```typescript
import { Mesa } from "@mesaprotocol/sdk";

// Initialize the Mesa Client pointing to your local/hosted runtime
const mesa = new Mesa({
  endpoint: "http://localhost:3001"
});

// Describe a workflow fluently
const flow = mesa.flow()
  .receive({
    asset: "XLM",
    minAmount: 10,
    toAddress: "GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU"
  })
  .delay({
    seconds: 5
  })
  .transfer({
    to: "GCIE7JJJVTCX4YGSME3FXZQB3GY4MY7PJNW6VXMHPYUDPHBDQN2IYE5Z",
    asset: "XLM",
    amount: 10
  })
  .build();

// Register and execute the workflow
const { executionId } = await mesa.execute(flow);
console.log(`Execution started: ${executionId}`);
```

## License

MIT
