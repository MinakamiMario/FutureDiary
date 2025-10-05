// scripts/find-unused-exports.js
// npm i -D fast-glob @babel/parser @babel/traverse
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SRC = path.resolve(__dirname, '..', 'src');

// 1) Verzamel alle JS/TS/JSX files
function getFiles() {
  return fg.sync(['**/*.{js,jsx,ts,tsx}'], { 
    cwd: SRC, 
    absolute: true, 
    ignore: ['**/node_modules/**', '**/_experimental/**', '**/scripts/**'] 
  });
}

// 2) Parse helper
function parse(code, filename) {
  return parser.parse(code, {
    sourceType: 'module',
    sourceFilename: filename,
    plugins: [
      'jsx',
      'classProperties',
      'objectRestSpread',
      'optionalChaining',
      'nullishCoalescingOperator',
      // voeg 'typescript' toe als je TS gebruikt
    ],
  });
}

// 3) Haal exports uit module
function collectExports(ast) {
  const exports = new Set();
  traverse(ast, {
    ExportNamedDeclaration(path) {
      const { node } = path;
      if (node.declaration) {
        // export function foo() {}
        if (node.declaration.id?.name) exports.add(node.declaration.id.name);
        // export const a = ...
        if (node.declaration.declarations) {
          node.declaration.declarations.forEach(d => d.id?.name && exports.add(d.id.name));
        }
      }
      if (node.specifiers) {
        node.specifiers.forEach(s => s.exported?.name && exports.add(s.exported.name));
      }
    },
    ExportDefaultDeclaration(path) {
      exports.add('default');
    },
  });
  return exports;
}

// 4) Map: modulePath -> { exports:Set, used:Set }
function buildModuleIndex(files, targetModulesRelative) {
  const index = {};
  for (const file of files) {
    const rel = path.relative(SRC, file).replace(/\\/g, '/');
    if (!targetModulesRelative.has(rel)) continue;
    const code = fs.readFileSync(file, 'utf8');
    const ast = parse(code, rel);
    index[rel] = {
      exports: collectExports(ast),
      used: new Set(), // vullen we later
    };
  }
  return index;
}

// 5) Doorloop alle files, vind imports -> referenties
function analyzeUsage(files, index) {
  for (const file of files) {
    const rel = path.relative(SRC, file).replace(/\\/g, '/');
    const code = fs.readFileSync(file, 'utf8');
    let ast;
    try { ast = parse(code, rel); } catch (e) { continue; }

    // in dit bestand: map van lokaleNaam -> { moduleRel, exportName }
    const localBindings = new Map();

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value; // bv '../services/data/ActivityTrackingService'
        // normaliseer naar een relatieve module met .js extensie-resolutie best-effort
        let importedFile;
        if (source.startsWith('.')) {
          const currentFile = file; // Use the file path we have
          const currentDir = path.dirname(currentFile);
          const abs = path.resolve(currentDir, source);
          const candidates = [
            abs, abs + '.js', abs + '.jsx', abs + '.ts', abs + '.tsx',
            path.join(abs, 'index.js'), path.join(abs, 'index.tsx'),
          ];
          importedFile = candidates.find(fs.existsSync);
        }
        if (!importedFile) return;
        const importedRel = path.relative(SRC, importedFile).replace(/\\/g, '/');
        if (!(importedRel in index)) return; // alleen geïnteresseerd in target modules

        for (const spec of path.node.specifiers) {
          if (spec.type === 'ImportDefaultSpecifier') {
            localBindings.set(spec.local.name, { moduleRel: importedRel, exportName: 'default' });
          } else if (spec.type === 'ImportSpecifier') {
            const exportName = spec.imported.name;
            localBindings.set(spec.local.name, { moduleRel: importedRel, exportName });
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            // namespace import: track álle gebruik via member expressions
            localBindings.set(spec.local.name, { moduleRel: importedRel, exportName: '*' });
          }
        }
      },

      // Identifiers die echt gebruikt worden
      Identifier(path) {
        const name = path.node.name;
        const binding = path.scope.getBinding(name);
        if (!binding) return;
        const init = binding.path.node;
        // Als de identifier afkomstig is van een import, staat dat op binding.path.parent
        if (binding.path.parent && binding.path.parent.type === 'ImportDeclaration') {
          // Check of dit een localBinding is die wij bijhouden
          const lb = localBindings.get(name);
          if (!lb) return;
          // markeer: deze binding wordt gerefereerd (behalve de declaratie zelf)
          for (const refPath of binding.referencePaths) {
            if (refPath.node === path.node) {
              if (lb.exportName === '*') {
                // wordt via namespace gebruikt; echte export bepalen we verderop
                // hier doen we niks, namespace usage vangen we via MemberExpression hieronder
              } else {
                index[lb.moduleRel]?.used.add(lb.exportName);
              }
            }
          }
        }
      },

      // namespace.member usage: NS.foo -> export 'foo'
      MemberExpression(path) {
        const obj = path.node.object;
        const prop = path.node.property;
        if (obj.type !== 'Identifier') return;
        const lb = localBindings.get(obj.name);
        if (!lb || lb.exportName !== '*') return;
        if (prop.type === 'Identifier') {
          index[lb.moduleRel]?.used.add(prop.name);
        }
      },
    });
  }
}

// === MAIN ===
(async function main() {
  // Stel je target modules samen (pas paden aan jouw repo aan):
  const targetModules = new Set([
    'services/data/ActivityTrackingService.js',
    'services/healthDataService.js', 
    'services/locationService.js',
  ].map(p => `src/${p}`.replace(/^src\/src\//, 'src/'))); // veiligheid

  const files = getFiles();
  const index = buildModuleIndex(files, targetModules);
  analyzeUsage(files, index);

  const report = [];
  for (const [mod, { exports, used }] of Object.entries(index)) {
    const unused = [...exports].filter(e => !used.has(e));
    report.push({ module: mod, exports: [...exports], used: [...used], unused });
  }

  console.log('=== UNUSED EXPORTS REPORT ===');
  for (const r of report) {
    console.log(`\n[${r.module}]`);
    console.log(`Exports: ${r.exports.join(', ') || '(none)'}`);
    console.log(`Used:    ${r.used.join(', ') || '(none)'}`);
    console.log(`UNUSED:  ${r.unused.join(', ') || '(none)'}  <-- check candidates`);
  }

  // Write detailed report to file
  const reportPath = path.join(__dirname, 'unused-exports-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to: ${reportPath}`);
})();