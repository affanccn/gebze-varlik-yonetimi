const fs = require('fs');
const path = require('path');

function findControllers(dir) {
    let controllers = [];
    for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        const st = fs.statSync(full);
        if (st.isDirectory()) {
            controllers = controllers.concat(findControllers(full));
        } else if (item.endsWith('Controller.java')) {
            controllers.push(full);
        }
    }
    return controllers;
}

const controllerFiles = findControllers(path.resolve('src/main/java'));
const endpoints = [];

for (const file of controllerFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const className = path.basename(file, '.java');
    
    if (!content.includes('@RestController')) {
        continue;
    }

    const classIdx = content.indexOf('public class ' + className);
    if (classIdx === -1) continue;

    const classHeader = content.substring(0, classIdx);
    const classBody = content.substring(classIdx);

    let classPrefix = '';
    const classMappingMatch = classHeader.match(/@RequestMapping\(\s*(?:value\s*=\s*)?["']([^"']*)["']/);
    if (classMappingMatch) {
        classPrefix = classMappingMatch[1].trim();
        if (!classPrefix.startsWith('/')) classPrefix = '/' + classPrefix;
        if (classPrefix.endsWith('/')) classPrefix = classPrefix.slice(0, -1);
    }

    // Match mapping annotations
    const mappingRegex = /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*(?:\(([\s\S]*?)\))?\s*(?:@\w+\s*(?:\([\s\S]*?\)\s*)?)*\s*(?:public|protected)\s+[\w\<\>\[\],\s\?]+\s+([a-zA-Z0-9_]+)\s*\(/g;

    let match;
    while ((match = mappingRegex.exec(classBody)) !== null) {
        const annotationType = match[1];
        const rawArgs = (match[2] || '').trim();
        const methodName = match[3];

        let httpMethod = 'GET';
        if (annotationType === 'PostMapping') httpMethod = 'POST';
        else if (annotationType === 'PutMapping') httpMethod = 'PUT';
        else if (annotationType === 'DeleteMapping') httpMethod = 'DELETE';
        else if (annotationType === 'PatchMapping') httpMethod = 'PATCH';
        else if (annotationType === 'RequestMapping') {
            const methodMatch = rawArgs.match(/method\s*=\s*RequestMethod\.([A-Z]+)/);
            if (methodMatch) httpMethod = methodMatch[1];
            else httpMethod = 'GET';
        }

        let subPath = '';
        const pathMatch = rawArgs.match(/(?:value|path)\s*=\s*["']([^"']*)["']/) || rawArgs.match(/["']([^"']*)["']/);
        if (pathMatch) {
            subPath = pathMatch[1].trim();
        }

        let fullPath = classPrefix;
        if (subPath) {
            if (!subPath.startsWith('/')) subPath = '/' + subPath;
            fullPath = fullPath + subPath;
        }
        if (!fullPath) fullPath = '/';

        endpoints.push({
            controller: className,
            methodName,
            httpMethod,
            path: fullPath
        });
    }
}

// Sort by path then method
endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.httpMethod.localeCompare(b.httpMethod));

console.log(`Extracted ${endpoints.length} unique endpoint mappings:`);
endpoints.forEach((e, i) => {
    console.log(`${(i+1).toString().padStart(2)}. ${e.httpMethod.padEnd(6)} ${e.path.padEnd(45)} -> ${e.controller}.${e.methodName}`);
});
