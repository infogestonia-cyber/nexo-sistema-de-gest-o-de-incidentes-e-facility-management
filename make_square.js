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

            // Replace border-radius classes EXCEPT those on background light blobs (which usually have w-96 h-96 or w-[50%] and blur-)
            // A simple regex: replace rounded-lg, rounded-xl, rounded-2xl, rounded-3xl, rounded-[32px] with rounded-none or rounded-sm.
            // User requested "quadradas e não meio circulo". So `rounded-sm` is a very subtle 2px rounding, or `rounded-none`. We'll use `rounded-sm` for a sharp but polished look.

            const regexes = [
                { regex: /\brounded-(lg|xl|2xl|3xl|md)\b/g, replacement: 'rounded-sm' },
                { regex: /\brounded-\[\d+px\]\b/g, replacement: 'rounded-sm' },
                // Replace rounded-full but avoid background orbs that have 'blur-' close by or 'w-' 'h-' absolute.
                // It's safer to just replace rounded-full on known elements like badges or buttons. Actually, badges with rounded-sm look like small rectangles, which is exactly what the user wants.
            ];

            regexes.forEach(({ regex, replacement }) => {
                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                    modified = true;
                }
            });

            // Special case for rounded-full
            if (content.includes('rounded-full')) {
                // Replace rounded-full where it's clearly not a background orb.
                // A simple heuristic: if it doesn't contain 'blur-', we replace it.
                // Wait, some regular elements might have blur? No.
                // Let's do a line-by-line replacement for rounded-full
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
