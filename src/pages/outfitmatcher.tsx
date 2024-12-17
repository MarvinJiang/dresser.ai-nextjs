// pages/outfitmatcher.tsx
import { useState } from 'react'
import axios from 'axios'

const OutfitMatcher = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [displayedResult, setDisplayedResult] = useState<string>('') // New state for incremental display

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const uploadToS3 = async () => {
    if (!selectedFile) return
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      setLoading(true)
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setImageUrl(response.data.signedUrl)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const typeText = (text: string) => {
    let index = 0
    setDisplayedResult('') // Reset displayed result
    const typingSpeed = 50 // milliseconds per character
  
    const interval = setInterval(() => {
      setDisplayedResult((prev) => prev + text.charAt(index))
      index++
      if (index >= text.length) {
        clearInterval(interval)
      }
    }, typingSpeed)
  }

  const analyzeImage = async () => {
    if (!imageUrl) return
    try {
      setLoading(true)
      const response = await axios.post('/api/llama', { imageUrl })
      setResult(response.data.description)
      typeText(response.data.description) // Start incremental display
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Outfit Matcher</h1>

      <div className="mb-4">
      <img className="h-auto max-w-lg transition-all duration-300 rounded-lg cursor-pointer filter grayscale hover:grayscale-0" src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/content/content-gallery-3.png" alt="image description"/>

        <input type="file" accept="image/*" onChange={handleFileChange} className="mb-2" />
        <button
          onClick={uploadToS3}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      {imageUrl && (
        <div className="mb-4 text-center">
          <img src={imageUrl} alt="Uploaded" className="max-w-full h-auto mb-2" />
          <button
            onClick={analyzeImage}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {loading ? 'Analyzing...' : 'Analyze Image'}
          </button>
          <div className="mt-4 p-4 border rounded shadow-inner w-full max-w-lg">
            {displayedResult && <p>{displayedResult}</p>} {/* Display incremental result */}
          </div>
        </div>
      )}
    </div>
  )
}

export default OutfitMatcher