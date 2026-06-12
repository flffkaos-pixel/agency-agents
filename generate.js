const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname);

const divisions = {
  engineering: 'Engineering', design: 'Design', 'paid-media': 'Paid Media',
  sales: 'Sales', marketing: 'Marketing', product: 'Product',
  'project-management': 'Project Management', testing: 'Testing',
  security: 'Security', support: 'Support', 'spatial-computing': 'Spatial Computing',
  specialized: 'Specialized', academic: 'Academic', finance: 'Finance',
  'game-development': 'Game Development', gis: 'GIS'
};

const divKo = {
  engineering: '엔지니어링', design: '디자인', 'paid-media': '유료 미디어',
  sales: '세일즈', marketing: '마케팅', product: '프로덕트',
  'project-management': '프로젝트 관리', testing: '테스팅',
  security: '보안', support: '지원', 'spatial-computing': '공간 컴퓨팅',
  specialized: '스페셜리스트', academic: '학술', finance: '재무',
  'game-development': '게임 개발', gis: 'GIS'
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
      result[currentKey] = match[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    } else if (currentKey && trimmed.startsWith(' ')) {
      result[currentKey] += '\n' + trimmed.trim();
    }
  }
  return result;
}

function walkMdFiles(dir, excludePattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMdFiles(full, excludePattern));
    else if (entry.name.endsWith('.md') && !excludePattern.test(entry.name)) results.push(full);
  }
  return results;
}

const order = Object.keys(divisions);
const allEnAgents = [];
const allKoAgents = [];
const allDivs = [];

for (const div of order) {
  const divPath = path.join(repoRoot, div);
  if (!fs.existsSync(divPath)) continue;
  const enAgents = [];
  const koAgents = [];

  // English .md files (not .ko.md)
  const enFiles = walkMdFiles(divPath, /\.ko\.md$/);
  for (const file of enFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);
    if (fm && fm.name) {
      const relPath = path.relative(repoRoot, file).replace(/\\/g, '/');
      enAgents.push({
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

  // Korean .ko.md files
  const koFiles = walkMdFiles(divPath, /^(?!.*\.ko\.md$).*$/);
  for (const file of koFiles) {
    if (!file.endsWith('.ko.md')) continue;
    const content = fs.readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);
    if (fm && fm.name) {
      const relPath = path.relative(repoRoot, file).replace(/\\/g, '/');
      const slug = path.basename(file, '.ko.md');
      koAgents.push({
        slug: slug,
        name: fm.name,
        description: (fm.description || '').trim(),
        emoji: (fm.emoji || '🤖').trim(),
        color: (fm.color || 'gray').trim(),
        vibe: (fm.vibe || '').trim(),
        path: relPath
      });
    }
  }

  // Merge: for English agents, match Korean or fallback
  for (const en of enAgents) {
    allEnAgents.push(en);
    const ko = koAgents.find(k => k.slug === en.slug);
    if (ko) {
      allKoAgents.push(ko);
    } else {
      // Fallback to English
      allKoAgents.push({ ...en, path: en.path.replace('.md', '.ko.md') });
    }
  }

  allDivs.push({ id: div, name: divisions[div], koName: divKo[div] || divisions[div], emoji: divEmoji[div] || '📁', count: enAgents.length });
}

// Write English agents.json
fs.writeFileSync(path.join(repoRoot, 'agents.json'), JSON.stringify({ agents: allEnAgents, divisions: allDivs }, null, 2), 'utf-8');

// Write Korean agents.ko.json
const koDivs = allDivs.map(d => ({ ...d, name: d.koName }));
fs.writeFileSync(path.join(repoRoot, 'agents.ko.json'), JSON.stringify({ agents: allKoAgents, divisions: koDivs }, null, 2), 'utf-8');

const translatedCount = allKoAgents.filter(a => a.name !== allEnAgents.find(e => e.slug === a.slug)?.name).length;
console.log(`English: ${allEnAgents.length} agents, ${allDivs.length} divisions`);
console.log(`Korean: ${allKoAgents.length} agents (${translatedCount} translated, ${allKoAgents.length - translatedCount} English fallback)`);
