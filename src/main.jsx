import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import VideoStemPlayer from './VideoStemPlayer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VideoStemPlayer />
  </StrictMode>,
)
