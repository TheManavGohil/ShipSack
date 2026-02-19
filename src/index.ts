import express from 'express'

const app = express()

// app.get('/:path(.*)', (req,res)=>{
// app.get('*', (req,res)=>{            // both stop working from express 5
app.use((req,res,next)=>{
    const host = req.hostname
    console.log(host)   //id.djscodeai.in
    const id = host.split('.')[0]
    console.log(id)     // (id,djscodeai,in)
})

app.listen(3001, () =>{
    console.log('Server is running on port 3001')
})