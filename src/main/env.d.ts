// src/main/env.d.ts

declare module "*.png?asset" {
  const asset: string;
  export default asset;
}
