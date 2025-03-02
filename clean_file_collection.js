const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const DIRECTORY_PATH = process.env.DIR_PATH; 

if (!DIRECTORY_PATH) {
    console.error("Environment variable DIR_PATH is not set.");
    process.exit(1);
}

function getFilesInDirectory(directory) {
    return fs.readdirSync(directory).map(file => path.join(directory, file));
}

function getFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', reject);
    });
}

async function cleanDirectory(directory) {
    const files = getFilesInDirectory(directory);
    const seenFiles = new Set();
    const badFiles = [];

    for (const filePath of files) {
        if (!isValidFile(filePath)) {
            console.log(`Invalid file detected: ${filePath}`);
            badFiles.push(filePath);
            continue;
        }

        const fileHash = await getFileHash(filePath);

        if (seenFiles.has(fileHash)) {
            console.log(`Duplicate file detected: ${filePath}`);
            fs.unlinkSync(filePath);
            continue;
        }

        seenFiles.add(fileHash);
    }

    handleBadFiles(badFiles);
}

function isValidFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.gp3' || ext === '.gp4' || ext === '.gp5';
}

function handleBadFiles(badFiles) {
    if (badFiles.length > 0) {
        console.log("Bad files detected:");
        badFiles.forEach((file) => {
            console.log(file);
            fs.unlinkSync(file);
        });
    } else {
        console.log("No bad files detected.");
    }
}

console.log('Cleaning up directory:', DIRECTORY_PATH);
cleanDirectory(DIRECTORY_PATH).then(() => {
    console.log('Directory cleaned up!');
}).catch(err => {
    console.error('Error cleaning up directory:', err);
});
