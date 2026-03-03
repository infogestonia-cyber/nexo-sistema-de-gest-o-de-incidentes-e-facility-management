const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function findAndReplace(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            findAndReplace(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            const regexes = [
                { regex: /\brounded-(lg|xl|2xl|3xl|md)\b/g, replacement: 'rounded-sm' },
                { regex: /\brounded-\[\d+px\]\b/g, replacement: 'rounded-sm' }
            ];

            regexes.forEach(({ regex, replacement }) => {
                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                    modified = true;
                }
            });

            if (content.includes('rounded-full')) {
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('rounded-full') && !lines[i].includes('blur-')) {
                        lines[i] = lines[i].replace(/\brounded-full\b/g, 'rounded-sm');
                        modified = true;
                    }
                }
                content = lines.join('\n');
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

findAndReplace(directoryPath);
console.log('Done replacing rounded classes with square variants.');
