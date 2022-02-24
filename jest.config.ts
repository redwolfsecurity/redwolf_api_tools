module.exports = {
  roots: [
    "<rootDir>/src",
    "<rootDir>/test"
  ],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
    "**/test/**/*.test.js"
  ],
  preset: "jest-puppeteer",
  globals: {
    URL: "http://localhost:3000"
  },
  verbose: true
}

