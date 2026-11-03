const http = require('http');
const fs = require('fs');

const eps = [
    '/api/assets', 
    '/api/personnel', 
    '/api/fleet', 
    '/api/stock', 
    '/api/dashboard', 
    '/api/hierarchy/tree', 
    '/api/departments', 
    '/api/buildings', 
    '/api/categories'
];

const backup = {};
let completed = 0;

eps.forEach(ep => {
    http.get('http://localhost:8080' + ep, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            try { backup[ep] = JSON.parse(d); } catch(e) { backup[ep] = d; }
            if (++completed === eps.length) {
                fs.writeFileSync('backups/api_data_snapshot_v1a.json', JSON.stringify(backup, null, 2));
                console.log('REST API full data snapshot saved to backups/api_data_snapshot_v1a.json');
            }
        });
    }).on('error', err => {
        console.error('Error on ' + ep, err);
    });
});
