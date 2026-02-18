import { spawn  } from "child_process";
import path from "path"

const __dirname = import.meta.dirname;

export function buildRepo(id : string){
    return new Promise((resolve, reject)=>{
        const repoPath = path.join(__dirname,"output",id)
        console.log("building repo at path : ", repoPath)

        const spawnOptions = {
            cwd : repoPath,
            stdio : "inherit" as const,   // to show the output of npm install and npm run build in the console
            shell: true // to ensure it works on windows as well ... not needed for linux and mac 
        }   

        const install = spawn("npm", ["install"], spawnOptions)

        install.on("close", (code: number | null)=>{
            if(code !== 0) return reject(new Error("npm i failed"))

            const build = spawn("npm", ["run","build"], spawnOptions)

            build.on("close", (code: number | null)=>{
                if(code !== 0) return reject(new Error("npm run build failed"))

                console.log("build successful for repo : ", id)
                resolve(true)
            })
        })
    })
}
