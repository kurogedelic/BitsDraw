module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  globals: {
    // BitsDraw globals
    OptimizedBitmapEditor: 'readonly',
    MenuManager: 'readonly',
    WindowManager: 'readonly',
    ToolManager: 'readonly',
    DialogManager: 'readonly',
    TextRenderer: 'readonly',
    // Canvas and WASM globals
    CanvasUnit: 'readonly',
    CanvasUnitManager: 'readonly',
    LegacyAdapter: 'readonly',
    // Export utilities
    ExportUtils: 'readonly',
    DitheringEffects: 'readonly'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'semi': ['error', 'always'],
    'quotes': ['warn', 'single'],
    'no-multiple-empty-lines': ['warn', { max: 2 }],
    'no-trailing-spaces': 'warn'
  }
};