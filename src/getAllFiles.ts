import fs from "fs";
import path from "path"

export const getAllFiles = (folderPath : string )=>{  
    // current folderPath = D:\desktop\code-along\dist\output\jhsq1
    let result: string[] = [];

    const AllFilesandFolders = fs.readdirSync(folderPath);
    AllFilesandFolders.forEach(file => {
        const fullFilePath = path.join(folderPath, file);

        if(fs.statSync(fullFilePath).isDirectory()){
            result = result.concat(getAllFiles(fullFilePath));
        }else{
            result.push(fullFilePath)
        }
    })
    return result;
}