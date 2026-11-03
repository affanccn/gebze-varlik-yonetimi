const http = require('http');
const fs = require('fs');
const path = require('path');

const snapshotPath = path.join(__dirname, '..', 'docs', 'snapshot_before_v9.json');
const snapshotJson = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const beforeAssets = snapshotJson.assets;

http.get('http://localhost:8080/api/assets', (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
        const afterAssets = JSON.parse(raw);
        console.log(`Before asset count: ${beforeAssets.length}`);
        console.log(`After asset count: ${afterAssets.length}`);

        if (beforeAssets.length !== afterAssets.length) {
            console.error(`COUNT MISMATCH! Expected ${beforeAssets.length}, got ${afterAssets.length}`);
            process.exit(1);
        }

        const beforeMap = new Map(beforeAssets.map(a => [a.id, a]));
        let diffCount = 0;

        for (const after of afterAssets) {
            const before = beforeMap.get(after.id);
            if (!before) {
                console.error(`Asset ID ${after.id} not found in pre-snapshot!`);
                diffCount++;
                continue;
            }

            // Map fields (REST API DTO uses camelCase: departmentId vs department_id)
            const comparisons = [
                { name: 'id', b: before.id, a: after.id },
                { name: 'code', b: before.code, a: after.code },
                { name: 'barcode', b: before.barcode, a: after.barcode },
                { name: 'name', b: before.name, a: after.name },
                { name: 'department_id', b: before.department_id, a: after.departmentId ?? after.department_id },
                { name: 'building_id', b: before.building_id, a: after.buildingId ?? after.building_id },
                { name: 'floor_id', b: before.floor_id, a: after.floorId ?? after.floor_id },
                { name: 'room_id', b: before.room_id, a: after.roomId ?? after.room_id },
                { name: 'status', b: before.status, a: after.status }
            ];

            for (const c of comparisons) {
                const bStr = c.b === null || c.b === undefined ? '' : String(c.b);
                const aStr = c.a === null || c.a === undefined ? '' : String(c.a);
                if (bStr !== aStr) {
                    console.error(`DIFF on Asset ${after.id} (${after.code}) field '${c.name}': before='${bStr}', after='${aStr}'`);
                    diffCount++;
                }
            }
        }

        console.log(`Field comparison diff count across all 74 assets: ${diffCount}`);
        if (diffCount === 0) {
            console.log('SUCCESS: ZERO DIFF! All 74 assets match the pre-V9 snapshot perfectly.');
        } else {
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error('HTTP Request failed:', err);
    process.exit(1);
});
