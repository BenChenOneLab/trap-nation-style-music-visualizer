import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { VisualizerConfig, Preset } from './types';
import { DynamicStyle, AspectRatio, ExportFormat, ParticleBehavior, BackgroundBehavior, LogoBehavior } from './types';
import { ALL_STYLES, INITIAL_CONFIG } from './constants';

// --- AE Style Components ---

const Panel: React.FC<{ title: string; children: React.ReactNode; className?: string; headerAction?: React.ReactNode }> = ({ title, children, className = "", headerAction }) => (
  <div className={`flex flex-col bg-brand-surface border border-brand-border h-full ${className}`}>
    <div className="bg-brand-header px-3 py-1.5 border-b border-brand-border flex justify-between items-center shrink-0">
      <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">{title}</h3>
      {headerAction}
    </div>
    <div className="flex-grow overflow-auto">
      {children}
    </div>
  </div>
);

const TopBar: React.FC = () => (
  <div className="bg-[#353535] border-b border-black h-8 flex items-center px-4 space-x-4 shrink-0 z-20">
    <div className="flex items-center space-x-1">
      <div className="w-4 h-4 bg-brand-primary rounded-sm flex items-center justify-center">
        <span className="text-[10px] text-black font-bold">Ae</span>
      </div>
      <span className="text-[11px] font-medium text-gray-300">Adobe After Effects 2025</span>
    </div>
    <div className="flex space-x-3">
      {['File', 'Edit', 'Composition', 'Layer', 'Effect', 'Animation', 'View', 'Window', 'Help'].map(item => (
        <span key={item} className="text-[11px] text-gray-300 hover:text-white cursor-default">{item}</span>
      ))}
    </div>
  </div>
);

// --- Helper UI Components ---

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  displayFormatter?: (value: number) => string;
}

const SliderControl: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, displayFormatter }) => (
  <div className="mb-2">
    <label className="block text-[11px] font-medium text-gray-400 mb-1">{label}</label>
    <div className="flex items-center space-x-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-grow h-1 bg-brand-border rounded appearance-none cursor-pointer accent-brand-primary"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-12 bg-[#1c1c1c] border border-brand-border rounded px-1 py-0.5 text-center text-[10px]"
        aria-label={label}
      />
    </div>
  </div>
);


interface ColorPickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

const ColorControl: React.FC<ColorPickerProps> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-medium text-gray-400">{label}</label>
        <div className="relative w-6 h-6 rounded border border-brand-border cursor-pointer overflow-hidden shadow-inner" style={{ backgroundColor: value }}>
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
        </div>
    </div>
);

