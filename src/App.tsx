import { useState } from "react"
import axios from "axios"

const BACKEND_URL = "http://localhost:3000"

export default function DeployPage() {
  const [repoUrl, setRepoUrl] = useState("")
  const [deploymentId, setDeploymentId] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  const handleDeploy = async () => {
    try {
      setLoading(true)
      setStatus("uploaded")

      const res = await axios.post(`${BACKEND_URL}/deploy`, {
        repoURL: repoUrl,   
      })

      console.log("FULL RESPONSE:", res);
      console.log("DATA:", res.data);
      const id = res.data.id
      console.log(`Received deployment ID: ${id}`)
      setDeploymentId(id)

      const interval = setInterval(async () => {
        try {
          const response = await axios.get(
            `${BACKEND_URL}/status/${id}`
          )

          const currentStatus = response.data.status
          console.log(`Current status for ${id}: ${currentStatus}`)
          setStatus(currentStatus)

          if (currentStatus === "deployed") {
            clearInterval(interval)
            setLoading(false)

            const deployedUrl = `http://${id}.localhost:3001`
            window.open(deployedUrl, "_blank")
          }
        } catch (err) {
          console.error(err)
          clearInterval(interval)
          setLoading(false)
        }
      }, 5000)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-6">
          Mini Vercel Clone 🚀
        </h1>

        <input
          type="text"
          placeholder="Enter GitHub repo URL"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="w-full p-3 rounded-md bg-gray-700 text-white outline-none mb-4"
        />

        <button
          onClick={handleDeploy}
          disabled={loading || !repoUrl}
          className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-md font-semibold disabled:opacity-50"
        >
          {loading ? `Deploying...${deploymentId}` : "Deploy"}
        </button>

        {deploymentId && (
          <div className="mt-6 text-gray-300 text-sm">
            <p>
              <span className="font-semibold">ID:</span> {deploymentId}
            </p>
            <p>
              <span className="font-semibold">Status:</span> {status}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
