import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

function ScreenStream() {
  const [imageSrc, setImageSrc] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const audioContextRef = useRef(null);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    // Reemplaza con tu URL de Cloudflare actual si cambia
    const socket = io('https://parenting-allocated-prefer-surrey.trycloudflare.com', {
      forceNew: true,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Conectado al servidor de streaming');
    });

    // 🖼️ CAPTURA DE PANTALLA
    socket.on('screen_frame', (data) => {
      setImageSrc(data.image);
    });

    // 🔊 REPRODUCCIÓN DE AUDIO DINÁMICA
    socket.on('audio_frame', (data) => {
      if (!audioEnabled || !audioContextRef.current) return;

      const audioContext = audioContextRef.current;
      const channels = data.channels || 2;
      const sampleRate = data.sampleRate || 44100;

      const int16Array = new Int16Array(data.audio);
      const totalSamples = int16Array.length;
      const samplesPerChannel = totalSamples / channels;
      
      // Creamos un buffer adaptado a la tarjeta de sonido del backend
      const audioBuffer = audioContext.createBuffer(channels, samplesPerChannel, sampleRate);

      // Distribuimos los datos binarios a cada canal (Izquierdo / Derecho)
      for (let ch = 0; ch < channels; ch++) {
        try {
          const channelData = audioBuffer.getChannelData(ch);
          for (let i = 0; i < samplesPerChannel; i++) {
            channelData[i] = int16Array[i * channels + ch] / 32768.0;
          }
        } catch (err) {
          // Si el navegador soporta menos canales físicos que la PC emisora, prevenimos un crash
          break; 
        }
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      const currentTime = audioContext.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }
      
      source.start(nextStartTimeRef.current);
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

      {!audioEnabled && isConnected && (
        <button 
          onClick={startAudio} 
          style={{ padding: '12px 24px', fontSize: '16px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold', boxShadow: '0px 4px 6px rgba(0,0,0,0.3)' }}
        >
          🔊 Activar Sonido del Streaming
        </button>
      )}
      {audioEnabled && <p style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '20px' }}>🔊 Audio de la PC Activado</p>}
      
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