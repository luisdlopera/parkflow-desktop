/**
 * HeroUI v2 -> v3 migration script
 * Applies batch fixes across ALL .tsx files under apps/web/src/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname);

function getAllTsxFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
      results = results.concat(getAllTsxFiles(full));
    } else if (e.isFile() && e.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

// ---- colour / variant maps -----------------------------------------
const btnColorMap = {
  primary: 'primary', danger: 'danger', default: 'secondary',
  success: 'primary', warning: 'primary',
};
const chipColorMap = { primary: 'accent', secondary: 'default' };
const modalSizeMap = {
  xs: 'xs', sm: 'sm', md: 'md', lg: 'lg',
  xl: 'lg', '2xl': 'lg', '3xl': 'full', '4xl': 'full', '5xl': 'full',
};

// ---- Fix 1+2+3: Button ---------------------------------------------
function fixButton(content) {
  let changed = false;
  const out = content.replace(/<Button\b([^>]*?)\/?>/g, (match, attrs) => {
    let a = attrs;
    let c = false, hadColor = false;

    const cr = /\bcolor="(primary|danger|default|success|warning)"/;
    const cm = a.match(cr);
    if (cm) {
      hadColor = true;
      a = a.replace(cr, '');
      a = a.replace(/\bvariant="[^"]*"/, '');
      a += ` variant="${btnColorMap[cm[1]]}"`;
      c = true;
    }

    if (!hadColor) {
      const vr = /\bvariant="(flat|light)"/;
      const vm = a.match(vr);
      if (vm) {
        const m = { flat: 'secondary', light: 'tertiary' };
        a = a.replace(vr, `variant="${m[vm[1]]}"`);
        c = true;
      }
    }

    const lr = /\bisLoading(\s*=\s*\{[^}]*\}|\s*)/;
    const lm = a.match(lr);
    if (lm) {
      const repl = lm[1].trim() ? `isPending${lm[1]}` : 'isPending';
      a = a.replace(lr, repl);
      c = true;
    }

    if (!c) return match;
    changed = true;
    return `<Button${a}${match.endsWith('/>') ? '/>' : '>'}`;
  });
  return { result: out, changed };
}

// ---- Fix 4: Chip ---------------------------------------------------
function fixChip(content) {
  let changed = false;
  let r = content.replace(
    /(<Chip\b[^>]*?)\bcolor="(primary|secondary)"/g,
    (m, b, col) => { changed = true; return `${b}color="${chipColorMap[col]}"`; },
  );
  r = r.replace(
    /(<Chip\b[^>]*?)\bvariant="flat"/g,
    (m, b) => { changed = true; return `${b}variant="soft"`; },
  );
  return { result: r, changed };
}

// ---- Fix 5: Modal --------------------------------------------------
function fixModal(content) {
  let changed = false;
  let r = content;

  // A: onClose -> onOpenChange
  r = r.replace(
    /(<Modal\b[^>]*?)\bonClose\s*=\s*\{([^}]*)\}([^>]*?>)/g,
    (m, before, fn, after) => {
      changed = true;
      return `${before}onOpenChange={(open) => { if (!open) (${fn.trim()})(); }}${after}`;
    },
  );

  // B: extract size from <Modal>  ->  <Modal.Container size="...">
  // Only if Modal does NOT already have Modal.Container inside
  r = r.replace(
    /<Modal\b([^>]*?)\bsize="([^"]*)"([^>]*?)>([\s\S]*?)<\/Modal>/g,
    (m, before, size, after, inner) => {
      // Guard: if inner already has Modal.Container, don't double-wrap
      if (/<Modal\.Container/.test(inner)) return m;
      changed = true;
      const newSize = modalSizeMap[size] || 'lg';
      const indent = inner.match(/^\n?(\s*)/)?.[1] || '      ';
      const reindented = inner
        .split('\n')
        .map((line, i) => (i === 0 ? line : indent + '  ' + line))
        .join('\n');
      return `<Modal${before}${after}>\n${indent.replace(/ {2}$/, '')}<Modal.Container size="${newSize}">\n${reindented.trimEnd()}\n${indent}</Modal.Container>\n    </Modal>`;
    },
  );

  return { result: r, changed };
}

// ---- Fix 6: Tab ----------------------------------------------------
function fixTab(content) {
  let changed = false;
  let r = content;

  r = r.replace(
    /<Tab\b([^>]*?)\btitle="([^"]*)"\s*\/>/g,
    (m, a, t) => { changed = true; return `<Tab${a}>${t}</Tab>`; },
  );
  r = r.replace(
    /<Tab\b([^>]*?)\btitle=\{`([^`]*)`\}\s*\/>/g,
    (m, a, t) => { changed = true; return `<Tab${a}>{\`${t}\`}</Tab>`; },
  );
  r = r.replace(
    /<Tab\b([^>]*?)\btitle="([^"]*)"\s*>/g,
    (m, a, t) => { changed = true; return `<Tab${a}>${t}`; },
  );
  r = r.replace(
    /<Tab\b([^>]*?)\btitle=\{`([^`]*)`\}\s*>/g,
    (m, a, t) => { changed = true; return `<Tab${a}>{\`${t}\`}</Tab>`; },
  );

  return { result: r, changed };
}

// ---- Fix 7: ProgressBar -------------------------------------------
function fixProgressBar(content) {
  let changed = false;
  const r = content.replace(
    /<ProgressBar\b([\s\S]*?)showValueLabel/g,
    (m, before) => { changed = true; return `<ProgressBar${before}valueLabel`; },
  );
  return { result: r, changed };
}

// ---- Fix 8: AccordionItem ------------------------------------------
function fixAccordionItem(content) {
  let changed = false;
  const r = content.replace(
    /<AccordionItem\b([^>]*?)\btitle="([^"]*)"([^>]*)>([\s\S]*?)<\/AccordionItem>/g,
    (m, before, title, after, children) => {
      changed = true;
      const inner = children.trim();
      const indent = children.match(/^\n?(\s*)/)?.[1] || '      ';
      return `<AccordionItem${before}${after}>\n${indent}<Accordion.Heading><Accordion.Trigger>${title}</Accordion.Trigger></Accordion.Heading>\n${indent}<Accordion.Panel>${inner}</Accordion.Panel>\n${indent.slice(0, -2)}</AccordionItem>`;
    },
  );
  return { result: r, changed };
}

// ---- Main ----------------------------------------------------------
const files = getAllTsxFiles(SRC);
console.log(`Found ${files.length} .tsx files.\n`);

let totalChanged = 0;
const cnt = { btn: 0, chip: 0, modal: 0, tab: 0, prog: 0, acc: 0 };

for (const file of files) {
  const original = fs.readFileSync(file, 'utf-8');
  let cur = original;

  const r1 = fixButton(cur);     cur = r1.result;   if (r1.changed)   cnt.btn++;
  const r2 = fixChip(cur);       cur = r2.result;   if (r2.changed)   cnt.chip++;
  const r3 = fixModal(cur);      cur = r3.result;   if (r3.changed)   cnt.modal++;
  const r4 = fixTab(cur);        cur = r4.result;   if (r4.changed)   cnt.tab++;
  const r5 = fixProgressBar(cur); cur = r5.result;  if (r5.changed)   cnt.prog++;
  const r6 = fixAccordionItem(cur); cur = r6.result; if (r6.changed)  cnt.acc++;

  if (cur !== original) {
    fs.writeFileSync(file, cur, 'utf-8');
    console.log(`  \u2713 ${path.relative(SRC, file)}`);
    totalChanged++;
  }
}

console.log(`\n--- Summary ---`);
console.log(`Files modified:           ${totalChanged}`);
console.log(`Button fixes:             ${cnt.btn} files`);
console.log(`Chip fixes:               ${cnt.chip} files`);
console.log(`Modal fixes:              ${cnt.modal} files`);
console.log(`Tab fixes:                ${cnt.tab} files`);
console.log(`ProgressBar fixes:        ${cnt.prog} files`);
console.log(`AccordionItem fixes:      ${cnt.acc} files`);
console.log(`\nDone.`);
