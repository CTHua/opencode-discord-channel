declare module "bun:test" {
  export const describe: (
    name: string,
    fn: () => void | Promise<void>,
  ) => void
  export const it: (
    name: string,
    fn: () => void | Promise<void>,
  ) => void
  export const expect: any
  export const beforeEach: (fn: () => void | Promise<void>) => void
  export const afterEach: (fn: () => void | Promise<void>) => void
  export const afterAll: (fn: () => void | Promise<void>) => void
  export const mock: {
    <T extends (...args: any[]) => any>(fn?: T): any
    module(id: string, factory: () => any): void | Promise<void>
  }
}
