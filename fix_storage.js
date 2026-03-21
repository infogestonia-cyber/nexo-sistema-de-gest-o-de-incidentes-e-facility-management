const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
let changedCount = 0;
files.forEach(file => {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;
    
    code = code.replace(/localStorage\.getItem\('token'\)/g, "(sessionStorage.getItem('token') || localStorage.getItem('token'))");
    code = code.replace(/localStorage\.getItem\("token"\)/g, "(sessionStorage.getItem('token') || localStorage.getItem('token'))");
    
    code = code.replace(/localStorage\.getItem\('user'\)/g, "(sessionStorage.getItem('user') || localStorage.getItem('user'))");
    code = code.replace(/localStorage\.getItem\("user"\)/g, "(sessionStorage.getItem('user') || localStorage.getItem('user'))");
    
    code = code.replace(/localStorage\.getItem\('cliente_token'\)/g, "(sessionStorage.getItem('cliente_token') || localStorage.getItem('cliente_token'))");
    code = code.replace(/localStorage\.getItem\("cliente_token"\)/g, "(sessionStorage.getItem('cliente_token') || localStorage.getItem('cliente_token'))");
    
    code = code.replace(/localStorage\.getItem\('cliente_user'\)/g, "(sessionStorage.getItem('cliente_user') || localStorage.getItem('cliente_user'))");
    code = code.replace(/localStorage\.getItem\("cliente_user"\)/g, "(sessionStorage.getItem('cliente_user') || localStorage.getItem('cliente_user'))");

    if (code !== original) {
        fs.writeFileSync(file, code);
        changedCount++;
    }
});
console.log('Fixed ' + changedCount + ' files.');
