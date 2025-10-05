// ESLint configuration for unused modules detection
module.exports = {
  plugins: ['import'],
  rules: {
    'import/no-unused-modules': ['error', {
      unusedExports: true,
      src: ['src/**/*.js'],
      ignoreExports: [
        '**/_experimental/**',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/scripts/**',
        '**/utils/instrumentation/**'
      ],
      missingExports: false // Only check unused exports, not missing ones
    }],
    'import/no-extraneous-dependencies': 'off', // Allow dev dependencies in scripts
    'import/extensions': 'off' // Handle JS extensions properly
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  }
};