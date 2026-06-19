import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function ScreenStream() {
  const [imageSrc, setImageSrc] = useState('');
  const [isConnected, setIsConnected] = useState(false);

useEffect(() => {
    // ==== COMENTARIO CORREGIDO ====
    // Conectar al servidor de Python
    const socket = io('https://parenting-allocated-prefer-surrey.trycloudflare.com', {
      transports: ['websocket']
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

    // Limpiar la conexión cuando el componente se desmonte
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', backgroundColor: '#222', minHeight: '100vh', color: 'white', padding: '20px' }}>
      <h2>Blow Max - ¡Vamos Argentina!</h2>
      <div style={{ marginBottom: '15px' }}>
        Estado: {isConnected ? <span style={{ color: '#4CAF50' }}>● Transmitiendo</span> : <span style={{ color: '#f44336' }}>● Desconectado</span>}
      </div>
      
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