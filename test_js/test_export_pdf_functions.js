const fs = require('fs');
const path = require('path');

console.log('=====================================================');
console.log('Testing PDF Export Functions & UI Element Integration');
console.log('=====================================================\n');

let allPassed = true;

// 1. Verify UI Elements in markdown_viewer.html
const htmlPath = path.join(__dirname, '..', 'markdown_viewer.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const htmlChecks = [
    'id="btn-export-pdf-print"',
    'id="btn-export-pdf-html2pdf"',
    'PDF 저장 (인쇄)',
    'PDF 파일 바로 저장 (비활성화)'
];

console.log('[1/4] Checking markdown_viewer.html button definitions...');
htmlChecks.forEach(term => {
    if (htmlContent.includes(term)) {
        console.log(`  PASS: Found '${term}' in markdown_viewer.html`);
    } else {
        console.error(`  FAIL: Missing '${term}' in markdown_viewer.html`);
        allPassed = false;
    }
});

// 2. Verify export-man.js function definitions & exports
const exportManPath = path.join(__dirname, '..', 'export-man.js');
const exportManContent = fs.readFileSync(exportManPath, 'utf8');

const exportManChecks = [
    'async function print_to_pdf',
    'async function save_to_pdf_file',
    'printToPdf: print_to_pdf',
    'saveToPdfFile: save_to_pdf_file',
    'print_to_pdf,',
    'save_to_pdf_file'
];

console.log('\n[2/4] Checking export-man.js sub-functions and exports...');
exportManChecks.forEach(term => {
    if (exportManContent.includes(term)) {
        console.log(`  PASS: Found '${term}' in export-man.js`);
    } else {
        console.error(`  FAIL: Missing '${term}' in export-man.js`);
        allPassed = false;
    }
});

// 3. Verify app.js DOM bindings and click listeners
const appPath = path.join(__dirname, '..', 'app.js');
const appContent = fs.readFileSync(appPath, 'utf8');

const appChecks = [
    "btnExportPdfPrint: document.getElementById('btn-export-pdf-print')",
    "btnExportPdfHtml2Pdf: document.getElementById('btn-export-pdf-html2pdf')",
    "ExportManager.printToPdf(preview, currentFilename, exportOptions)",
    "ExportManager.saveToPdfFile(preview, currentFilename, collectExportOptions())"
];

console.log('\n[3/4] Checking app.js bindings and event listeners...');
appChecks.forEach(term => {
    if (appContent.includes(term)) {
        console.log(`  PASS: Found '${term}' in app.js`);
    } else {
        console.error(`  FAIL: Missing '${term}' in app.js`);
        allPassed = false;
    }
});

// 4. Runtime behavior test in Node mock environment
console.log('\n[4/4] Executing runtime mock verification of ExportManager PDF functions...');
try {
    // Mock global browser environment for export-man.js
    global.window = {};
    global.document = {
        styleSheets: [],
        createElement: (tag) => {
            return {
                tagName: tag,
                style: {},
                classList: { remove: () => {} },
                children: [{}],
                querySelectorAll: () => [],
                querySelector: () => null,
                cloneNode: function() { return this; },
                innerHTML: '<h1>PDF Mock Test Header</h1><p>Test paragraph content</p>',
                contentWindow: {
                    document: {
                        open: () => {},
                        write: () => {},
                        close: () => {},
                        readyState: 'complete'
                    },
                    focus: () => {},
                    print: () => {}
                },
                onload: null,
                parentNode: true
            };
        },
        body: {
            appendChild: () => {},
            removeChild: () => {}
        }
    };
    global.fetch = async () => ({ text: async () => '/* mock css */' });

    // Load export-man.js in mocked environment
    eval(exportManContent);

    if (typeof global.window.ExportManager !== 'object') {
        throw new Error('ExportManager was not assigned to window');
    }

    const { printToPdf, saveToPdfFile, print_to_pdf, save_to_pdf_file } = global.window.ExportManager;

    if (typeof printToPdf !== 'function' || typeof saveToPdfFile !== 'function') {
        throw new Error('printToPdf or saveToPdfFile is not exported as function');
    }
    if (typeof print_to_pdf !== 'function' || typeof save_to_pdf_file !== 'function') {
        throw new Error('print_to_pdf or save_to_pdf_file pure sub-function is not exported');
    }

    console.log('  PASS: ExportManager.printToPdf & saveToPdfFile successfully loaded');

    // Run print_to_pdf test
    const mockPreview = global.document.createElement('div');
    const options = { theme: 'dark', lineColor: '#3b82f6', styleVars: {} };

    (async () => {
        const printResult = await printToPdf(mockPreview, 'test.md', options);
        if (printResult !== true) {
            console.error('  FAIL: printToPdf returned false or failed');
            allPassed = false;
        } else {
            console.log('  PASS: printToPdf mock execution returned true');
        }

        // Run saveToPdfFile fallback test (html2pdf is undefined -> falls back to printToPdf)
        const saveResult = await saveToPdfFile(mockPreview, 'test.md', options);
        if (saveResult !== true) {
            console.error('  FAIL: saveToPdfFile fallback returned false or failed');
            allPassed = false;
        } else {
            console.log('  PASS: saveToPdfFile fallback mock execution returned true');
        }

        if (allPassed) {
            console.log('\n=====================================================');
            console.log('SUCCESS: All PDF Export function tests passed 100%!');
            console.log('=====================================================\n');
            process.exit(0);
        } else {
            console.error('\n=====================================================');
            console.error('FAILURE: PDF Export function test failed.');
            console.error('=====================================================\n');
            process.exit(1);
        }
    })();
} catch (err) {
    console.error('  FAIL: Runtime mock evaluation failed:', err);
    process.exit(1);
}
