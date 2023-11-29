const gtfs = require("./gtfs.json");
const download = require("file-download");
const unzipper = require("unzipper");
const { rm, access, readdir, readFile, writeFile } = require("fs").promises;
const { createReadStream, createWriteStream } = require("fs");
const path = require('path');
const ref = require("./ref.json"); // Ajoute cette ligne pour définir ref
const { removeInvisibleCharacters } = require('remove-invisible-characters');


let linesCount = 0
const UniJSONPath = path.join(__dirname, "..", "UniJSON");
const tempDir = path.join(__dirname, "temp");

async function main() {
    try {
        await cleanupTempDir();
        await downloadAndProcessFiles();
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

async function cleanupTempDir() {
    try {
        await rm(tempDir, { recursive: true });
        console.log("Deleted temp folder from incomplete unijson conversion!");
    } catch (error) {
        console.error("Error cleaning up temp folder:", error);
    }
}

async function downloadAndProcessFiles() {
    const agencies = gtfs.agencies;
    
    for (const agency of agencies) {
        let i = 0;

        for (const url of agency.urls) {
            i++;
            await downloadFile(url, i, agency.name);
        }
    }
}

async function downloadFile(url, index, name) {
    try {
        console.log("Downloading: " + url);
        const tempDirOutput = path.join(tempDir, name);
        const filename = name + index + ".zip";
        const options = { directory: tempDirOutput, filename: filename };

        await downloadFileAsync(url, options);
        await unzipAndUniJSONify(tempDirOutput, filename, UniJSONPath, ref);
    } catch (error) {
        console.error("Error downloading file:", error);
    }
}


async function downloadFileAsync(url, options) {
    return new Promise((resolve, reject) => {
        download(url, options, (err) => {
            if (err) {
                reject(`Cannot download: ${options.filename}`);
            } else {
                console.log(`Downloaded successfully: ${options.filename}`);
                resolve();
            }
        });
    });
}

// ... (le reste de votre code)

async function unzipAndUniJSONify(dir, filename, output) {
    try {
        const fileJSON = {};
        const folder = path.join(dir, filename.split(".")[0]);
        const filenameShort = filename.split(".")[0];

        await createReadStream(path.join(dir, filename))
            .pipe(unzipper.Extract({ path: folder }))
            .on('entry', entry => entry.autodrain())
            .promise();

        console.log('Extracted: ' + filename);

        await rm(path.join(dir, filename));

        const files = await readdir(folder);

        for (const file of files) {
            const filePath = path.join(folder, file);
            const fileType = file.split(".")[0];

            const fileContent = await readFile(filePath, 'utf-8');

            console.log("Found " + fileType + " for " + filenameShort);

            await treatFile(fileContent, ref[fileType], fileType, path.join(output, filenameShort + ".json"), fileJSON);
        }
        console.log(linesCount, "lines of data treated")
    } catch (error) {
        console.error("Error in unzipAndUniJSONify:", error);
    }
}

async function treatFile(content, ref, type, out, fileJSON) {
    try {
        let fileLineTemp = content.split("\r\n");

        console.log("Found", fileLineTemp.length, "lines in", type);
        linesCount= linesCount+fileLineTemp.length
        let fileItem = [];
        fileLineTemp.forEach(line => {
            fileItem.push(line.split(","));
        });


        fileItem[0].forEach(item => {
            let ref2;
            ref.forEach(refer => ref2 = refer)
    
            let hasRef = false 
            if(ref2 = item){
                hasRef = true
            }
    
            if(!hasRef) {
                fileItem.unshift(ref)
            }
    
    
    
        })

        let temp = [];

        for (let i = 1; i < fileItem.length - 0; i++) {
            let temp2 = {};

            for (let j = 0; j < fileItem[0].length - 0; j++) {
                temp2[fileItem[0][j].replace(/[]/g, "")] = fileItem[i][j]
            }

            temp.push(temp2);
        }

        if (!fileJSON[type]) {
            fileJSON[type] = [];
        }

        fileJSON[type] = fileJSON[type].concat(temp);

        await writeFile(out, JSON.stringify(fileJSON), 'utf-8');
    } catch (err) {
        console.log("Error in treatFile:", err);
    }
}



main();  // Appelle la fonction principale pour démarrer le processus
