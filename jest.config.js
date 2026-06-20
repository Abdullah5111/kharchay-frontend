module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/lib/__tests__/setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/lib/__tests__/setup.ts"],
};
