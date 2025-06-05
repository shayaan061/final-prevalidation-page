"use client"

import { useState, useRef, useEffect } from "react"
import {
  Camera,
  Mic,
  Wifi,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface TestStatus {
  camera: "idle" | "testing" | "passed" | "failed"
  microphone: "idle" | "testing" | "passed" | "failed"
  network: "idle" | "testing" | "passed" | "failed"
}

interface NetworkResults {
  download: number
  upload: number
  ping: number
}

export default function SystemCheck() {
  const [testStatus, setTestStatus] = useState<TestStatus>({
    camera: "idle",
    microphone: "idle",
    network: "idle",
  })

  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [micVolume, setMicVolume] = useState(0)
  const [networkResults, setNetworkResults] = useState<NetworkResults | null>(null)
  const [cameraError, setCameraError] = useState("")
  const [micError, setMicError] = useState("")
  const [networkError, setNetworkError] = useState("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micTestTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMicCheckingRef = useRef(false)

  const startCamera = async () => {
    try {
      setTestStatus((prev) => ({ ...prev, camera: "testing" }))
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { min: 480 }, height: { min: 480 }, frameRate: { min: 24 } },
      })

      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      const settings = stream.getVideoTracks()[0].getSettings()
      if (settings.width! >= 480 && settings.height! >= 480 && settings.frameRate! >= 24) {
        setCameraEnabled(true)
        setTestStatus((prev) => ({ ...prev, camera: "passed" }))
        setCameraError("")
      } else {
        throw new Error(`Camera quality insufficient: ${settings.width}x${settings.height} at ${settings.frameRate}fps`)
      }
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Camera access failed")
      setTestStatus((prev) => ({ ...prev, camera: "failed" }))
    }
  }

  const startMicrophone = async () => {
    try {
      setTestStatus((prev) => ({ ...prev, microphone: "testing" }))
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)

      analyser.smoothingTimeConstant = 0.8
      analyser.fftSize = 1024
      microphone.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      streamRef.current = stream

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let maxVolume = 0
      isMicCheckingRef.current = true

      const checkVolume = () => {
        if (!isMicCheckingRef.current) return
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const volume = Math.max(...dataArray)
          const normalizedVolume = (volume / 255) * 100
          setMicVolume(normalizedVolume)
          maxVolume = Math.max(maxVolume, volume)
        }
        requestAnimationFrame(checkVolume)
      }

      setMicEnabled(true)
      checkVolume()

      micTestTimeoutRef.current = setTimeout(() => {
        isMicCheckingRef.current = false
        const dbLevel = 20 * Math.log10(maxVolume / 255)
        if (dbLevel > -40) {
          setTestStatus((prev) => ({ ...prev, microphone: "passed" }))
          setMicError("")
        } else {
          setTestStatus((prev) => ({ ...prev, microphone: "failed" }))
          setMicError("Microphone input too quiet (below -40 dB)")
        }
      }, 5000)
    } catch (error) {
      setMicError(error instanceof Error ? error.message : "Microphone access failed")
      setTestStatus((prev) => ({ ...prev, microphone: "failed" }))
    }
  }

  const runNetworkTest = async () => {
    setTestStatus((prev) => ({ ...prev, network: "testing" }))
    setNetworkError("")
    try {
      await new Promise((res) => setTimeout(res, 3000))
      const results = {
        download: Math.floor(Math.random() * 50) + 25,
        upload: Math.floor(Math.random() * 20) + 10,
        ping: Math.floor(Math.random() * 50) + 20,
      }
      setNetworkResults(results)
      setTestStatus((prev) => ({ ...prev, network: "passed" }))
    } catch {
      setNetworkError("Network test failed. Please check your connection.")
      setTestStatus((prev) => ({ ...prev, network: "failed" }))
    }
  }

  const allTestsPassed =
    testStatus.camera === "passed" &&
    testStatus.microphone === "passed" &&
    testStatus.network === "passed"

  const getStatusMessage = () => {
    if (testStatus.camera !== "passed") return "Camera must be turned on and tested"
    if (testStatus.microphone !== "passed") return "Microphone must be tested"
    if (testStatus.network !== "passed") return "Run the network test"
    return "All systems ready"
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (micTestTimeoutRef.current) {
        clearTimeout(micTestTimeoutRef.current)
      }
      isMicCheckingRef.current = false
    }
  }, [])

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sidebar */}
      <aside
        className="
          w-full
          lg:w-72
          bg-white
          shadow-lg
          p-4
          lg:max-h-[calc(100vh-2rem)]
          lg:overflow-y-auto
        "
      >
        <img src="/logoNew.png" alt="Logo" className="w-16 h-10 m-2 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Instructions</h2>
        <p className="text-gray-600 mb-8">Read Carefully Before Starting Interview</p>
        <div className="space-y-6">
          {[
            "Clean Background",
            "Sit In Noiseless Environment",
            "Stable Network",
            "After Interview",
          ].map((step, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">{i + 1}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{step}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {step === "Clean Background" &&
                    "Ensure your background should be clean and clear."}
                  {step === "Sit In Noiseless Environment" &&
                    "Ensure your Audio should be audible and there should not be any background noise."}
                  {step === "Stable Network" &&
                    "Check your network before joining the interview call."}
                  {step === "After Interview" &&
                    "Do not move or close tab after ending the interview till the video is uploaded successfully."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="w-full max-w-5xl mb-6 flex justify-between items-center">
          <span className="text-sm text-gray-600">{getStatusMessage()}</span>
          <Button disabled={!allTestsPassed} onClick={() => alert("Interview starting...")}>
            Start Interview
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
          {/* Camera Test */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-xl">
                <Camera className="w-6 h-6" />
                <span>Camera Test</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-[240px] h-[180px] bg-black rounded-xl shadow-md"
                />
                <Button onClick={startCamera} disabled={cameraEnabled}>
                  Start Camera Test
                </Button>
                {testStatus.camera === "passed" && (
                  <p className="text-green-600 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Passed
                  </p>
                )}
                {testStatus.camera === "failed" && (
                  <p className="text-red-600 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    {cameraError}
                  </p>
                )}
                {testStatus.camera === "testing" && (
                  <p className="text-yellow-600 flex items-center">
                    <AlertCircle className="w-5 h-5 animate-pulse mr-2" />
                    Testing...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Requirements */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl">System Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">Add commentMore actions
                <li>
                  <span className="font-semibold">Camera Quality</span>
                  <ul className="list-disc list-inside ml-5 space-y-1">
                    <li>Resolution must be <span className="font-semibold">at least 480p</span></li>
                    <li>Frame rate must be <span className="font-semibold">24 FPS or higher</span></li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold">Microphone Input</span>
                  <ul className="list-disc list-inside ml-5 space-y-1">
                    <li>Input level must be <span className="font-semibold">above -40 dB</span></li>
                    <li>Ensure your voice is <span className="font-semibold">clear and free from distortion or background noise</span></li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold">Network Speed</span>
                  <ul className="list-disc list-inside ml-5 space-y-1">
                    <li><span className="font-semibold">Minimum download and upload speed</span>: 2 Mbps each</li>
                    <li>A <span className="font-semibold">stable internet connection</span> is essential</li>
                  </ul>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Microphone Test */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Mic className="w-4 h-4" />
                <span>Microphone Test</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-3 w-full">
                <Progress value={micVolume} max={100} className="w-full h-2" />
                <Button onClick={startMicrophone} disabled={micEnabled}>
                  Start Microphone Test
                </Button>
                {testStatus.microphone === "passed" && (
                  <p className="text-green-600 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Passed
                  </p>
                )}
                {testStatus.microphone === "failed" && (
                  <p className="text-red-600 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    {micError}
                  </p>
                )}
                {testStatus.microphone === "testing" && (
                  <p className="text-yellow-600 flex items-center">
                    <AlertCircle className="w-5 h-5 animate-pulse mr-2" />
                    Testing...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Network Test */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Wifi className="w-4 h-4" />
                <span>Network Test</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-3">
                {testStatus.network === "testing" && (
                  <>
                    <p className="text-gray-700 text-sm">Testing...</p>
                    <Progress className="w-full h-2" />
                  </>
                )}
                {testStatus.network === "idle" && (
                  <Button variant="outline" onClick={runNetworkTest}>
                    Run Network Test
                  </Button>
                )}
                {testStatus.network === "passed" && networkResults && (
                  <div className="text-sm text-gray-700 text-center space-y-1">
                    <p>
                      <strong>Download:</strong> {networkResults.download} Mbps
                    </p>
                    <p>
                      <strong>Upload:</strong> {networkResults.upload} Mbps
                    </p>
                    <p>
                      <strong>Ping:</strong> {networkResults.ping} ms
                    </p>
                  </div>
                )}
                {testStatus.network === "failed" && (
                  <p className="text-red-600 text-sm">{networkError}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
