import fs from "fs";
import path from "path"

export const getAllFiles = (folderPath : string ) :string[] => {  
    // current folderPath = D:\desktop\code-along\dist\output\jhsq1
    let result: string[] = [];

    const AllFilesandFolders = fs.readdirSync(folderPath);
    AllFilesandFolders.forEach(file => {
        const fullFilePath = path.join(folderPath, file);

        if(fs.statSync(fullFilePath).isDirectory()){
            if(file === "node_modules" || file === ".git") return; // skip node_modules and .git folders
            result = result.concat(getAllFiles(fullFilePath));
        }else{
            result.push(fullFilePath)
        }
    })
    return result;
}