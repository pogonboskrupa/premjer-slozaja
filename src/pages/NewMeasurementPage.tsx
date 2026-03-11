import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Loader2,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Ruler,
  Square,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import { Layout } from '../components/Layout'
import { DisclaimerBanner } from '../components/DisclaimerBanner'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { useCamera } from '../hooks/useCamera'
import { useGps } from '../hooks/useGps'
import { useMeasurements } from '../hooks/useMeasurements'
import { captureVideoFrameAsync, compressImage } from '../utils/imageUtils'
import { detectSectionsFromFrames, detectSectionsFromImageData } from '../utils/sectionDetector'
import {
  avgSections,
  buildCalibration,
  calculateVolumeFromSections,
  formatDecimal,
  makeSection,
  parseDecimal,
  recalculateSectionsFromCalibration,
  validateDimensions,
  validateSection,
} from '../utils/calculations'
import { generateId, STATUS_OPTIONS, WOOD_TYPE_OPTIONS } from '../utils/format'
import type {
  CalibrationData,
  CaptureMode,
  LogSection,
  Measurement,
  MeasurementStatus,
  WoodType,
} from '../types'

type Step = 'mode' | 'capture' | 'review' | 'form'
type CalibrationPoint = { x: number; y: number }
interface ImageMeta { width: number; height: number }

