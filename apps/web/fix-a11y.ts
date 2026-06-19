import { Project, SyntaxKind, JsxOpeningElement, JsxSelfClosingElement } from "ts-morph";
import * as fs from "fs";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

let totalFiles = 0;
let modifiedFiles = 0;
let stats = {
  button: 0,
  input: 0,
  select: 0,
  switch: 0,
  other: 0,
  fallback: 0,
};

const iconHeuristics = [
  { keywords: ["trash", "delete"], label: "Eliminar" },
  { keywords: ["edit", "pencil"], label: "Editar" },
  { keywords: ["plus", "add"], label: "Agregar" },
  { keywords: ["search", "magnifying"], label: "Buscar" },
  { keywords: ["close", "x"], label: "Cerrar" },
  { keywords: ["menu", "hamburger"], label: "Abrir menú" },
  { keywords: ["settings", "gear", "cog"], label: "Configuración" },
  { keywords: ["eye"], label: "Ver detalles" },
  { keywords: ["refresh", "reload", "rotate", "ccw"], label: "Actualizar" },
  { keywords: ["filter"], label: "Filtrar" },
  { keywords: ["download"], label: "Descargar" },
  { keywords: ["upload"], label: "Subir" },
  { keywords: ["print"], label: "Imprimir" },
  { keywords: ["chevron", "arrow", "caret"], label: "Desplegar" },
  { keywords: ["check"], label: "Confirmar" },
];

function inferLabelFromIcon(elementText: string): string {
  const lowerText = elementText.toLowerCase();
  for (const h of iconHeuristics) {
    if (h.keywords.some(kw => lowerText.includes(kw))) {
      return h.label;
    }
  }
  stats.fallback++;
  return "Acción"; // TODO: Revisar a11y
}

function processJsxElement(node: JsxOpeningElement | JsxSelfClosingElement) {
  let changed = false;
  const tagName = node.getTagNameNode().getText();
  
  // We need to check attributes
  const attributes = node.getAttributes();
  const hasLabel = attributes.some(attr => attr.getKind() === SyntaxKind.JsxAttribute && attr.getNameNode().getText() === "label");
  const hasAriaLabel = attributes.some(attr => attr.getKind() === SyntaxKind.JsxAttribute && attr.getNameNode().getText() === "aria-label");
  const hasAriaLabelledBy = attributes.some(attr => attr.getKind() === SyntaxKind.JsxAttribute && attr.getNameNode().getText() === "aria-labelledby");
  const isIconOnly = attributes.some(attr => attr.getKind() === SyntaxKind.JsxAttribute && attr.getNameNode().getText() === "isIconOnly");

  if (hasAriaLabel || hasAriaLabelledBy) {
    return false; // Already accessible
  }

  if (tagName === "Button" || tagName === "HeroButton" || tagName === "IconButton") {
    if (isIconOnly) {
      // Find what's inside
      let textToAnalyze = node.getText();
      if (node.getKind() === SyntaxKind.JsxOpeningElement) {
        // It's an opening element, get the parent JsxElement to see children
        const parent = node.getParentIfKind(SyntaxKind.JsxElement);
        if (parent) {
          textToAnalyze = parent.getText();
        }
      }
      
      const inferredLabel = inferLabelFromIcon(textToAnalyze);
      node.addAttribute({ name: "aria-label", initializer: `"${inferredLabel}"` });
      stats.button++;
      changed = true;
    }
  } else if (["Input", "Select", "Textarea", "Autocomplete", "DatePicker", "TimeInput", "Switch", "RadioGroup", "CheckboxGroup"].includes(tagName) || tagName.startsWith("Select.")) {
    // Only if it doesn't have label
    if (!hasLabel) {
      let fallbackLabel = "Campo";
      if (tagName === "Input") { fallbackLabel = "Entrada de texto"; stats.input++; }
      else if (tagName.includes("Select")) { fallbackLabel = "Seleccionar opción"; stats.select++; }
      else if (tagName === "Switch") { fallbackLabel = "Alternar opción"; stats.switch++; }
      else { fallbackLabel = `Campo ${tagName}`; stats.other++; }
      
      node.addAttribute({ name: "aria-label", initializer: `"${fallbackLabel}"` });
      stats.fallback++;
      changed = true;
    }
  }

  return changed;
}

const sourceFiles = project.getSourceFiles("src/**/*.tsx");
totalFiles = sourceFiles.length;

sourceFiles.forEach(sourceFile => {
  let fileChanged = false;

  // Find all JSX elements
  const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement);
  const jsxOpeningElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement);

  jsxElements.forEach(node => {
    if (processJsxElement(node)) fileChanged = true;
  });

  jsxOpeningElements.forEach(node => {
    if (processJsxElement(node)) fileChanged = true;
  });

  if (fileChanged) {
    sourceFile.saveSync();
    modifiedFiles++;
    console.log(`Modified: ${sourceFile.getFilePath()}`);
  }
});

const report = `
# Reporte de Accesibilidad - Corrección Automática
- Total de archivos analizados: ${totalFiles}
- Total de archivos modificados: ${modifiedFiles}
- Total de Button isIconOnly corregidos: ${stats.button}
- Total de Inputs corregidos: ${stats.input}
- Total de Selects corregidos: ${stats.select}
- Total de Switches corregidos: ${stats.switch}
- Total de otros componentes corregidos: ${stats.other}
- Total de componentes que requirieron aria-label genérico (fallback): ${stats.fallback}
`;

fs.writeFileSync("a11y-report.md", report);
console.log(report);
