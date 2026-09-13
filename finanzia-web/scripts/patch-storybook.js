const fs = require('fs');
const path = require('path');

const definePluginPath = path.resolve(__dirname, '../node_modules/webpack/lib/DefinePlugin.js');

if (fs.existsSync(definePluginPath)) {
  let content = fs.readFileSync(definePluginPath, 'utf8');
  const targetPattern = /parser\.hooks\.collectDestructuringAssignmentProperties\.tap\(/;
  const guard = 'if (parser.hooks.collectDestructuringAssignmentProperties) {\n\t\t\t\t\t\t\t\t\t';

  if (targetPattern.test(content) && !content.includes('if (parser.hooks.collectDestructuringAssignmentProperties)')) {
    content = content.replace(
      /(\s*)(parser\.hooks\.collectDestructuringAssignmentProperties\.tap\([\s\S]*?\n\s*\);)/,
      '$1if (parser.hooks.collectDestructuringAssignmentProperties) {\n$1\t$2\n$1}'
    );
    fs.writeFileSync(definePluginPath, content, 'utf8');
    console.log('[patch-storybook] Successfully patched DefinePlugin for Next.js 15 compatibility.');
  } else {
    console.log('[patch-storybook] DefinePlugin is already patched or up to date.');
  }
}
