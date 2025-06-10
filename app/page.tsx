"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Download, FileAudio, Upload, Clock, CheckCircle2, Info, Youtube, FileUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Configure API URL here (change this to match your backend)
const API_BASE_URL = "http://192.168.1.12:2001"; // Change this to your server IP if needed

export default function MP3Converter() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("mp3");
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedFile, setConvertedFile] = useState<{
    name: string;
    size: string;
    bitrate: string;
    url: string;
  } | null>(null);
  const [isLoggedIn] = useState(true); // Mock login state
  const [error, setError] = useState<string | null>(null);
  const [isYouTubeError, setIsYouTubeError] = useState(false);
  // const [conversionHistory, setConversionHistory] = useState([
  //   {
  //     id: 1,
  //     name: "Summer Vibes.mp3",
  //     originalFormat: "YouTube",
  //     convertedFormat: "MP3",
  //     size: "4.2 MB",
  //     date: "2 hours ago",
  //   },
  //   {
  //     id: 2,
  //     name: "Podcast Episode 42.wav",
  //     originalFormat: "SoundCloud",
  //     convertedFormat: "WAV",
  //     size: "18.7 MB",
  //     date: "Yesterday",
  //   },
  //   {
  //     id: 3,
  //     name: "Acoustic Session.flac",
  //     originalFormat: "Spotify",
  //     convertedFormat: "FLAC",
  //     size: "24.1 MB",
  //     date: "3 days ago",
  //   },
  // ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear error on input change
  useEffect(() => {
    if (file || url) {
      setError(null);
      setIsYouTubeError(false);
    }
  }, [file, url]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setUrl("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUrl("");
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setFile(null);
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const handleConvert = async () => {
    if (!file && !url) {
      setError("Please upload a file or enter a URL");
      return;
    }

    setIsConverting(true);
    setProgress(0);
    setConvertedFile(null);
    setError(null);
    setIsYouTubeError(false);

    // Validate URL format if URL provided
    if (url && !file) {
      // Basic URL validation for common audio/video platforms
      const validUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|soundcloud\.com|spotify\.com)/i;
      if (!validUrlPattern.test(url)) {
        setError("Please enter a valid YouTube, SoundCloud, or Spotify URL");
        setIsConverting(false);
        return;
      }
    }

    let progressInterval;
    
    try {
      // Start progress animation
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          // Slow down progress as it gets higher to give more realistic feeling
          if (prev < 30) return prev + 3;
          if (prev < 50) return prev + 2;
          if (prev < 80) return prev + 1;
          if (prev < 95) return prev + 0.5;
          return 95;
        });
      }, 200);

      // Prepare form data
      const formData = new FormData();

      if (file) {
        formData.append("file", file);
        
        // Add some basic file validation
        const validAudioTypes = ['audio/', 'video/'];
        let validType = false;
        
        for (const type of validAudioTypes) {
          if (file.type.startsWith(type)) {
            validType = true;
            break;
          }
        }
        
        if (!validType) {
          console.warn("File might not be a valid audio/video file:", file.type);
          // We'll still try to convert it, but log a warning
        }
      } else if (url) {
        formData.append("url", url);
      }

      formData.append("format", format);

      console.log("Sending conversion request for format:", format);
      
      // Send to API
      const response = await fetch(`${API_BASE_URL}/api/convert`, {
        method: "POST",
        body: formData,
      });

      // Clear progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      // Parse response
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("Server returned error:", responseData);
        
        // Check if this is a YouTube error
        if (url && isYouTubeUrl(url) && 
            responseData.error && 
            (responseData.error.includes('YouTube') || 
             responseData.error.includes('bot') || 
             responseData.error.includes('verification'))) {
          setIsYouTubeError(true);
        }
        
        throw new Error(responseData.error || "Conversion failed");
      }

      setProgress(100);
      console.log("Conversion successful:", responseData);

      // Set converted file data from backend
      setConvertedFile({
        name: responseData.name,
        size: responseData.size,
        bitrate: responseData.bitrate,
        url: responseData.downloadUrl,
      });

      // Add to conversion history
      const newHistoryItem = {
        id: Date.now(),
        name: responseData.name,
        originalFormat: file ? (file.type.split('/')[1] || "Unknown").toUpperCase() : "URL",
        convertedFormat: format.toUpperCase(),
        size: responseData.size,
        date: "Just now",
      };

      //setConversionHistory([newHistoryItem, ...conversionHistory.slice(0, 4)]);

    } catch (error) {
      console.error("Conversion error:", error);
      
      // Provide more user-friendly error messages based on common issues
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes("ffmpeg") || errorMessage.includes("command not found")) {
          setError("Server configuration issue: FFmpeg not installed. Please contact support.");
        } else if (errorMessage.includes("url") && errorMessage.includes("process")) {
          setError("Could not process this URL. Please try uploading the file directly or use a different URL.");
        } else {
          setError(error.message);
        }
      } else {
        setError("An unknown error occurred during conversion");
      }
    } finally {
      // Ensure progress interval is cleared in all cases
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsConverting(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = () => {
    if (convertedFile?.url) {
      try {
        // Create a full URL from the base URL and the download path
        const downloadUrl = `${API_BASE_URL}${convertedFile.url}`;
        console.log("Attempting to download from:", downloadUrl);
        
        // For better user experience, create a download link and click it
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = convertedFile.name; // Suggest filename to browser
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error("Download error:", error);
        setError("Error downloading the file. Please try again.");
      }
    } else {
      setError("No URL available for the converted file.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileAudio className="h-6 w-6 text-teal-500" />
            <h1 className="text-xl font-semibold text-gray-800">
              AudioConvert
            </h1>
          </div>
          {/* <Button variant="ghost" size="sm">
            {isLoggedIn ? "My Account" : "Sign In"}
          </Button> */}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Convert Audio Files Easily
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Drop your file, paste a URL, select your format, and convert with
            just one click. Fast, secure, and high-quality conversions.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          {/* Error message */}
          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-all duration-200",
              file
                ? "border-teal-500 bg-teal-50"
                : "border-gray-300 hover:border-teal-400"
            )}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="audio/*,video/*"
              onChange={handleFileChange}
            />

            <div className="flex flex-col items-center justify-center space-y-3 cursor-pointer">
              {file ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-teal-500" />
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-800">
                      Drag & drop your audio file here
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse your files
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* URL Input */}
          <div className="mb-6">
            <label
              htmlFor="url-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Or paste a YouTube, SoundCloud, or Spotify URL
            </label>
            <Input
              id="url-input"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={handleUrlChange}
              className="w-full"
            />
          </div>

          {/* Format Selection & Convert Button */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="w-full sm:w-1/3">
              <label
                htmlFor="format-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Output Format
              </label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="format-select">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp3">MP3</SelectItem>
                  <SelectItem value="wav">WAV</SelectItem>
                  <SelectItem value="aac">AAC</SelectItem>
                  <SelectItem value="flac">FLAC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-2/3 flex items-end">
              <Button
                className="w-full bg-teal-500 hover:bg-teal-600 transition-all duration-200 shadow-md hover:shadow-lg"
                size="lg"
                onClick={handleConvert}
                disabled={isConverting || (!file && !url)}
              >
                {isConverting ? "Converting..." : "Convert Now"}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {isConverting && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Converting...
                </span>
                <span className="text-sm font-medium text-teal-600">
                  {progress}%
                </span>
              </div>
              <Progress
                value={progress}
                className="h-2 bg-gray-200"
              />
            </div>
          )}

          {/* Download Section */}
          {convertedFile && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Conversion Complete!
                </h3>
                <CheckCircle2 className="h-5 w-5 text-teal-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-3 rounded-md border border-gray-200">
                  <p className="text-xs text-gray-500">File Name</p>
                  <p className="font-medium text-gray-800 truncate">
                    {convertedFile.name}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-md border border-gray-200">
                  <p className="text-xs text-gray-500">File Size</p>
                  <p className="font-medium text-gray-800">
                    {convertedFile.size}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-md border border-gray-200">
                  <p className="text-xs text-gray-500">Bitrate</p>
                  <p className="font-medium text-gray-800">
                    {convertedFile.bitrate}
                  </p>
                </div>
              </div>

              <Button
                className="w-full bg-teal-500 hover:bg-teal-600"
                onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Converted File
              </Button>
            </div>
          )}
        </div>

        {/* Conversion History */}
        {isLoggedIn && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Recent Conversions
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-teal-500 hover:text-teal-600"
              >
                <Clock className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Converted</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* {conversionHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.originalFormat}</TableCell>
                      <TableCell>{item.convertedFormat}</TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))} */}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-gray-300 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-3">AudioConvert</h3>
              <p className="text-sm">
                The easiest way to convert audio files online. Fast, secure, and
                high-quality conversions.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">
                Supported Formats
              </h3>
              <ul className="text-sm space-y-1">
                <li>MP3 - Compact size, good quality</li>
                <li>WAV - Lossless audio format</li>
                <li>AAC - Advanced Audio Coding</li>
                <li>FLAC - Free Lossless Audio Codec</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Help & Support</h3>
              <ul className="text-sm space-y-1">
                <li>
                  <a href="#" className="hover:text-white">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-6 text-sm text-center">
            &copy; {new Date().getFullYear()} AudioConvert. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}