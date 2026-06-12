const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname);
const outputFile = path.join(repoRoot, 'agents.json');

const divisions = {
  engineering: 'Engineering', design: 'Design', 'paid-media': 'Paid Media',
  sales: 'Sales', marketing: 'Marketing', product: 'Product',
  'project-management': 'Project Management', testing: 'Testing',
  security: 'Security', support: 'Support', 'spatial-computing': 'Spatial Computing',
  specialized: 'Specialized', academic: 'Academic', finance: 'Finance',
  'game-development': 'Game Development', gis: 'GIS'
};

const divEmoji = {
  engineering: '💻', design: '🎨', 'paid-media': '💰', sales: '💼',
  marketing: '📢', product: '📊', 'project-management': '🎬', testing: '🧪',
  security: '🔒', support: '🛟', 'spatial-computing': '🥽', specialized: '🎯',
  academic: '📚', finance: '💰', 'game-development': '🎮', gis: '🗺️'
};

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('---', 3);
  if (end === -1) return null;
  const yaml = content.slice(3, end);
  const result = {};
  let currentKey = null;
  for (const line of yaml.split('\n')) {
    const trimmed = line.trimRight();
    const match = trimmed.match(/^([a-zA-Z_]+):\s*(.*)/);
    if (match) {
      currentKey = match[1];
      result[currentKey] = match[2].trim();
    } else if (currentKey && trimmed.startsWith(' ')) {
      result[currentKey] += '\n' + trimmed.trim();
    }
  }
  return result;
}

const order = Object.keys(divisions);
const allAgents = [];
const allDivs = [];

for (const div of order) {
  const divPath = path.join(repoRoot, div);
  if (!fs.existsSync(divPath)) continue;
  const agents = [];
  const files = walkMdFiles(divPath);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);
    if (fm && fm.name) {
      const relPath = path.relative(repoRoot, file).replace(/\\/g, '/');
      agents.push({
        slug: path.basename(file, '.md'),
        name: fm.name,
        description: (fm.description || '').trim(),
        emoji: (fm.emoji || '🤖').trim(),
        color: (fm.color || 'gray').trim(),
        vibe: (fm.vibe || '').trim(),
        path: relPath
      });
    }
  }
  allAgents.push(...agents);
  allDivs.push({ id: div, name: divisions[div], emoji: divEmoji[div] || '📁', count: agents.length });
}

fs.writeFileSync(outputFile, JSON.stringify({ agents: allAgents, divisions: allDivs }, null, 2), 'utf-8');
console.log(`Done: ${allAgents.length} agents, ${allDivs.length} divisions`);

function walkMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMdFiles(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}
