'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, ImagePlus } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<{
    class: string;
    confidence: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  const handlePredict = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3002/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Failed to access camera', err);
      alert('Camera access denied or not supported on this browser.');
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    context.drawImage(videoRef.current, 0, 0, 256, 256);
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], 'capture.jpg', {
          type: 'image/jpeg',
        });
        setFile(capturedFile);
        setPreview(URL.createObjectURL(capturedFile));
        setShowCamera(false);
      }
    }, 'image/jpeg');
  };

  useEffect(() => {
    if (navigator.mediaDevices) {
      setCameraSupported(true);
    }
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <>
      <main
        className="min-h-screen bg-gradient-to-br from-green-100 to-white p-6 flex flex-col items-center gap-6"
        style={{ backgroundImage: "url('/background3.png')" }}
      >
        <h1 className="text-4xl font-bold text-green-800 pt-2 text-center">
          Potato Leaf Disease Classifier
        </h1>

        <Card className="w-full max-w-md p-6 flex flex-col gap-4 items-center shadow-2xl">
          <div
            {...getRootProps({
              className:
                'w-full h-52 flex items-center justify-center border-2 border-dashed border-green-400 rounded-xl cursor-pointer bg-white hover:bg-green-50 transition',
            })}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-green-700">Drop the image here ...</p>
            ) : (
              <p className="text-gray-500 flex items-center gap-2">
                <ImagePlus className="w-5 h-5" /> Drag & drop or click to upload
              </p>
            )}
          </div>

          {cameraSupported && (
            <>
              <p className="text-sm text-gray-400">Or take a photo:</p>
              <Button
                variant="outline"
                onClick={startCamera}
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" /> Open Camera
              </Button>
            </>
          )}

          <p className="text-sm text-gray-400">Preview: </p>
          {showCamera && (
            <div className="w-full h-64 relative rounded-xl overflow-hidden border bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                autoPlay
                muted
              />
              <Button
                onClick={captureImage}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white text-black hover:bg-green-600 hover:text-white cursor-pointer"
              >
                Capture
              </Button>
              <canvas
                ref={canvasRef}
                width={256}
                height={256}
                className="hidden"
              />
            </div>
          )}

          <div className="w-full h-64 rounded-xl shadow border bg-gray-100 flex items-center justify-center overflow-hidden p-8">
            {preview ? (
              <Image
                src={preview}
                width={300}
                height={220}
                alt="preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <Image
                src="/placeholder2.jpeg"
                alt="placeholder"
                width={300}
                height={220}
                className="w-full h-full object-contain opacity-40 mix-blend-multiply"
              />
            )}
          </div>

          <Button
            onClick={handlePredict}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={!file || loading}
          >
            {loading ? (
              'Analyzing...'
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" /> Predict Disease
              </>
            )}
          </Button>
        </Card>

        {result && (
          <Card className="w-full max-w-md p-4 text-center border-green-400 border-t-4">
            <CardContent>
              <p className="text-lg font-semibold text-green-700">
                Prediction: {result.class}
              </p>
              <p className="text-sm text-muted-foreground">
                Confidence: {(result.confidence * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <footer className="text-base text-gray-700 text-center border-t py-5 w-full">
        Built using FastAPI & Next.js by{' '}
        <Link
          target="_blank"
          className="text-blue-800 font-medium"
          href="https://github.com/modakverma-dev"
        >
          Modak Verma 🤓
        </Link>
      </footer>
    </>
  );
}
