import { useState, useRef, useEffect } from 'react'
import './App.css'
import Greeting from './Greeting.jsx';
import ThemeToggle from './components/ThemeToggle'
import TextHighlighter from './components/TextHighlighter'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

function App() {
  const [files, setFiles] = useState([])
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await fetch(`${API_URL}/start-session`, {
          method: 'POST'
        })
        if (!response.ok) throw new Error('Failed to start session')
        const data = await response.json()
        setSessionId(data.session_id)
      } catch (error) {
        console.error('Error starting session:', error)
      }
    }
    startSession()

    return () => {
      if (sessionId) {
        fetch(`${API_URL}/session/${sessionId}`, {
          method: 'DELETE'
        }).catch(error => console.error('Error cleaning up session:', error))
      }
    }
  }, [])

  const handleFileUpload = async (e) => {
    if (!sessionId) {
      console.error('No active session')
      return
    }

    const uploadedFiles = Array.from(e.target.files)
    setFiles(uploadedFiles)
    
    const formData = new FormData()
    formData.append('session_id', sessionId)
    uploadedFiles.forEach(file => {
      formData.append('files', file)
    })
    
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }
      
      const result = await response.json()
      console.log('Upload successful:', result)
    } catch (error) {
      console.error('Error uploading files:', error)
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || !sessionId) return

    const newMessage = { role: 'user', content: message }
    setChatHistory(prev => [...prev, newMessage])
    
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId
        })
      })

      if (!response.ok) throw new Error('Chat request failed')
      
      const result = await response.json()
      setChatHistory(prev => [...prev, { role: 'assistant', content: result.answer }])
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
      setMessage('')
    }
  }

  return (
    <div className="container">
      <div className="header-container">
        <h1><Greeting/></h1>
        <div className="header-controls">
          <ThemeToggle />
        </div>
      </div>

      <div className="upload-section">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          accept=".pdf"
          style={{ display: 'none' }}
        />
        <button 
          onClick={() => fileInputRef.current.click()}
          disabled={isLoading}
        >
          Upload PDFs
        </button>
        {files.length > 0 && (
          <div className="file-list">
            <h3>Uploaded Files:</h3>
            <ul>
              {files.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="chat-container">
        <div className="chat-history">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
              <TextHighlighter>
                <p>{msg.content}</p>
              </TextHighlighter>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="chat-input">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