interface CheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const CheckboxControl: React.FC<CheckboxProps> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-medium text-gray-400">{label}</label>
        <button
          onClick={() => onChange(!checked)}
          className={`relative inline-flex items-center h-4 rounded-full w-8 transition-colors ${
            checked ? 'bg-brand-primary' : 'bg-brand-border'
          }`}
        >
          <span
            className={`inline-block w-2.5 h-2.5 transform bg-white rounded-full transition-transform ${
              checked ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
);


// --- Main App Component ---

const App: React.FC = () => {
  const [config, setConfig] = useState<Preset>(INITIAL_CONFIG);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.NineSixteen);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(ExportFormat.MP4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // New UI State
  const [leftTab, setLeftTab] = useState<'Project' | 'Effect Controls'>('Project');
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const mediaStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const particlesRef = useRef<any[]>([]);
  const currentScaleRef = useRef(1);
  const bgAnimationTimeRef = useRef(0);
  const lastParticleBehaviorRef = useRef<ParticleBehavior | null>(null);

  const lastBassAvgRef = useRef<number>(0);

  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = config.smoothingTimeConstant;
    }
  }, [config.smoothingTimeConstant]);

  // --- File Handling ---

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    } else {
        setAudioFile(null);
        setAudioUrl(null);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setLogoUrl(url);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        logoImageRef.current = img;
      };
    } else {
        setLogoUrl(null);
        logoImageRef.current = null;
    }
  };

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (backgroundImageUrl) URL.revokeObjectURL(backgroundImageUrl);
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setBackgroundImageUrl(url);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        backgroundImageRef.current = img;
      };
    } else {
        setBackgroundImageUrl(null);
        backgroundImageRef.current = null;
    }
  };

  const handleRemoveBackgroundImage = () => {
    if (backgroundImageUrl) {
        URL.revokeObjectURL(backgroundImageUrl);
    }
    setBackgroundImageUrl(null);
    backgroundImageRef.current = null;
  };
  
  // --- Audio API Setup ---

  const setupAudioContext = () => {
    if (audioRef.current && !audioContextRef.current) {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = config.smoothingTimeConstant;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaElementSource(audioRef.current);
      sourceRef.current = source;
      
      const mediaStreamDestination = audioContext.createMediaStreamDestination();
      mediaStreamDestinationRef.current = mediaStreamDestination;

      source.connect(analyser);
      analyser.connect(audioContext.destination); // For live playback
      analyser.connect(mediaStreamDestination); // For recording
    }
  };

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    
    const onPlay = () => {
      setupAudioContext();
      audioContextRef.current?.resume();
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);

    audioEl.addEventListener('play', onPlay);
    audioEl.addEventListener('pause', onPause);

    return () => {
      audioEl.removeEventListener('play', onPlay);
      audioEl.removeEventListener('pause', onPause);
    };
  }, [audioUrl]);

  // --- Canvas Rendering Logic ---

  const drawParticles = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: VisualizerConfig,
    avg: number
) => {
    const resetParticles = () => {
        particlesRef.current = [];
        for (let i = 0; i < 100; i++) {
            particlesRef.current.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2 + 1,
                vx_base: Math.random() * 1 - 0.5,
                vy_base: Math.random() * 1 - 0.5,
                angle: Math.random() * Math.PI * 2,
                distance: Math.random() * Math.min(width, height) * 0.5,
            });
        }
    };

    if (particlesRef.current.length === 0 || lastParticleBehaviorRef.current !== config.particleBehavior) {
        resetParticles();
        lastParticleBehaviorRef.current = config.particleBehavior;
    }

    ctx.fillStyle = config.particleColor;
    const centerX = width / 2;
    const centerY = height / 2;

    particlesRef.current.forEach(p => {
        switch (config.particleBehavior) {
            case ParticleBehavior.Gravity:
                p.y += p.vy_base + 1;
                p.x += p.vx_base;
                if (p.y > height) { p.y = 0; p.x = Math.random() * width; }
                break;
            case ParticleBehavior.AntiGravity:
                p.y -= (p.vy_base + 1);
                p.x += p.vx_base;
                if (p.y < 0) { p.y = height; p.x = Math.random() * width; }
                break;
            case ParticleBehavior.RadialOut:
                const speed = (avg / 255) * 2;
                p.distance += speed + 0.1;
                p.x = centerX + Math.cos(p.angle) * p.distance;
                p.y = centerY + Math.sin(p.angle) * p.distance;
                if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
                    p.distance = Math.random() * 50;
                    p.angle = Math.random() * Math.PI * 2;
                }
                break;
            case ParticleBehavior.VortexIn:
                const vortexSpeed = (avg / 255) * 1.5;
                p.distance -= vortexSpeed + 0.1;
                p.angle += 0.01;
                p.x = centerX + Math.cos(p.angle) * p.distance;
                p.y = centerY + Math.sin(p.angle) * p.distance;
                if (p.distance < 1) {
                    p.distance = Math.random() * Math.min(width, height) * 0.5;
                    p.angle = Math.random() * Math.PI * 2;
                }
                break;
            case ParticleBehavior.Static:
            default:
                p.x += p.vx_base;
                p.y += p.vy_base;
                if (p.x < 0 || p.x > width) p.vx_base *= -1;
                if (p.y < 0 || p.y > height) p.vy_base *= -1;
                break;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}, []);

    const drawDynamicVisualizer = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, frequencyData: Uint8Array, time: number, bassAvg: number) => {
    ctx.save();
    
    const barData = frequencyData;
    const avg = barData.reduce((a, b) => a + b, 0) / (barData.length || 1);
    
    let angle: number, x: number, y: number, x2: number, y2: number, barHeight: number;
    const value = (i: number) => barData[i] || 0;
        
    switch (config.dynamicStyle) {
        case DynamicStyle.PyroBurst: {
            const gradient = ctx.createLinearGradient(0, -height / 4, 0, height / 4);
            gradient.addColorStop(0, config.spectrumColor1);
            gradient.addColorStop(1, config.spectrumColor2);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = config.barWidth;

            const radius = Math.min(width, height) * 0.05;
            const pulseRadius = radius + avg * 0.1 * config.motionIntensity;
            ctx.lineCap = 'round';
            for (let i = 0; i < config.barCount; i++) {
                barHeight = (value(i) / 255) * height * 0.15 * config.motionIntensity;
                angle = (i / config.barCount) * Math.PI * 2;
                x = Math.cos(angle) * pulseRadius;
                y = Math.sin(angle) * pulseRadius;
                x2 = Math.cos(angle) * (pulseRadius + barHeight);
                y2 = Math.sin(angle) * (pulseRadius + barHeight);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            break;
        }
        case DynamicStyle.GlacialShards: {
            const gradient = ctx.createLinearGradient(0, -height / 4, 0, height / 4);
            gradient.addColorStop(0, config.spectrumColor1);
            gradient.addColorStop(1, config.spectrumColor2);
            ctx.strokeStyle = gradient;
            const spikes = config.starSpikes;
            const outerRadius = Math.min(width, height) * 0.18;
            const innerRadius = outerRadius * config.starInnerRadius;
            ctx.beginPath();
            for (let i = 0; i <= config.barCount; i++) {
                const index = i % config.barCount;
                barHeight = (value(index) / 255) * height * 0.1 * config.motionIntensity;
                angle = (index / config.barCount) * Math.PI * 2;

                const progressToSpike = ((angle / (Math.PI * 2)) * spikes) % 1;
                let currentRadius = innerRadius + (outerRadius - innerRadius) * Math.abs(progressToSpike - 0.5) * 2;

                const r = currentRadius + barHeight;
                x = Math.cos(angle) * r;
                y = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            break;
        }
        case DynamicStyle.CelestialBloom: {
            const gradient = ctx.createLinearGradient(0, -height / 4, 0, height / 4);
            gradient.addColorStop(0, config.spectrumColor1);
            gradient.addColorStop(1, config.spectrumColor2);
            ctx.strokeStyle = gradient;
            const baseRadius = Math.min(width, height) * 0.05;
            const bloomFactor = 1 + Math.sin(time * 2) * 0.2;
            ctx.beginPath();
            for (let i = 0; i <= config.barCount; i++) {
                const index = i % config.barCount;
                barHeight = (value(index) / 255) * height * 0.12 * config.motionIntensity * bloomFactor;
                angle = (index / config.barCount) * Math.PI * 2;
                const r = baseRadius + barHeight;
                x = Math.cos(angle) * r;
                y = Math.sin(angle) * r;

                const cx1 = Math.cos(angle) * (r - barHeight*0.5);
                const cy1 = Math.sin(angle) * (r - barHeight*0.5);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.quadraticCurveTo(cx1, cy1, x, y);
            }
            ctx.closePath();
            ctx.stroke();
            break;
        }
        case DynamicStyle.QuantumEntanglement:
            // No central visualizer, only particles
            break;
    }
    
    ctx.restore();

  }, [config]);


  const animate = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        return;
    };

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const { width, height } = canvas;
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const bassAvg = dataArray.slice(0, 16).reduce((a, b) => a + b, 0) / 16;
    const isAudioPlaying = avg > 1;

    // Filter frequency data for visualizer based on user settings
    const rangeStart = Math.floor(bufferLength * config.frequencyRangeStart);
    const rangeEnd = Math.floor(bufferLength * config.frequencyRangeEnd);
    const visualizerData = dataArray.slice(rangeStart, rangeEnd);

    // Detect bass hits for pulse effects
    lastBassAvgRef.current = bassAvg;


    bgAnimationTimeRef.current += 0.002;
    
    const targetScale = isAudioPlaying ? 1 + (avg / 255) * 0.07 : 1;
    currentScaleRef.current += (targetScale - currentScaleRef.current) * 0.1;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // --- Global Transforms (Zoom & Shake) ---
    ctx.translate(width / 2, height / 2);
    ctx.scale(currentScaleRef.current, currentScaleRef.current);
    
    const baseShake = isAudioPlaying ? (bassAvg / 255) * config.cameraShakeIntensity * 15 : 0;
    const totalShake = baseShake;
    const shakeX = (Math.random() - 0.5) * totalShake;
    const shakeY = (Math.random() - 0.5) * totalShake;
    ctx.translate(shakeX, shakeY);
    
    ctx.translate(-width / 2, -height / 2);
    
    // --- Background ---
    if (backgroundImageRef.current && backgroundImageRef.current.complete) {
        const img = backgroundImageRef.current;
        const canvasAspect = width / height;
        const imgAspect = img.width / img.height;
        let sx, sy, sWidth, sHeight;

        if (imgAspect > canvasAspect) {
            sHeight = img.height;
            sWidth = img.height * canvasAspect;
            sx = (img.width - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = img.width;
            sHeight = img.width / canvasAspect;
            sx = 0;
            sy = (img.height - sHeight) / 2;
        }

        ctx.save();
        
        const bgTime = bgAnimationTimeRef.current;
        switch (config.backgroundBehavior) {
            case BackgroundBehavior.SlowPan:
                ctx.translate(Math.sin(bgTime) * 50, Math.cos(bgTime) * 30);
                break;
            case BackgroundBehavior.GentleZoom:
                const zoom = 1 + Math.sin(bgTime * 0.8) * 0.1;
                ctx.translate(width/2, height/2);
                ctx.scale(zoom, zoom);
                ctx.translate(-width/2, -height/2);
                break;
            case BackgroundBehavior.AudioPulse:
                 const pulse = 1 + (avg / 255) * 0.05;
                 ctx.translate(width/2, height/2);
                 ctx.scale(pulse, pulse);
                 ctx.translate(-width/2, -height/2);
                break;
            case BackgroundBehavior.Static:
            default:
                break;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height);
        ctx.restore();
    } else {
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, config.bgColor1);
        bgGradient.addColorStop(1, config.bgColor2);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
    }

    // --- Foreground Elements ---
    drawParticles(ctx, width, height, config, avg);

    // --- Logo and Anchored Visualizer ---
    if (logoImageRef.current && logoImageRef.current.complete) {
        const logo = logoImageRef.current;
        const baseSize = Math.min(width, height) * 0.3; 
        const maxDimension = baseSize * config.logoSize;

        const logoAspectRatio = logo.width / logo.height;
        let logoDrawWidth: number;
        let logoDrawHeight: number;

        if (logoAspectRatio > 1) { // Landscape logo
            logoDrawWidth = maxDimension;
            logoDrawHeight = maxDimension / logoAspectRatio;
        } else { // Portrait or square logo
            logoDrawHeight = maxDimension;
            logoDrawWidth = maxDimension * logoAspectRatio;
        }

        ctx.save();
        
        // --- This block now controls BOTH the logo and the visualizer ---

        // Center transformations
        ctx.translate(width / 2, height / 2);

        // Apply dynamic logo behavior
        const logoPulse = 1 + (avg / 255) * 0.1;
        const logoShake = (bassAvg / 255) * 15;
        const time = bgAnimationTimeRef.current;

        switch (config.logoBehavior) {
            case LogoBehavior.Pulse:
                ctx.scale(logoPulse, logoPulse);
                break;
            case LogoBehavior.Shake:
                ctx.translate((Math.random() - 0.5) * logoShake, (Math.random() - 0.5) * logoShake);
                break;
            case LogoBehavior.Float:
                ctx.translate(Math.sin(time * 0.5) * 10, Math.cos(time * 0.3) * 10);
                break;
            case LogoBehavior.Static:
            default:
                break;
        }
        
        // --- Draw Anchored Visualizer ---
        if (isAudioPlaying) {
            ctx.save();
            ctx.shadowColor = config.spectrumColor1;
            ctx.shadowBlur = config.glowRadius * (avg / 255);
            // Position the spectrum relative to the logo's center
            ctx.translate(0, logoDrawHeight * 0.3); // Adjust Y-offset to position below logo center
            drawDynamicVisualizer(ctx, width, height, visualizerData, time, bassAvg);
            ctx.restore();
        }

        // --- Draw Logo on top ---
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = (avg / 255) * 30;
        ctx.drawImage(logo, -logoDrawWidth / 2, -logoDrawHeight / 2, logoDrawWidth, logoDrawHeight);

        ctx.restore(); // Restore from logo-specific transforms
    }

    ctx.restore(); // Restore from global zoom & shake

    // --- Screen-space & High-Energy FX ---
    if (config.highEnergyFx && isAudioPlaying && bassAvg > 220) {
        const flashOpacity = Math.min(0.7, ((bassAvg - 220) / 35) * 1.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        ctx.fillRect(0, 0, width, height);
    }

    animationFrameIdRef.current = requestAnimationFrame(animate);

  }, [config, drawParticles, drawDynamicVisualizer]);


  useEffect(() => {
    animationFrameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    let width, height;
    
    const parent = canvas.parentElement;
    if (parent) {
      if(aspectRatio === AspectRatio.SixteenNine) {
        width = parent.clientWidth;
        height = parent.clientWidth * 9 / 16;
      } else {
        height = parent.clientHeight;
        width = parent.clientHeight * 9 / 16;
      }
    } else {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx?.scale(dpr, dpr);
  }, [aspectRatio]);

  const handleGenerateClick = async () => {
    if (!canvasRef.current || !audioRef.current || !audioFile || !mediaStreamDestinationRef.current) return;

    if (typeof MediaRecorder === 'undefined') {
        alert('Your browser does not support video recording.');
        return;
    }

    let finalFormat = exportFormat;
    if (!MediaRecorder.isTypeSupported(finalFormat)) {
        console.warn(`${finalFormat} not supported, falling back to video/webm`);
        finalFormat = ExportFormat.WebM;
        setExportFormat(ExportFormat.WebM);
        if (!MediaRecorder.isTypeSupported(finalFormat)) {
             alert('Neither MP4 nor WebM recording is supported in your browser.');
             return;
        }
    }
    
    setIsGenerating(true);
    setExportProgress(0);

    const canvas = canvasRef.current;
    const audio = audioRef.current;
    
    const wasPlaying = !audio.paused;
    if (wasPlaying) audio.pause();
    audio.currentTime = 0;

    const videoStream = canvas.captureStream(30);
    const audioStream = mediaStreamDestinationRef.current.stream;
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: finalFormat });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: finalFormat });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        const fileExtension = finalFormat === ExportFormat.MP4 ? 'mp4' : 'webm';
        a.download = `visualizer-video.${fileExtension}`;
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        setIsGenerating(false);
        setExportProgress(0);
        combinedStream.getTracks().forEach(track => track.stop()); 
        
        if (wasPlaying) audio.play();
    };

    const onTimeUpdate = () => {
        if (audio.duration > 0) {
            setExportProgress((audio.currentTime / audio.duration) * 100);
        }
    };

    const onEnded = () => {
        recorder.stop();
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('ended', onEnded);
    };
    
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    recorder.start();
    audio.play();
  };
  
  const handlePresetSelect = (preset: Preset) => {
    setConfig(preset);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins.toString().padStart(2, '0')};${secs.toString().padStart(2, '0')};${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-brand-bg text-gray-200 font-sans overflow-hidden select-none">
      <TopBar />

      {/* Middle Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[320px] flex flex-col shrink-0 border-r border-black">
           <Panel
             title={leftTab}
             headerAction={
               <div className="flex bg-[#252525] rounded-sm p-0.5">
                 <button
                   onClick={() => setLeftTab('Project')}
                   className={`px-2 py-0.5 text-[9px] rounded-sm transition-colors ${leftTab === 'Project' ? 'bg-[#454545] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                 >PROJECT</button>
                 <button
                   onClick={() => setLeftTab('Effect Controls')}
                   className={`px-2 py-0.5 text-[9px] rounded-sm transition-colors ${leftTab === 'Effect Controls' ? 'bg-[#454545] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                 >EFFECTS</button>
               </div>
             }
           >
             <fieldset disabled={isGenerating} className="p-4 space-y-6">
                {leftTab === 'Project' ? (
                  <div className="space-y-6">
                    <div>
                      <label className="text-[11px] font-medium mb-2 block text-gray-400">Audio File*</label>
                      <input type="file" accept="audio/*" onChange={handleAudioFileChange} className="text-[10px] w-full file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"/>
                      {audioFile && <p className="text-[10px] text-gray-500 mt-1 truncate">{audioFile.name}</p>}
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-2 block text-gray-400">Logo Image</label>
                      <input type="file" accept="image/*" onChange={handleLogoFileChange} className="text-[10px] w-full file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"/>
                      {logoUrl && <img src={logoUrl} className="w-12 h-12 object-contain mt-2 rounded bg-black/20 p-1 border border-brand-border"/>}
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-2 block text-gray-400">Background Image</label>
                      <input type="file" accept="image/*" onChange={handleBackgroundImageChange} className="text-[10px] w-full file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"/>
                      {backgroundImageUrl && (
                        <div className="relative w-20 h-12 mt-2 rounded bg-black/20 p-1 group border border-brand-border">
                          <img src={backgroundImageUrl} className="w-full h-full object-contain"/>
                          <button onClick={handleRemoveBackgroundImage} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100">&times;</button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-brand-primary uppercase border-b border-brand-border pb-1">Behavior</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Particle</label>
                        <select value={config.particleBehavior} onChange={(e) => setConfig(p=>({...p, name: 'Custom', particleBehavior: e.target.value as ParticleBehavior}))} className="w-full bg-[#1c1c1c] border border-brand-border rounded px-1 py-0.5 text-[11px]">
                          {Object.values(ParticleBehavior).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      {backgroundImageUrl && (
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">Background</label>
                          <select value={config.backgroundBehavior} onChange={(e) => setConfig(p=>({...p, name: 'Custom', backgroundBehavior: e.target.value as BackgroundBehavior}))} className="w-full bg-[#1c1c1c] border border-brand-border rounded px-1 py-0.5 text-[11px]">
                            {Object.values(BackgroundBehavior).map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                      )}
                      {logoUrl && (
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">Logo</label>
                          <select value={config.logoBehavior} onChange={(e) => setConfig(p=>({...p, name: 'Custom', logoBehavior: e.target.value as LogoBehavior}))} className="w-full bg-[#1c1c1c] border border-brand-border rounded px-1 py-0.5 text-[11px]">
                            {Object.values(LogoBehavior).map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    <h4 className="text-[10px] font-bold text-brand-primary uppercase border-b border-brand-border pb-1 mt-6">Parameters</h4>
                    <SliderControl label="Motion Intensity" value={config.motionIntensity} min={0.5} max={4} step={0.1} onChange={v => setConfig(p=>({...p, name: 'Custom', motionIntensity: v}))} />
                    <SliderControl label="Camera Shake" value={config.cameraShakeIntensity} min={0} max={5} step={0.1} onChange={v => setConfig(p=>({...p, name: 'Custom', cameraShakeIntensity: v}))} />
                    <SliderControl label="Smoothing" value={config.smoothingTimeConstant} min={0} max={0.99} step={0.01} onChange={v => setConfig(p=>({...p, name: 'Custom', smoothingTimeConstant: v}))} />
                    <SliderControl label="Bar Count" value={config.barCount} min={16} max={512} step={4} onChange={v => setConfig(p=>({...p, name: 'Custom', barCount: v}))} />
                    <SliderControl label="Freq Range Start" value={config.frequencyRangeStart} min={0} max={1} step={0.01} onChange={v => setConfig(p=>({...p, name: 'Custom', frequencyRangeStart: v}))} />
                    <SliderControl label="Freq Range End" value={config.frequencyRangeEnd} min={0} max={1} step={0.01} onChange={v => setConfig(p=>({...p, name: 'Custom', frequencyRangeEnd: v}))} />
                    <SliderControl label="Bar Width" value={config.barWidth} min={1} max={10} step={1} onChange={v => setConfig(p=>({...p, name: 'Custom', barWidth: v}))} />
                    <SliderControl label="Glow Radius" value={config.glowRadius} min={0} max={50} step={1} onChange={v => setConfig(p=>({...p, name: 'Custom', glowRadius: v}))} />
                    <SliderControl label="Logo Size" value={config.logoSize} min={0.1} max={2} step={0.05} onChange={v => setConfig(p=>({...p, name: 'Custom', logoSize: v}))} />

                    <h4 className="text-[10px] font-bold text-brand-primary uppercase border-b border-brand-border pb-1 mt-6">Colors</h4>
                    <ColorControl label="Spectrum 1" value={config.spectrumColor1} onChange={v => setConfig(p=>({...p, name: 'Custom', spectrumColor1: v}))}/>
                    <ColorControl label="Spectrum 2" value={config.spectrumColor2} onChange={v => setConfig(p=>({...p, name: 'Custom', spectrumColor2: v}))}/>
                    <ColorControl label="Background 1" value={config.bgColor1} onChange={v => setConfig(p=>({...p, name: 'Custom', bgColor1: v}))}/>
                    <ColorControl label="Background 2" value={config.bgColor2} onChange={v => setConfig(p=>({...p, name: 'Custom', bgColor2: v}))}/>
                    <ColorControl label="Particle Color" value={config.particleColor} onChange={v => setConfig(p=>({...p, name: 'Custom', particleColor: v}))}/>
                    <CheckboxControl label="High-Energy FX" checked={config.highEnergyFx} onChange={v => setConfig(p => ({...p, name: 'Custom', highEnergyFx: v}))} />
                  </div>
                )}
             </fieldset>
           </Panel>
        </div>

        {/* Center Composition Preview */}
        <div className="flex-1 flex flex-col bg-[#151515] relative overflow-hidden">
           <div className="bg-[#252525] px-3 py-1 border-b border-black text-[10px] text-gray-400 flex justify-between shrink-0">
              <div className="flex space-x-4">
                <span className="text-white font-medium italic underline decoration-brand-primary">Composition: Visualizer</span>
                <span>1920 x 1080 (1.00)</span>
              </div>
              <div className="flex space-x-3">
                <span>100% v</span>
                <span>(Full) v</span>
              </div>
           </div>

           <div className="flex-grow flex items-center justify-center p-8 overflow-hidden bg-[#101010] relative">
              {/* Actual Preview */}
              <div className={`bg-black shadow-2xl relative ${aspectRatio === AspectRatio.SixteenNine ? 'w-full aspect-video' : 'h-full aspect-[9/16]'}`}>
                 {isGenerating && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                        <div className="text-lg font-bold mb-4 text-white uppercase tracking-widest">Rendering...</div>
                        <div className="w-64 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-brand-primary h-full transition-all duration-150" style={{ width: `${exportProgress}%` }}></div>
                        </div>
                        <div className="mt-2 text-xs text-brand-primary font-mono">{Math.round(exportProgress)}% Complete</div>
                    </div>
                )}
                <canvas ref={canvasRef} className="w-full h-full" />
              </div>
           </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[280px] flex flex-col shrink-0 border-l border-black">
           <Panel title="Info" className="h-32">
              <div className="p-3 space-y-2 text-[10px] font-mono">
                <div className="flex justify-between"><span className="text-gray-500">X:</span> <span>{Math.floor(Math.random()*1920)}</span> <span className="text-gray-500 ml-2">Y:</span> <span>{Math.floor(Math.random()*1080)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">R:</span> <span>0</span> <span className="text-gray-500 ml-2">G:</span> <span>0</span> <span className="text-gray-500 ml-2">B:</span> <span>0</span> <span className="text-gray-500 ml-2">A:</span> <span>0</span></div>
              </div>
           </Panel>

           <Panel title="Audio" className="h-32 border-t border-black">
              <div className="p-3 flex items-center space-x-2">
                <div className="flex-1 bg-black h-12 rounded border border-brand-border relative overflow-hidden">
                  {/* Mock Audio Waveform */}
                  <div className="absolute inset-0 flex items-center justify-around px-1">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="w-0.5 bg-brand-primary/40 rounded-full" style={{ height: `${Math.random()*80 + 10}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
           </Panel>

           <Panel title="Effects & Presets" className="flex-1 border-t border-black">
              <div className="p-2">
                <div className="relative mb-3">
                  <input type="text" placeholder="Search presets..." className="w-full bg-[#1c1c1c] border border-brand-border rounded px-6 py-1 text-[11px] outline-none focus:border-brand-primary"/>
                  <span className="absolute left-2 top-1.5 opacity-30 text-[10px]">🔍</span>
                </div>
                <div className="space-y-1">
                  {ALL_STYLES.map(preset => (
                    <div
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset)}
                      className={`px-2 py-1 text-[11px] cursor-pointer hover:bg-brand-primary/10 flex items-center space-x-2 ${config.name === preset.name ? 'bg-brand-primary/20 text-brand-primary' : 'text-gray-300'}`}
                    >
                      <span>✨</span>
                      <span className="truncate">{preset.name}</span>
                    </div>
                  ))}
                </div>
              </div>
           </Panel>

           <Panel title="Export Settings" className="h-40 border-t border-black">
              <div className="p-3 space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-tighter">Aspect Ratio</label>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-[#1c1c1c] border border-brand-border rounded px-1 py-0.5 text-[11px]">
                    {Object.values(AspectRatio).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-tighter">Format</label>
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)} className="w-full bg-[#1c1c1c] border border-brand-border rounded px-1 py-0.5 text-[11px]">
                    <option value={ExportFormat.MP4}>MP4 (H.264)</option>
                    <option value={ExportFormat.WebM}>WEBM</option>
                  </select>
                </div>
              </div>
           </Panel>
        </div>
      </div>

      {/* Bottom Timeline */}
      <div className="h-[280px] bg-[#2b2b2b] border-t border-black flex flex-col shrink-0">
         {/* Timeline Header/Controls */}
         <div className="bg-[#353535] px-3 py-1 border-b border-black flex justify-between items-center shrink-0 h-8">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => audioRef.current?.paused ? audioRef.current.play() : audioRef.current?.pause()}
                  className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
              </div>
              <span className="text-brand-primary font-mono text-xs tracking-widest">{formatTime(playbackTime)}</span>
              <span className="text-gray-500 font-mono text-[10px]">/ {formatTime(duration)}</span>
            </div>

            <button 
              onClick={handleGenerateClick} 
              disabled={isGenerating || !audioFile} 
              className="px-4 py-1 bg-brand-primary text-black text-[10px] font-bold rounded shadow-lg hover:bg-opacity-80 disabled:opacity-30"
            >
              RENDER COMPOSITION
            </button>
         </div>

         <div className="flex flex-1 overflow-hidden">
            {/* Layer List */}
            <div className="w-[320px] bg-[#2b2b2b] border-r border-black flex flex-col shrink-0 overflow-y-auto">
              <div className="bg-[#303030] px-2 py-1 border-b border-black flex text-[10px] text-gray-400 font-bold">
                <div className="w-6 shrink-0 text-center">#</div>
                <div className="flex-1">Source Name</div>
                <div className="w-20 shrink-0 text-center">Mode</div>
              </div>

              {/* Mock Layers */}
              <div className={`px-2 py-1.5 border-b border-[#222] flex items-center text-[11px] ${audioFile ? 'bg-brand-primary/5' : 'opacity-50'}`}>
                <div className="w-6 shrink-0 text-center text-gray-500">1</div>
                <div className="flex-1 truncate flex items-center space-x-2">
                  <span className="text-blue-400">🔊</span>
                  <span>{audioFile ? audioFile.name : 'No Audio Selected'}</span>
                </div>
                <div className="w-20 shrink-0 text-[10px] text-gray-500 text-center">Normal</div>
              </div>
              {logoUrl && (
                <div className="px-2 py-1.5 border-b border-[#222] flex items-center text-[11px]">
                  <div className="w-6 shrink-0 text-center text-gray-500">2</div>
                  <div className="flex-1 truncate flex items-center space-x-2">
                    <span className="text-orange-400">🖼️</span>
                    <span>Logo_Overlay</span>
                  </div>
                  <div className="w-20 shrink-0 text-[10px] text-gray-500 text-center">Screen</div>
                </div>
              )}
            </div>

            {/* Timeline View */}
            <div className="flex-1 bg-[#1e1e1e] relative overflow-hidden flex flex-col">
              {/* Timeline Ruler */}
              <div className="h-6 bg-[#252525] border-b border-black relative">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="absolute border-l border-gray-600 h-2 top-4" style={{ left: `${i * 10}%` }}>
                    <span className="absolute -top-4 -left-2 text-[9px] text-gray-500 font-mono">{i}s</span>
                  </div>
                ))}
              </div>

              <div className="flex-1 relative overflow-auto p-0">
                {/* Audio Layer Bar */}
                {audioFile && (
                  <div
                    className="absolute h-6 bg-brand-primary/20 border border-brand-primary/30 rounded-sm top-[1px] left-0 right-0 flex items-center px-2 overflow-hidden"
                    style={{ width: duration ? '100%' : '0%' }}
                  >
                    <div className="flex-1 h-full flex items-center space-x-0.5 opacity-20">
                      {[...Array(100)].map((_, i) => (
                        <div key={i} className="w-1 bg-brand-primary rounded-full" style={{ height: `${Math.random()*60 + 20}%` }}></div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-10 pointer-events-none"
                  style={{ left: duration ? `${(playbackTime / duration) * 100}%` : '0%' }}
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full -ml-[6px] -mt-1 shadow-md flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
         </div>
      </div>

      {/* Hidden Audio element for state sync */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={(e) => setPlaybackTime((e.target as HTMLAudioElement).currentTime)}
          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
          className="hidden"
        ></audio>
      )}
    </div>
  );
};

export default App;