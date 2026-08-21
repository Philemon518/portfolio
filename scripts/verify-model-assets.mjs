import { readFile } from 'node:fs/promises';

const requiredModels = [
  'public/models/arc_reactor.glb',
  'public/models/coffee_machine.glb',
  'public/models/generator.glb',
  'public/models/honda_cr-v.glb',
  'public/models/macbook_air_m4.glb',
];

const lfsPointerPrefix = 'version https://git-lfs.github.com/spec/v1';
const failures = [];

for (const modelPath of requiredModels) {
  try {
    const header = await readFile(modelPath, { encoding: null });
    const firstBytes = header.subarray(0, 64);
    const firstText = firstBytes.toString('utf8');
    const magic = firstBytes.subarray(0, 4).toString('utf8');

    if (firstText.startsWith(lfsPointerPrefix)) {
      failures.push(`${modelPath} is still a Git LFS pointer file.`);
      continue;
    }

    if (magic !== 'glTF') {
      failures.push(`${modelPath} does not look like a binary GLB file.`);
    }
  } catch (error) {
    failures.push(`${modelPath} could not be read: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error('\nGit LFS model assets were not hydrated before build.');
  console.error('The deployed site would serve pointer text instead of real GLB models.');
  console.error('\nProblems found:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nFix locally: git lfs install && git lfs pull');
  console.error('Fix on Railway: Project Settings -> Git -> enable Git Large File Storage (LFS), then redeploy.');
  console.error('Fix on Vercel: Project Settings -> Git -> enable Git Large File Storage (LFS), then redeploy.\n');
  process.exit(1);
}

console.log('Verified GLB model assets are hydrated.');
