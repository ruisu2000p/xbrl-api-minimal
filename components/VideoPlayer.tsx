'use client'

import React from 'react'

interface VideoPlayerProps {
  videoUrl?: string
  title?: string
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  width?: string
  height?: string
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  title = 'XBRL Financial Demo',
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  width = '100%',
  height = 'auto'
}) => {
  // YouTube埋め込みの場合
  if (videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be')) {
    const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]
    return (
      <div className="relative aspect-video w-full">
        <iframe
          width={width}
          height={height}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    )
  }

  // 直接動画ファイルの場合
  return (
    <video
      width={width}
      height={height}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      controls={controls}
      className="rounded-lg shadow-lg"
    >
      <source src={videoUrl} type="video/mp4" />
      お使いのブラウザは動画タグをサポートしていません。
    </video>
  )
}

export default VideoPlayer