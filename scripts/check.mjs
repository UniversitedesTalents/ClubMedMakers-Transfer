import {readFile,stat} from 'node:fs/promises';
import {validateRows} from '../server/core.mjs';
for(const file of ['public/index.html','public/app.js','public/styles.css','public/assets/opio-club-med.png','public/assets/club-med-makers.png','netlify.toml']){
 if((await stat(file)).size===0)throw new Error(`Empty file: ${file}`);
}
const records=validateRows(JSON.parse(await readFile('data/test-transfers.json','utf8')));
const html=await readFile('public/index.html','utf8');
if(/netlify-site-id|Find your group/.test(html))throw new Error('Old group page content remains.');
console.log(`Build checked: ${records.length} arrival records; private server data; public assets ready.`);
