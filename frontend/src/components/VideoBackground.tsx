import React, { ReactNode } from 'react';

interface VideoBackgroundProps {
  children: ReactNode;
  videoSrc?: string;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ 
  children, 
  videoSrc = "/videos/7020078_Tunnel_Cube_3840x2160.mp4" 
}) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Video Background */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Overlay for better content visibility */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/40 pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 pointer-events-auto">
        {children}
      </div>
    </div>
  );
};

export default VideoBackground;
