let ctx: AudioContext | null = null
let armed = false
let lastDealAt = 0

function context() {
  if (typeof window === "undefined") return null
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export async function unlockAudio() {
  const audio = context()
  if (!audio) return null
  if (audio.state === "suspended") await audio.resume()
  return audio
}

export function armAudio() {
  if (armed || typeof window === "undefined") return
  armed = true
  const resume = () => void unlockAudio()
  for (const event of ["pointerdown", "pointerup", "keydown", "touchstart"]) {
    window.addEventListener(event, resume, { capture: true })
  }
  window.addEventListener("focus", resume)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resume()
  })
}

function env(audio: AudioContext, start: number, attack: number, release: number) {
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(1, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, start + attack + release)
  return gain
}

function noise(audio: AudioContext, seconds: number) {
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * seconds), audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const source = audio.createBufferSource()
  source.buffer = buffer
  return source
}

export function playShuffle() {
  void (async () => {
    const audio = await unlockAudio()
    if (!audio) return
    const now = audio.currentTime
    for (let i = 0; i < 8; i++) {
      const at = now + i * 0.055
      const source = noise(audio, 0.09)
      const filter = audio.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.value = 900 + Math.random() * 1600
      filter.Q.value = 0.55
      const gain = audio.createGain()
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.42, at + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.08)
      source.connect(filter)
      filter.connect(gain)
      gain.connect(audio.destination)
      source.start(at)
      source.stop(at + 0.09)
    }
  })()
}

export function playDeal() {
  const wall = typeof performance !== "undefined" ? performance.now() : Date.now()
  if (wall - lastDealAt < 30) return
  lastDealAt = wall
  void (async () => {
    const audio = await unlockAudio()
    if (!audio || audio.state !== "running") return
    const now = audio.currentTime
    const osc = audio.createOscillator()
    const filter = audio.createBiquadFilter()
    const gain = env(audio, now, 0.004, 0.07)
    osc.type = "triangle"
    osc.frequency.setValueAtTime(420 + Math.random() * 80, now)
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.06)
    filter.type = "highpass"
    filter.frequency.value = 240
    gain.gain.value = 0.09
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(audio.destination)
    osc.start(now)
    osc.stop(now + 0.08)
  })()
}

export function playDing() {
  void (async () => {
    const audio = await unlockAudio()
    if (!audio) return
    const now = audio.currentTime
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(988, now)
    osc.frequency.exponentialRampToValueAtTime(784, now + 0.18)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.055, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(now)
    osc.stop(now + 0.4)
  })()
}
