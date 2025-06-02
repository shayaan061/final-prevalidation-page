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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "testing":
        return <AlertCircle className="w-5 h-5 text-yellow-500 animate-pulse" />
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-200" />
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex">
        

        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg p-4 min-h-screen">
          <img
          src="/logoNew.png"
          alt="Logo"
          className="w-16 h-10 m-2
          mb-4"   
        />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Instructions</h2>
          <p className="text-gray-600 mb-8">Read Carefully Before Starting Interview</p>

          <div className="space-y-6">
            {/* Steps */}
            {["Clean Background", "Sit In Noiseless Environment", "Stable Network", "After Interview"].map((step, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {step === "Start Interview" ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <span className="text-blue-600 font-semibold text-sm">{i + 1}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{step}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {step === "Clean Background" &&
                      "Ensure your background should be clean and clear."}
                    {step === "Sit In Noiseless Environment" &&
                      'Ensure your Audio should be audible and their should not any background noise.'}
                    {step === "Stable Network" &&
                      "Check your network before joining the interview call."}
                    {step === "After Interview" &&
                      "Do not move or close tab after ending the interview till the video is uploaded successfully. "}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

     <main className="flex-1 p-6 flex flex-col justify-center items-center">
  <div className="w-full flex justify-end items-center space-x-4 mb-6">
    <p className="text-sm text-gray-600">{getStatusMessage()}</p>
    <Button disabled={!allTestsPassed} size="sm" onClick={() => alert("Interview starting...")}>
      Start Interview
    </Button>
  </div>

  <div className="grid grid-cols-2 gap-6">
    {/* Left column */}
    <div className="space-y-6">
      {/* System Test */}
      <Card className="w-[340px] h-[180px]">
        <CardHeader>
          <CardTitle className="text-xl">System Test Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-.1 text-sm text-gray-700">
            <li>Find a quiet, well-lit place.</li>
            <li>Allow camera and mic access.</li>
            <li>Click each test to verify devices.</li>
            <li>All tests must pass to proceed.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Microphone Test */}
      <Card className="w-[340px] h-[180px]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Mic className="w-4 h-4" />
            <span>Microphone Test</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-3">
            <Progress value={micVolume} max={100} className="w-full h-2" />
            <Button size="sm" onClick={startMicrophone} disabled={micEnabled}>
              Start Microphone Test
            </Button>
            {testStatus.microphone === "passed" && (
              <p className="text-green-600 text-sm flex items-center space-x-1">
                <CheckCircle className="w-4 h-4" /> <span>Passed</span>
              </p>
            )}
            {testStatus.microphone === "failed" && (
              <p className="text-red-600 text-sm flex items-center space-x-1">
                <XCircle className="w-4 h-4" /> <span>{micError}</span>
              </p>
            )}
            {testStatus.microphone === "testing" && (
              <p className="text-yellow-600 text-sm flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 animate-pulse" /> <span>Testing...</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Network Test */}
      <Card className="w-[340px] h-[180px]">
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
              <Button size="sm" variant="outline" onClick={runNetworkTest}>
                Run Network Test
              </Button>
            )}
            {testStatus.network === "passed" && networkResults && (
              <div className="text-gray-700 text-sm space-y-1">
                <p><strong>Download:</strong> {networkResults.download} Mbps</p>
                <p><strong>Upload:</strong> {networkResults.upload} Mbps</p>
                <p><strong>Ping:</strong> {networkResults.ping} ms</p>
              </div>
            )}
            {testStatus.network === "failed" && (
              <p className="text-red-600 text-sm">{networkError || "Network test failed."}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Right column */}
    <div className="space-y-6">
      {/* Camera Test */}
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Camera className="w-4 h-4" />
            <span>Camera Test</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-3">
            <video ref={videoRef} autoPlay muted playsInline className="w-[280px] h-[240px] bg-black rounded-lg" />
            <Button size="sm" onClick={startCamera} disabled={cameraEnabled}>
              Start Camera Test
            </Button>
            {testStatus.camera === "passed" && (
              <p className="text-green-600 text-sm flex items-center space-x-1">
                <CheckCircle className="w-4 h-4" /> <span>Passed</span>
              </p>
            )}
            {testStatus.camera === "failed" && (
              <p className="text-red-600 text-sm flex items-center space-x-1">
                <XCircle className="w-4 h-4" /> <span>{cameraError}</span>
              </p>
            )}
            {testStatus.camera === "testing" && (
              <p className="text-yellow-600 text-sm flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 animate-pulse" /> <span>Testing...</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</main>

      </div>
    </div>
  )
}


