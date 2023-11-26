const gtfs = require("./gtfs.json");
const download = require("file-download");
let path = require('path')
const agencies = gtfs.agencies;
let unzipper = require ("unzipper")
let {rm, access, createReadStream, createWriteStream, readdir, readFile, writeFile } = require("fs");
let ref = require("./ref.json");
let fs = require("fs").promises

let UniJSONPath = path.join(__dirname, "..", "UniJSON")
let tempDir = path.join(__dirname, "temp")


access(tempDir, function(error) {
    if (!error) {
        rm(tempDir, { recursive: true }, err => {
            if (err) {
            throw err
            }
        
            console.log(`Deleted temp folder from incompleted unijson convertion !`)
        })
    }
})


// Parcourir les agences
agencies.forEach((agency) => {

    i = 0 
    agency.urls.forEach(url => {
        i++
        downloadFile(url, i, agency.name)
    })

});









async function downloadFile (url, index, name) {



    //Wrapping the code with an async function, just for the sake of example.
    console.log("Dowloading: " + url)
    let tempDirOutput = path.join(tempDir, name)
    let filename = name + i + ".zip" 
    var options = {
        directory: tempDirOutput,
        filename: filename
    }

    download(url, options, function(err){
        if (err) return console.log("Cannot download:" + filename)
        console.log("Downloaded succesfully:", filename)
        unzipAndUniJSONify(tempDirOutput, filename, UniJSONPath)
    })


}

async function unzipAndUniJSONify(dir, filename, output) {
    let fileJSON = {}

    let folder = path.join(dir, filename.split(".")[0])
    let filenameShort = filename.split(".")[0]

    createReadStream(path.join(dir, filename))
        .pipe(unzipper.Extract({ path: folder }))
        .on('entry', entry => entry.autodrain())
        .promise()
        .then(async () => {

            console.log('Extracted: ' + filename)

            rm(path.join(dir, filename), err => {

                if (err) {
                    console.log("Can't delete: " + filename)
                } else {
                    console.log("Deleted: " + filename)
                }

            })


            readdir(folder, async (err, files) => {
                if (err) {
                    console.log("Cannot get", filenameShort, "gtfs files\n", err)
                } else {
                    try {
                        const files = await fs.readdir(folder);
                
                        for (const file of files) {
                            const filePath = path.join(folder, file);
                            const fileType = file.split(".")[0];
                
                            try {
                                const fileContent = await fs.readFile(filePath, 'utf-8');

                                console.log("Found " + fileType + " for " + filenameShort);
                                
                                await treatFile(fileContent, ref[fileType], fileType, path.join(output, filenameShort + ".json"), fileJSON);
                            } catch (err) {
                                console.log("Cannot read", filePath, err);
                            }
                        }
                    } catch (err) {
                        console.error("Error reading folder:", err);
                    }
                }
            })
        },
        e => console.log('error',e));

}


function treatFile(content, ref, type, out, fileJSON) {
    let fileLineTemp = content.split("\r\n")

    console.log("Found", fileLineTemp.length, "lines in", type)

    let fileItem = []

    fileLineTemp.forEach(line => {
        fileItem.push(line.split(","))
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

    let temp = []
    for (let i = 1; i < fileItem.length; i++) {
    
        let temp2 = {}

        for (let j = 0; j < fileItem[0].length; j++) {
           temp2[fileItem[0][j]] = fileItem[i][j]
           temp.push(temp2)
        }
        //console.log(temp)
        fileJSON[type] = temp


    }
    writeFile(out, JSON.stringify(fileJSON), 'utf-8', (err) => {
        if(err) {
            console.log("Cannot write JSON", err)
        }
    }
    )
}

