import React, { useEffect, useState, useRef } from 'react'; // <-- IMPORTANTE: Añadimos useRef
import { io } from 'socket.io-client';

function ScreenStream() {
  const [imageSrc, setImageSrc] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // 🔽 LO QUE TE FALTABA: Estados y referencias para el audio 🔽
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioContextRef = useRef(null);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    // ==== COMENTARIO CORREGIDO ====
    // Conectar al servidor de Python
    const socket = io('https://parenting-allocated-prefer-surrey.trycloudflare.com', {
      forceNew: true,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Conectado al servidor de streaming');
    });

    // Escuchar los frames de la pantalla
    socket.on('screen_frame', (data) => {
      setImageSrc(data.image);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Desconectado del servidor');
    });

    // --- RECIBIR Y REPRODUCIR AUDIO ---
    socket.on('audio_frame', (data) => {
      // Si el usuario no ha activado el audio, ignoramos los datos
      if (!audioEnabled || !audioContextRef.current) return;

      const audioContext = audioContextRef.current;
      
      const int16Array = new Int16Array(data.audio);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0; 
      }

      const audioBuffer = audioContext.createBuffer(1, float32Array.length, 44100);
      audioBuffer.getChannelData(0).set(float32Array);

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

    // Limpiar la conexión cuando el componente se desmonte
    return () => {
      socket.disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioEnabled]); // <-- IMPORTANTE: Añadimos audioEnabled aquí para que reaccione al cambio

  // 🔽 LO QUE TE FALTABA: Función para iniciar el sistema de audio tras el click del usuario 🔽
  const startAudio = () => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    nextStartTimeRef.current = audioContextRef.current.currentTime;
    setAudioEnabled(true);
  };

  return (
    <div style={{ textAlign: 'center', backgroundColor: '#222', minHeight: '100vh', color: 'white', padding: '20px' }}>
      <h2>Blow Max - ¡Vamos Argentina!</h2>
      <div style={{ marginBottom: '15px' }}>
        Estado: {isConnected ? <span style={{ color: '#4CAF50' }}>● Transmitiendo</span> : <span style={{ color: '#f44336' }}>● Desconectado</span>}
      </div>

      {/* 🔽 LO QUE TE FALTABA: Interfaz del botón de audio 🔽 */}
      {!audioEnabled && isConnected && (
        <button 
          onClick={startAudio} 
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#008CBA', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px' }}
        >
          🔊 Activar Sonido del Streaming
        </button>
      )}
      {audioEnabled && <p style={{ color: '#4CAF50', marginBottom: '20px' }}>🔊 Audio activado</p>}
      
      <div style={{ maxWidth: '90%', margin: '0 auto', border: '4px solid #444', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000' }}>
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt="Screen Stream" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
          />
        ) : (
          <div style={{ padding: '100px 0', color: '#888' }}>
            Esperando señal de video...
          </div>
        )}
      </div>
    </div>
  );
}

export default ScreenStream;