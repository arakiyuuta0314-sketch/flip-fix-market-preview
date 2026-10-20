const fs = require('node:fs');
const path = require('node:path');
const filename = path.join(__dirname, '..', 'node_modules', '@capacitor-community', 'admob', 'ios', 'Sources', 'AdMobPlugin', 'Consent', 'ConsentExecutor.swift');
let text = fs.readFileSync(filename, 'utf8');
const patches = [
  {
    label: 'Consent request NSError',
    original: 'if error != nil {\n                    call.reject("Request consent info failed")',
    updated: 'if let error = error {\n                    call.reject("UMP consent request failed: \\(error.localizedDescription)")'
  },
  {
    label: 'Consent form NSError',
    original: '} catch {\n                        call.reject("Request consent info failed")',
    updated: '} catch {\n                        call.reject("UMP consent form failed: \\(error.localizedDescription)")'
  }
];
for (const patch of patches) {
  const originalCount = text.split(patch.original).length - 1;
  const updatedCount = text.split(patch.updated).length - 1;
  if (originalCount === 1 && updatedCount === 0) {
    text = text.replace(patch.original, patch.updated);
    console.log('Patched:', patch.label);
  } else if (originalCount === 0 && updatedCount === 1) {
    console.log('Already patched:', patch.label);
  } else {
    throw new Error('Unexpected AdMob plugin implementation at ' + patch.label + '. Stop instead of silently bypassing diagnostics.');
  }
}
fs.writeFileSync(filename, text, 'utf8');