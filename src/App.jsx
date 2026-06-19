import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

function ScreenStream() {
  const [imageSrc, setImageSrc] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioStatus, setAudioStatus] = useState('Esperando audio...');
  
  const audioContextRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const socketRef = useRef(null);

  useEffect(() => {
    // Reemplaza con tu URL de Cloudflare
    const socket = io('https://parenting-allocated-prefer-surrey.trycloudflare.com', {
      forceNew: true,
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket', 'polling'] // Forzar WebSocket primero
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Conectado al servidor de streaming');
    });

    // 🖼️ CAPTURA DE PANTALLA
    socket.on('screen_frame', (data) => {
      setImageSrc(data.image);
    });

    // 🔊 REPRODUCCIÓN DE AUDIO CORREGIDA
    socket.on('audio_frame', (data) => {
      console.log('🎵 Audio recibido:', {
        channels: data.channels,
        sampleRate: data.sampleRate,
        format: data.format,
        audioLength: data.audio?.length
      });

      if (!audioEnabled || !audioContextRef.current) {
        console.log('⚠️ Audio deshabilitado o sin contexto');
        return;
      }

      try {
        const audioContext = audioContextRef.current;
        const channels = data.channels || 2;
        const sampleRate = data.sampleRate || 44100;

        // Decodificar el audio de base64 a bytes
        let audioData;
        if (data.format === 'base64') {
          // Decodificar base64 a Uint8Array
          const binaryString = atob(data.audio);
          audioData = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            audioData[i] = binaryString.charCodeAt(i);
          }
        } else {
          // Si viene como array directamente
          audioData = new Uint8Array(data.audio);
        }

        // Convertir a Int16Array (16-bit PCM)
        const int16Array = new Int16Array(audioData.buffer);
        const totalSamples = int16Array.length;
        const samplesPerChannel = totalSamples / channels;

        console.log(`📊 Audio: ${totalSamples} muestras, ${samplesPerChannel} por canal, ${channels} canales`);

        // Crear buffer de audio
        const audioBuffer = audioContext.createBuffer(channels, samplesPerChannel, sampleRate);

        // Distribuir datos a cada canal
        for (let ch = 0; ch < channels && ch < audioBuffer.numberOfChannels; ch++) {
          const channelData = audioBuffer.getChannelData(ch);
          for (let i = 0; i < samplesPerChannel; i++) {
            // Convertir de Int16 a float (-1 a 1)
            channelData[i] = int16Array[i * channels + ch] / 32768.0;
          }
        }

        // Crear fuente y reproducir
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        // Sincronizar tiempo
        const currentTime = audioContext.currentTime;
        if (nextStartTimeRef.current < currentTime) {
          nextStartTimeRef.current = currentTime;
        }
        
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;

        setAudioStatus('🔊 Audio reproduciéndose');
        
        // Log de depuración
        console.log(`✅ Audio reproducido: ${audioBuffer.duration.toFixed(3)}s`);

      } catch (error) {
        console.error('❌ Error reproduciendo audio:', error);
        setAudioStatus('❌ Error en audio');
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Desconectado del servidor');
    });

    socket.on('connect_error', (error) => {
      console.error('⚠️ Error de conexión:', error);
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioEnabled]);

  const startAudio = async () => {
    try {
      // Crear contexto de audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Configurar para 44100Hz (igual que el servidor)
      if (audioContext.sampleRate !== 44100) {
        console.log(`⚠️ SampleRate del navegador: ${audioContext.sampleRate}Hz (el servidor usa 44100Hz)`);
      }
      
      audioContextRef.current = audioContext;
      nextStartTimeRef.current = audioContext.currentTime;
      setAudioEnabled(true);
      setAudioStatus('🔊 Audio activado - esperando datos...');
      
      console.log('✅ Contexto de audio creado');
    } catch (error) {
      console.error('❌ Error al iniciar audio:', error);
      setAudioStatus('❌ Error al iniciar audio');
    }
  };

  return (
    <div style={{ textAlign: 'center', backgroundColor: '#222', minHeight: '100vh', color: 'white', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>🎯 Streaming - ¡Vamos Argentina! 🇦🇷</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <div>Estado: {isConnected ? 
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>● Conectado</span> : 
          <span style={{ color: '#f44336', fontWeight: 'bold' }}>● Desconectado</span>
        }</div>
        <div style={{ marginTop: '5px', fontSize: '14px', color: '#aaa' }}>
          {isConnected ? '✅ Transmitiendo' : '🔄 Reconectando...'}
        </div>
      </div>

      {!audioEnabled && isConnected && (
        <button 
          onClick={startAudio} 
          style={{ 
            padding: '12px 24px', 
            fontSize: '16px', 
            backgroundColor: '#008CBA', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer', 
            marginBottom: '20px', 
            fontWeight: 'bold', 
            boxShadow: '0px 4px 6px rgba(0,0,0,0.3)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#007B9E'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#008CBA'}
        >
          🔊 Activar Sonido del Streaming
        </button>
      )}
      
      {audioEnabled && (
        <div style={{ marginBottom: '20px' }}>
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>🔊 Audio Activado</span>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            {audioStatus}
          </div>
        </div>
      )}
      
      <div style={{ maxWidth: '90%', margin: '0 auto', border: '4px solid #444', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', boxShadow: '0px 10px 25px rgba(0,0,0,0.5)' }}>
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt="Screen Stream" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
          />
        ) : (
          <div style={{ padding: '100px 0', color: '#888', fontSize: '18px' }}>
            {isConnected ? '📺 Esperando video...' : '🔌 Desconectado del servidor'}
          </div>
        )}
      </div>

      {/* Información de depuración */}
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'left', maxWidth: '600px', margin: '20px auto' }}>
        <div>🔧 Info técnica:</div>
        <div>• Servidor: {isConnected ? 'Conectado' : 'Desconectado'}</div>
        <div>• Audio: {audioEnabled ? 'Activado' : 'Desactivado'}</div>
        <div>• AudioContext: {audioContextRef.current ? '✅ Creado' : '❌ No creado'}</div>
      </div>
    </div>
  );
}

export default ScreenStream;