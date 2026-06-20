import serverModule from "../dist/server.cjs";

// Handle both ES module default export shape and direct export shape
const app = (serverModule as any).default || serverModule;

export default app;

