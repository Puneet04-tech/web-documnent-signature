import React, { useState, useEffect } from 'react'

interface VideoBackgroundProps {
  videoUrl?: string
  opacity?: number
  blur?: number
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ 
  videoUrl = "/background.mp4",
  opacity = 0.3,
  blur = 2
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  console.log('VideoBackground rendered with URL:', videoUrl)

  useEffect(() => {
    const video = document.getElementById('bg-video') as HTMLVideoElement
    if (video) {
      video.playbackRate = 0.5 // Slow down for subtle effect
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.autoplay = true
      
      // Add event listeners for better debugging
      video.addEventListener('load', () => setIsLoaded(true))
      video.addEventListener('error', (e) => {
        console.error('Video loading error:', e)
        setHasError(true)
      })
      
      video.play().catch(e => console.log('Video autoplay prevented:', e))
    }
  }, [])

  // Fallback UI if video fails to load
  if (hasError) {
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-gray-900">
        <div className="text-white text-center p-4">
          <p className="mb-2">⚠️ Background video unavailable</p>
          <p className="text-sm text-gray-400">Using gradient background instead</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Video Background Layer */}
      <div 
        className="fixed inset-0 z-0 overflow-hidden"
        style={{
          background: 'black'
        }}
      >
        <video
          id="bg-video"
          className="w-full h-full object-cover"
          style={{
            opacity: opacity,
            filter: `blur(${blur}px)`,
            transform: 'scale(1.1)' // Slight zoom to cover edges
          }}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setIsLoaded(true)}
          onError={(e) => {
            console.error('Video loading error:', e)
            setHasError(true)
          }}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Dark overlay for better text contrast */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(7,18,41,0.85) 0%, rgba(15,50,42,0.75) 50%, rgba(63,43,91,0.85) 100%)',
          }}
        />
      </div>

      {/* Loading fallback */}
      {!isLoaded && !hasError && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-gray-900">
          <div className="text-white text-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-2">Loading background...</p>
          </div>
        </div>
      )}
    </>
  )
}

export default VideoBackground
