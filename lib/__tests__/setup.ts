const mem: Record<string, string> = {};
jest.mock("expo-secure-store", () => ({
  setItemAsync: async (k: string, v: string) => { mem[k] = v; },
  getItemAsync: async (k: string) => (k in mem ? mem[k] : null),
  deleteItemAsync: async (k: string) => { delete mem[k]; },
}));
beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k];
});
