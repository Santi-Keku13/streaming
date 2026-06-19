import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

function ScreenStream() {
  const [imageSrc, setImageSrc] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const audioContextRef = useRef(null);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    // Conexión mediante el túnel de Cloudflare (HTTPS normal para handshake)
    const socket = io('https://parenting-allocated-prefer-surrey.trycloudflare.com', {
      forceNew: true,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Conectado al servidor de streaming');
    });

    // 🖼️ ESCUCHAR IMÁGENES DE PANTALLA
    socket.on('screen_frame', (data) => {
      setImageSrc(data.image);
    });

    // 🔊 ESCUCHAR Y REPRODUCIR AUDIO EN TIEMPO REAL
    socket.on('audio_frame', (data) => {
      if (!audioEnabled || !audioContextRef.current) return;

      const audioContext = audioContextRef.current;
      
      // Convertir el ArrayBuffer recibido (Int16) a Float32 para la Web Audio API
      const int16Array = new Int16Array(data.audio);
      const totalSamples = int16Array.length;
      
      // Como es Estéreo (2 canales), dividimos las muestras para cada canal alternado (L / R)
      const samplesPerChannel = totalSamples / 2;
      const leftChannel = new Float32Array(samplesPerChannel);
      const rightChannel = new Float32Array(samplesPerChannel);

      for (let i = 0, j = 0; i < totalSamples; i += 2, j++) {
        leftChannel[j] = int16Array[i] / 32768.0;      // Canal Izquierdo
        rightChannel[j] = int16Array[i + 1] / 32768.0;  // Canal Derecho
      }

      // Crear el Buffer de audio con 2 canales a 44100Hz
      const audioBuffer = audioContext.createBuffer(2, samplesPerChannel, 44100);
      audioBuffer.getChannelData(0).set(leftChannel);
      audioBuffer.getChannelData(1).set(rightChannel);

      // Configurar el nodo de origen
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      // Sincronizar el tiempo exacto para que los fragmentos no se pisen ni dejen vacíos (evita clics)
      const currentTime = audioContext.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }
      
      source.start(nextStartTimeRef.current);
      // Mover el puntero del tiempo hacia adelante basándose en la duración de este buffer
      nextStartTimeRef.current += audioBuffer.duration;
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Desconectado del servidor');
    });

    return () => {
      socket.disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioEnabled]);

  // Activa el contexto de audio en respuesta a un clic del usuario (Exigencia del Navegador)
  const startAudio = () => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    nextStartTimeRef.current = audioContextRef.current.currentTime;
    setAudioEnabled(true);
  };

  return (
    <div style={{ textAlign: 'center', backgroundColor: '#222', minHeight: '100vh', color: 'white', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Blow Max - ¡Vamos Argentina! 🇦🇷</h2>
      
      <div style={{ marginBottom: '15px' }}>
        Estado: {isConnected ? <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>● Transmitiendo</span> : <span style={{ color: '#f44336', fontWeight: 'bold' }}>● Desconectado</span>}
      </div>

      {/* Control del botón de Audio */}
      {!audioEnabled && isConnected && (
        <button 
          onClick={startAudio} 
          style={{ padding: '12px 24px', fontSize: '16px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold', boxShadow: '0px 4px 6px rgba(0,0,0,0.3)' }}
        >
          🔊 Activar Sonido del Streaming
        </button>
      )}
      {audioEnabled && <p style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '20px' }}>🔊 Sonido de la PC Activado</p>}
      
      <div style={{ maxWidth: '90%', margin: '0 auto', border: '4px solid #444', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', boxShadow: '0px 10px 25px rgba(0,0,0,0.5)' }}>
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt="Screen Stream" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
          />
        ) : (
          <div style={{ padding: '100px 0', color: '#888', fontSize: '18px' }}>
            Esperando señal de video...
          </div>
        )}
      </div>
    </div>
  );
}

export default ScreenStream;