export function NewMeasurementPage() {
  const navigate = useNavigate()
  const { add, measurements } = useMeasurements()
  const { coords: gps, loading: gpsLoading, fetch: fetchGps } = useGps()
  const cam = useCamera({ autoStart: false })

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const framesRef = useRef<ImageData[]>([])
  const samplerRef = useRef<number | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [step, setStep] = useState<Step>('mode')
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo')
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageMeta, setImageMeta] = useState<ImageMeta>({ width: 0, height: 0 })
  const [sections, setSections] = useState<LogSection[]>([])
  const [calibration, setCalibration] = useState<CalibrationData | null>(null)
  const [calibrationLength, setCalibrationLength] = useState('1,00')
  const [calibrationA, setCalibrationA] = useState<CalibrationPoint | null>(null)
  const [calibrationB, setCalibrationB] = useState<CalibrationPoint | null>(null)
  const [editSec, setEditSec] = useState<LogSection | null>(null)
  const [editW, setEditW] = useState('')
  const [editH, setEditH] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const lastLocation = measurements[0]?.location ?? ''
  const [form, setForm] = useState({
    location: '',
    woodType: 'bukva' as WoodType,
    woodTypeCustom: '',
    length: '',
    fillCoefficient: '0,65',
    status: 'procjena' as MeasurementStatus,
    notes: '',
  })

  useEffect(() => {
    if (step === 'capture') cam.start()
    else if (!recording) cam.stop()
  }, [cam, recording, step])

  useEffect(() => () => stopSampling(), [])

  const metrics = useMemo(() => {
    const totalArea = sections.reduce((sum, item) => sum + item.areaM2, 0)
    const length = parseDecimal(form.length)
    const fill = parseDecimal(form.fillCoefficient)
    const volume = sections.length > 0 && sections.every(item => item.areaM2 > 0) && length > 0 && fill > 0
      ? calculateVolumeFromSections(sections, length, fill)
      : 0
    return { count: sections.length, totalArea, volume }
  }, [form.fillCoefficient, form.length, sections])

  function stopSampling() {
    if (samplerRef.current !== null) {
      window.clearInterval(samplerRef.current)
      samplerRef.current = null
    }
    setRecording(false)
  }

  function resetCaptureState() {
    stopSampling()
    setPreviewUrl(null)
    setImageMeta({ width: 0, height: 0 })
    setSections([])
    setCalibration(null)
    setCalibrationA(null)
    setCalibrationB(null)
    setErrors([])
  }

  async function capturePhoto() {
    if (!cam.videoRef.current) return
    setAnalyzing(true)
    try {
      const blob = await captureVideoFrameAsync(cam.videoRef.current)
      const url = await compressImage(blob, 1600, 0.9)
      await analyzeImageUrl(url)
      setStep('review')
    } catch {
      setErrors(['Fotografija nije uspjesno uhvacena. Pokusaj ponovo.'])
    } finally {
      setAnalyzing(false)
      cam.stop()
    }
  }

  function startVideoScan() {
    const video = cam.videoRef.current
    if (!video) return
    framesRef.current = []
    setRecordSeconds(0)
    setRecording(true)
    const startedAt = Date.now()
    samplerRef.current = window.setInterval(() => {
      if (!video || video.readyState < 2) return
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      framesRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
      setRecordSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 280)
  }

  async function stopVideoScan() {
    stopSampling()
    if (!framesRef.current.length) return
    setAnalyzing(true)
    try {
      const detected = detectSectionsFromFrames(framesRef.current, null)
      const last = framesRef.current[framesRef.current.length - 1]
      const canvas = document.createElement('canvas')
      canvas.width = last.width
      canvas.height = last.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      ctx.putImageData(last, 0, 0)
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92))
      setImageMeta({ width: last.width, height: last.height })
      setSections(detected)
      setStep('review')
      cam.stop()
    } catch {
      setErrors(['Video nije analiziran. Pokusaj opet ili prebaci na foto.'])
    } finally {
      setAnalyzing(false)
    }
  }

  async function analyzeImageUrl(url: string) {
    const { imageData, width, height } = await loadImageData(url)
    setPreviewUrl(url)
    setImageMeta({ width, height })
    setSections(detectSectionsFromImageData(imageData, null))
    setCalibration(null)
    setCalibrationA(null)
    setCalibrationB(null)
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setAnalyzing(true)
    try {
      const url = await compressImage(file, 1600, 0.9)
      await analyzeImageUrl(url)
      setStep('review')
      cam.stop()
    } catch {
      setErrors(['Slika nije ucitana. Pokusaj s drugom datotekom.'])
    } finally {
      setAnalyzing(false)
      event.target.value = ''
    }
  }

  async function handleVideoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setAnalyzing(true)
    try {
      const { frames, previewUrl: thumb, width, height } = await extractFramesFromVideo(file)
      setPreviewUrl(thumb)
      setImageMeta({ width, height })
      setSections(detectSectionsFromFrames(frames, null))
      setStep('review')
      cam.stop()
    } catch {
      setErrors(['Video datoteka nije analizirana. Pokusaj s drugim videom.'])
    } finally {
      setAnalyzing(false)
      event.target.value = ''
    }
  }

  function handlePreviewClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!imgRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    if (!calibrationA || (calibrationA && calibrationB)) {
      setCalibrationA({ x, y })
      setCalibrationB(null)
    } else {
      setCalibrationB({ x, y })
    }
  }

  function applyCalibration() {
    const realLength = parseDecimal(calibrationLength)
    if (!calibrationA || !calibrationB) {
      setErrors(['Oznaci dvije tacke na referentnom predmetu prije kalibracije.'])
      return
    }
    if (isNaN(realLength) || realLength <= 0) {
      setErrors(['Unesi realnu duzinu reference u metrima.'])
      return
    }

    const dx = (calibrationB.x - calibrationA.x) * imageMeta.width
    const dy = (calibrationB.y - calibrationA.y) * imageMeta.height
    const pixelLength = Math.sqrt(dx * dx + dy * dy)
    const calib = buildCalibration(pixelLength, realLength)
    setCalibration(calib)
    setSections(prev => recalculateSectionsFromCalibration(prev, imageMeta.width, imageMeta.height, calib))
    setErrors([])
  }

  function resetCalibration() {
    setCalibration(null)
    setCalibrationA(null)
    setCalibrationB(null)
    setSections(prev => recalculateSectionsFromCalibration(prev, imageMeta.width, imageMeta.height, null))
  }

  function rerunDetection() {
    if (!previewUrl) return
    setAnalyzing(true)
    analyzeImageUrl(previewUrl)
      .catch(() => setErrors(['Detekcija nije uspjela na trenutnom kadru.']))
      .finally(() => setAnalyzing(false))
  }

  function openEdit(section: LogSection) {
    setEditSec(section)
    setEditW(section.widthM > 0 ? String(section.widthM).replace('.', ',') : '')
    setEditH(section.heightM > 0 ? String(section.heightM).replace('.', ',') : '')
  }

  function saveEdit() {
    if (!editSec) return
    const width = parseDecimal(editW)
    const height = parseDecimal(editH)
    const validationErrors = validateSection(width, height)
    if (validationErrors.length) {
      setErrors(validationErrors)
      return
    }

    const updated = makeSection(editSec.id, width, height)
    updated.rect = editSec.rect
    setSections(prev => prev.map(item => (item.id === editSec.id ? updated : item)))
    setEditSec(null)
    setErrors([])
  }

  function addManualPiece() {
    const next = makeSection(sections.length + 1, 0, 0)
    next.rect = { left: 0.05, top: 0.05, right: 0.2, bottom: 0.2 }
    setSections(prev => [...prev, next])
    openEdit(next)
  }

  function deleteSection(id: number) {
    setSections(prev => prev.filter(item => item.id !== id).map((item, index) => ({ ...item, id: index + 1 })))
  }

  async function handleSave() {
    const length = parseDecimal(form.length)
    const fill = parseDecimal(form.fillCoefficient)
    const validationErrors = [...validateDimensions(length, fill)]

    if (!form.location.trim()) validationErrors.push('Lokacija je obavezna.')
    if (!sections.length) validationErrors.push('Potrebno je detektovati ili dodati barem jedan komad.')
    if (sections.some(item => item.areaM2 <= 0)) validationErrors.push('Primijeni kalibraciju ili rucno unesi dimenzije za svaki komad.')

    if (validationErrors.length) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    const avg = avgSections(sections)
    const measurement: Measurement = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      captureMode,
      location: form.location.trim(),
      gps: gps ?? undefined,
      woodType: form.woodType,
      woodTypeCustom: form.woodType === 'ostalo' ? form.woodTypeCustom : undefined,
      length,
      fillCoefficient: fill,
      width: avg.width,
      height: avg.height,
      sections,
      photoDataUrl: previewUrl ?? undefined,
      calibration: calibration ?? undefined,
      volume: calculateVolumeFromSections(sections, length, fill),
      status: form.status,
      notes: form.notes.trim(),
      mode: captureMode,
    }

    try {
      await add(measurement)
      navigate('/historija', { replace: true })
    } catch {
      setErrors(['Mjerenje nije sacuvano. Pokusaj ponovo.'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Novo mjerenje" back>
      <div className="p-4 pb-32 flex flex-col gap-4">
        {step === 'mode' && (
          <>
            <div className="bg-white dark:bg-forest-900 rounded-2xl p-5 border border-stone-100 dark:border-forest-800">
              <div className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-2">Mjerenje komada drveta</div>
              <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">Detekcija poprecnog presjeka po komadu</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Aplikacija analizira sliku ili video kadar, pronalazi pojedinacne komade i racuna povrsinu presjeka za svaki komad. Za tacne metre koristi kalibraciju preko poznate reference.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { resetCaptureState(); setCaptureMode('photo'); setStep('capture') }} className="rounded-2xl bg-white dark:bg-forest-900 border border-stone-100 dark:border-forest-800 p-5 text-left">
                <Camera className="w-8 h-8 text-blue-500 mb-3" />
                <div className="font-semibold text-stone-800 dark:text-stone-100">Foto</div>
                <div className="text-xs text-stone-400 mt-1">Najbolje za jedan cist kadar celnih presjeka.</div>
              </button>
              <button onClick={() => { resetCaptureState(); setCaptureMode('video'); setStep('capture') }} className="rounded-2xl bg-white dark:bg-forest-900 border border-stone-100 dark:border-forest-800 p-5 text-left">
                <Video className="w-8 h-8 text-red-500 mb-3" />
                <div className="font-semibold text-stone-800 dark:text-stone-100">Video</div>
                <div className="text-xs text-stone-400 mt-1">Skeniraj kadar pa uzmi najbolji frame za detekciju.</div>
              </button>
            </div>

            <DisclaimerBanner />
          </>
        )}

        {step === 'capture' && (
          <>
            <div className="bg-white dark:bg-forest-900 rounded-2xl overflow-hidden border border-stone-100 dark:border-forest-800">
              <div className="aspect-video bg-black relative">
                <video ref={cam.videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {recording && <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-mono px-3 py-1 rounded-full">REC {String(recordSeconds).padStart(2, '0')}s</div>}
                {analyzing && <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 text-white text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Analiza u toku...</div>}
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="text-sm text-stone-500 dark:text-stone-400">
                  {captureMode === 'photo' ? 'Poravnaj kameru prema celima komada i uhvati sto ravniji kadar.' : 'Lagano predji kamerom preko komada i zaustavi snimanje kad kadar bude najcistiji.'}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {captureMode === 'photo' ? (
                    <button onClick={capturePhoto} className="flex items-center justify-center gap-2 bg-forest-600 text-white py-3 rounded-xl font-semibold"><Camera className="w-4 h-4" /> Snimi foto</button>
                  ) : !recording ? (
                    <button onClick={startVideoScan} className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-semibold"><Play className="w-4 h-4" /> Pokreni video</button>
                  ) : (
                    <button onClick={stopVideoScan} className="flex items-center justify-center gap-2 bg-stone-800 text-white py-3 rounded-xl font-semibold"><Square className="w-4 h-4" /> Zaustavi i analiziraj</button>
                  )}
                  <button onClick={() => (captureMode === 'photo' ? imageInputRef.current?.click() : videoInputRef.current?.click())} className="flex items-center justify-center gap-2 bg-white dark:bg-forest-950 border border-stone-200 dark:border-forest-700 py-3 rounded-xl font-semibold text-stone-700 dark:text-stone-300"><Upload className="w-4 h-4" /> Ucitaj fajl</button>
                </div>
              </div>
            </div>

            <button onClick={() => { cam.stop(); setStep('mode') }} className="self-start px-4 py-3 rounded-xl border border-stone-200 dark:border-forest-700 text-sm font-semibold text-stone-600 dark:text-stone-400">Nazad</button>
          </>
        )}

        {step === 'review' && previewUrl && (
          <>
            <div className="bg-white dark:bg-forest-900 rounded-2xl overflow-hidden border border-stone-100 dark:border-forest-800">
              <div className="relative" onClick={handlePreviewClick}>
                <img ref={imgRef} src={previewUrl} alt="pregled" className="w-full object-cover" />
                {sections.map(section => (
                  <div key={section.id} className="absolute border-2 border-amber-400 rounded-full bg-amber-400/10" style={{ left: `${section.rect.left * 100}%`, top: `${section.rect.top * 100}%`, width: `${(section.rect.right - section.rect.left) * 100}%`, height: `${(section.rect.bottom - section.rect.top) * 100}%` }}>
                    <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center">{section.id}</span>
                  </div>
                ))}
                {calibrationA && <div className="absolute w-3 h-3 rounded-full bg-cyan-400 -translate-x-1/2 -translate-y-1/2" style={{ left: `${calibrationA.x * 100}%`, top: `${calibrationA.y * 100}%` }} />}
                {calibrationB && (
                  <>
                    <div className="absolute w-3 h-3 rounded-full bg-cyan-400 -translate-x-1/2 -translate-y-1/2" style={{ left: `${calibrationB.x * 100}%`, top: `${calibrationB.y * 100}%` }} />
                    <div className="absolute origin-left border-t-2 border-cyan-400" style={{ left: `${calibrationA!.x * 100}%`, top: `${calibrationA!.y * 100}%`, width: `${Math.hypot(calibrationB.x - calibrationA!.x, calibrationB.y - calibrationA!.y) * 100}%`, transform: `rotate(${Math.atan2(calibrationB.y - calibrationA!.y, calibrationB.x - calibrationA!.x)}rad)` }} />
                  </>
                )}
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-stone-400 uppercase tracking-widest">Detektovano</div>
                    <div className="text-lg font-bold text-stone-800 dark:text-stone-100">{metrics.count} komada</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">{metrics.totalArea > 0 ? `Ukupna povrsina presjeka ${formatDecimal(metrics.totalArea, 3)} m2` : 'Primijeni kalibraciju ili rucno unesi dimenzije.'}</div>
                  </div>
                  <button onClick={rerunDetection} className="text-sm font-semibold text-forest-600 dark:text-forest-400">Ponovi detekciju</button>
                </div>

                <div className="rounded-xl bg-stone-50 dark:bg-forest-950 border border-stone-100 dark:border-forest-800 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300"><Ruler className="w-4 h-4 text-cyan-500" /> Kalibracija</div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Klikni dvije tacke preko poznate reference na slici, pa unesi njenu realnu duzinu. Nakon toga se svi komadi preracunavaju u metre i m2.</p>
                  <FormField label="Duzina reference (m)"><Input type="text" inputMode="decimal" value={calibrationLength} onChange={e => setCalibrationLength(e.target.value)} placeholder="1,00" /></FormField>
                  <div className="flex gap-3">
                    <button onClick={applyCalibration} className="flex-1 bg-cyan-600 text-white py-3 rounded-xl font-semibold">Primijeni kalibraciju</button>
                    <button onClick={resetCalibration} className="px-4 py-3 rounded-xl border border-stone-200 dark:border-forest-700 text-sm font-semibold text-stone-600 dark:text-stone-400">Reset</button>
                  </div>
                  {calibration && <div className="text-xs text-green-600 dark:text-green-400">Kalibracija aktivna: {formatDecimal(calibration.pixelsPerMeter, 1)} px/m</div>}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-forest-900 rounded-2xl border border-stone-100 dark:border-forest-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 dark:border-forest-800 flex items-center justify-between">
                <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Lista komada</span>
                <button onClick={addManualPiece} className="flex items-center gap-1 text-sm font-semibold text-forest-600 dark:text-forest-400"><Plus className="w-4 h-4" /> Dodaj rucno</button>
              </div>
              {sections.length === 0 && <div className="px-4 py-8 text-sm text-stone-400">Nije nadjen nijedan komad. Dodaj rucno.</div>}
              {sections.map(section => (
                <div key={section.id} className="grid grid-cols-[2rem_1fr_1fr_1fr_5rem] gap-2 items-center px-4 py-3 border-b border-stone-50 dark:border-forest-800 last:border-0">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center">{section.id}</span>
                  <span className="font-mono text-sm text-stone-700 dark:text-stone-300">{section.widthM > 0 ? formatDecimal(section.widthM, 2) : '-'}</span>
                  <span className="font-mono text-sm text-stone-700 dark:text-stone-300">{section.heightM > 0 ? formatDecimal(section.heightM, 2) : '-'}</span>
                  <span className="font-mono text-sm text-forest-600 dark:text-forest-400">{section.areaM2 > 0 ? formatDecimal(section.areaM2, 3) : '-'}</span>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(section)} className="text-stone-400 hover:text-forest-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteSection(section.id)} className="text-stone-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { resetCaptureState(); setStep('capture') }} className="px-4 py-3 rounded-xl border border-stone-200 dark:border-forest-700 text-sm font-semibold text-stone-600 dark:text-stone-400"><RotateCcw className="w-4 h-4 inline mr-1" /> Ponovi snimanje</button>
              <button onClick={() => setStep('form')} className="flex-1 bg-forest-600 text-white py-3 rounded-xl font-semibold">Nastavi na unos</button>
            </div>
          </>
        )}

        {step === 'form' && (
          <>
            <div className="bg-white dark:bg-forest-900 rounded-2xl p-4 border border-stone-100 dark:border-forest-800 flex flex-col gap-3">
              <div className="text-xs font-mono text-stone-400 uppercase tracking-widest">Rezultat analize</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-stone-50 dark:bg-forest-950 p-3"><div className="text-xs text-stone-400">Komada</div><div className="font-mono text-lg font-bold text-stone-800 dark:text-stone-100">{metrics.count}</div></div>
                <div className="rounded-xl bg-stone-50 dark:bg-forest-950 p-3"><div className="text-xs text-stone-400">Uk. presjek</div><div className="font-mono text-lg font-bold text-forest-700 dark:text-forest-300">{formatDecimal(metrics.totalArea, 3)}</div></div>
                <div className="rounded-xl bg-stone-50 dark:bg-forest-950 p-3"><div className="text-xs text-stone-400">Volumen</div><div className="font-mono text-lg font-bold text-forest-700 dark:text-forest-300">{formatDecimal(metrics.volume, 3)}</div></div>
              </div>
            </div>

            <div className="bg-white dark:bg-forest-900 rounded-2xl p-4 border border-stone-100 dark:border-forest-800 flex flex-col gap-3">
              <FormField label="Lokacija" required><Input type="text" value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} placeholder="npr. Odjel 15" /></FormField>
              {lastLocation && !form.location && <button onClick={() => setForm(prev => ({ ...prev, location: lastLocation }))} className="self-start text-xs text-forest-600 dark:text-forest-400">Preuzmi zadnju lokaciju: {lastLocation}</button>}
              <div className="flex items-center gap-3">
                <button onClick={fetchGps} disabled={gpsLoading} className="px-3 py-2 rounded-lg bg-forest-50 dark:bg-forest-800 text-forest-700 dark:text-forest-300 text-sm font-semibold">{gpsLoading ? 'GPS...' : 'Ucitaj GPS'}</button>
                {gps && <span className="text-xs text-stone-400">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</span>}
              </div>
            </div>

            <div className="bg-white dark:bg-forest-900 rounded-2xl p-4 border border-stone-100 dark:border-forest-800 flex flex-col gap-3">
              <FormField label="Vrsta drveta" required>
                <Select value={form.woodType} onChange={e => setForm(prev => ({ ...prev, woodType: e.target.value as WoodType }))}>
                  {WOOD_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </FormField>
              {form.woodType === 'ostalo' && <FormField label="Naziv vrste"><Input type="text" value={form.woodTypeCustom} onChange={e => setForm(prev => ({ ...prev, woodTypeCustom: e.target.value }))} /></FormField>}
            </div>

            <div className="bg-white dark:bg-forest-900 rounded-2xl p-4 border border-stone-100 dark:border-forest-800 flex flex-col gap-3">
              <FormField label="Duzina komada / slozaja (m)" required hint="Potrebno samo ako zelis i procjenu volumena."><Input type="text" inputMode="decimal" value={form.length} onChange={e => setForm(prev => ({ ...prev, length: e.target.value }))} placeholder="4,00" /></FormField>
              <FormField label="Koeficijent popunjenosti" hint="0,65 za naslagano okruglo drvo"><Input type="text" inputMode="decimal" value={form.fillCoefficient} onChange={e => setForm(prev => ({ ...prev, fillCoefficient: e.target.value }))} placeholder="0,65" /></FormField>
            </div>

            <div className="bg-white dark:bg-forest-900 rounded-2xl p-4 border border-stone-100 dark:border-forest-800 flex flex-col gap-3">
              <FormField label="Status"><Select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as MeasurementStatus }))}>{STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField>
              <FormField label="Napomena"><Textarea rows={3} value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Napomena o stanju drveta, svjetlu ili rucnim korekcijama." /></FormField>
            </div>

            <DisclaimerBanner />
          </>
        )}

        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 flex flex-col gap-2">
            {errors.map((error, index) => <div key={`${error}-${index}`} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}</div>)}
          </div>
        )}
      </div>

      {editSec && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => setEditSec(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-forest-900 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div className="font-semibold text-stone-800 dark:text-stone-100">Komad {editSec.id}</div><button onClick={() => setEditSec(null)} className="text-stone-400"><X className="w-5 h-5" /></button></div>
            <FormField label="Sirina presjeka (m)" required><Input type="text" inputMode="decimal" value={editW} onChange={e => setEditW(e.target.value)} placeholder="0,35" /></FormField>
            <FormField label="Visina presjeka (m)" required><Input type="text" inputMode="decimal" value={editH} onChange={e => setEditH(e.target.value)} placeholder="0,33" /></FormField>
            <button onClick={saveEdit} className="bg-forest-600 text-white py-3 rounded-xl font-semibold">Sacuvaj</button>
          </div>
        </div>
      )}

      {step === 'form' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-50 dark:from-forest-950 to-transparent pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto flex gap-3">
            <button onClick={() => setStep('review')} className="px-4 py-4 rounded-2xl border border-stone-200 dark:border-forest-700 text-stone-600 dark:text-stone-400 bg-white dark:bg-forest-900">Nazad</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-forest-600 text-white py-4 rounded-2xl font-semibold shadow-lg disabled:opacity-60">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}{saving ? 'Spremam...' : 'Spremi mjerenje'}</button>
          </div>
        </div>
      )}

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
    </Layout>
  )
}

async function loadImageData(url: string): Promise<{ imageData: ImageData; width: number; height: number }> {
  const img = await loadImage(url)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(img, 0, 0)
  return { imageData: ctx.getImageData(0, 0, canvas.width, canvas.height), width: canvas.width, height: canvas.height }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = url
  })
}

async function extractFramesFromVideo(file: File): Promise<{ frames: ImageData[]; previewUrl: string; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.src = url
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Video load failed'))
  })

  const duration = Math.max(video.duration || 0, 0.2)
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 1280
  canvas.height = video.videoHeight || 720
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  const frames: ImageData[] = []
  for (let i = 1; i <= 6; i++) {
    const target = Math.min(duration - 0.05, (duration / 7) * i)
    await seekVideo(video, target)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }

  ctx.putImageData(frames[frames.length - 1], 0, 0)
  URL.revokeObjectURL(url)
  return { frames, previewUrl: canvas.toDataURL('image/jpeg', 0.92), width: canvas.width, height: canvas.height }
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => { cleanup(); resolve() }
    const onError = () => { cleanup(); reject(new Error('Video seek failed')) }
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = Math.max(0, time)
  })
}
