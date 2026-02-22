import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('https://danett-messenger-server.onrender.com');

function App() {
  // Состояния для авторизации
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  
  // Состояния для подтверждения почты
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  
  // Состояния для подтверждения телефона
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Формы
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  
  // Основные состояния
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [recipient, setRecipient] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingStatus, setTypingStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Состояния для видеозвонков
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [callerEmail, setCallerEmail] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  
  // Словарь для преобразования email -> username
  const [emailToUsername, setEmailToUsername] = useState({});
  
  // Refs для WebRTC
  const endCallCalled = useRef(false);
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const countdownInterval = useRef(null);
  
  // Состояние звонка
  const callState = useRef({
    localStream: null,
    remoteStream: null,
    peer: null
  });

  // ==================== МОНИТОРИНГ ПОТОКОВ ====================

  // Мониторинг локального потока
  useEffect(() => {
    if (localStream) {
      console.log('📹 ЛОКАЛЬНЫЙ ПОТОК ИЗМЕНИЛСЯ:');
      console.log('   ID потока:', localStream.id);
      console.log('   Видео треков:', localStream.getVideoTracks().length);
      console.log('   Аудио треков:', localStream.getAudioTracks().length);
      
      localStream.getVideoTracks().forEach(track => {
        console.log('   Видео трек:', track.label, 'enabled:', track.enabled);
        track.onended = () => console.log('❌ Видео трек закончился');
        track.onmute = () => console.log('🔇 Видео трек заглушен');
        track.onunmute = () => console.log('🔊 Видео трек включен');
      });
      
      localStream.getAudioTracks().forEach(track => {
        console.log('   Аудио трек:', track.label, 'enabled:', track.enabled);
      });
    }
  }, [localStream]);

  // Мониторинг удаленного потока
  useEffect(() => {
    if (remoteStream) {
      console.log('📹 УДАЛЕННЫЙ ПОТОК ИЗМЕНИЛСЯ:');
      console.log('   ID потока:', remoteStream.id);
      console.log('   Видео треков:', remoteStream.getVideoTracks().length);
      console.log('   Аудио треков:', remoteStream.getAudioTracks().length);
      
      remoteStream.getVideoTracks().forEach(track => {
        console.log('   Видео трек:', track.label, 'enabled:', track.enabled);
      });
      
      remoteStream.getAudioTracks().forEach(track => {
        console.log('   Аудио трек:', track.label, 'enabled:', track.enabled);
      });
    }
  }, [remoteStream]);

  // Эффект для подключения видео при изменении localStream
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('📹 useEffect: подключаем локальное видео');
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play()
        .then(() => console.log('✅ Локальное видео воспроизводится (useEffect)'))
        .catch(e => console.error('❌ Ошибка воспроизведения локального видео (useEffect):', e));
    }
  }, [localStream]);

  // Эффект для подключения видео при изменении remoteStream
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('📹 useEffect: подключаем удаленное видео');
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play()
        .then(() => console.log('✅ Удаленное видео воспроизводится (useEffect)'))
        .catch(e => console.error('❌ Ошибка воспроизведения удаленного видео (useEffect):', e));
    }
  }, [remoteStream]);

  // Проверка наличия видео-элементов
  useEffect(() => {
    console.log('🎥 localVideoRef:', localVideoRef.current);
    console.log('🎥 remoteVideoRef:', remoteVideoRef.current);
  }, [isCallActive]);

  // Очистка уведомлений при размонтировании
  useEffect(() => {
    return () => {
      setNotifications([]);
    };
  }, []);

  // Проверка токена при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      fetchUserData(token);
    }
  }, []);

  // Таймер для повторной отправки кода
  useEffect(() => {
    if (countdown > 0) {
      countdownInterval.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(countdownInterval.current);
  }, [countdown]);

  // ==================== ЗАГРУЗКА ГРУПП ====================
  const loadUserGroups = async (email) => {
    try {
      const response = await fetch(`https://danett-messenger-server.onrender.com/api/groups/${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setGroups(data);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки групп:', error);
      setGroups([]);
    }
  };

  // ==================== ЗАГРУЗКА СООБЩЕНИЙ ГРУППЫ ====================
  const loadGroupMessages = async (groupId) => {
    try {
      const response = await fetch(`https://danett-messenger-server.onrender.com/api/group-messages/${groupId}`);
      const messages = await response.json();
      
      const formattedMessages = messages.map(msg => ({
        text: msg.message,
        from: msg.from === currentUser?.email ? 'me' : msg.from,
        fromUsername: emailToUsername[msg.from] || msg.from,
        timestamp: new Date(msg.timestamp).toLocaleTimeString()
      }));
      
      setGroupMessages(formattedMessages);
    } catch (error) {
      console.error('Ошибка загрузки сообщений группы:', error);
    }
  };

  // ==================== ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ====================
  const fetchUserData = async (token) => {
    try {
      const response = await fetch('https://danett-messenger-server.onrender.com/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setIsAuthenticated(true);
        socket.emit('user-connect', user.email);
        setIsConnected(true);
        showNotification(`✅ Добро пожаловать, ${user.username}!`);
        
        setEmailToUsername(prev => ({ ...prev, [user.email]: user.username }));
        
        loadContacts(user.email);
        loadUserGroups(user.email);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
    }
  };
  
  // ==================== ПОДТВЕРЖДЕНИЕ ПОЧТЫ ====================

  const sendVerificationCode = async (email) => {
    try {
      const response = await fetch('https://danett-messenger-server.onrender.com/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setVerificationEmail(email);
        setShowVerification(true);
        setCountdown(data.expiresIn || 60);
        setCanResend(false);
        showNotification('📧 Код подтверждения отправлен на почту');
      } else {
        showNotification(`❌ ${data.error}`);
      }
    } catch (error) {
      showNotification('❌ Ошибка отправки кода');
    }
  };

  const verifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showNotification('❌ Введите 6-значный код');
      return;
    }
    
    try {
      const response = await fetch('https://danett-messenger-server.onrender.com/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: verificationEmail, 
          code: verificationCode 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setShowVerification(false);
        setVerificationCode('');
        showNotification('✅ Email успешно подтверждён!');
        
        if (currentUser) {
          setCurrentUser({ ...currentUser, isVerified: true });
        }
      } else {
        showNotification(`❌ ${data.error}`);
      }
    } catch (error) {
      showNotification('❌ Ошибка подтверждения');
    }
  };

  const resendCode = () => {
    if (canResend) {
      sendVerificationCode(verificationEmail);
    }
  };
  
  // ==================== ПОДТВЕРЖДЕНИЕ ТЕЛЕФОНА ====================

  const sendPhoneCode = async (phone) => {
    showNotification('📱 Демо-режим: код 123456');
    setPhoneNumber(phone);
    setShowPhoneVerification(true);
    setCountdown(60);
    setCanResend(false);
  };

  const verifyPhone = async () => {
    if (!phoneCode || phoneCode.length !== 6) {
      showNotification('❌ Введите 6-значный код');
      return;
    }
    
    if (phoneCode === '123456') {
      setShowPhoneVerification(false);
      setPhoneCode('');
      showNotification('✅ Телефон успешно подтверждён!');
    } else {
      showNotification('❌ Неверный код');
    }
  };

  // ==================== АВТОРИЗАЦИЯ ====================

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://danett-messenger-server.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        socket.emit('user-connect', data.user.email);
        setIsConnected(true);
        showNotification(`✅ Добро пожаловать, ${data.user.username}!`);
        
        setEmailToUsername(prev => ({ ...prev, [data.user.email]: data.user.username }));
        
        loadContacts(data.user.email);
        loadUserGroups(data.user.email);
        
        if (!data.user.isVerified) {
          setTimeout(() => {
            if (window.confirm('Хотите подтвердить email?')) {
              sendVerificationCode(data.user.email);
            }
          }, 1000);
        }
      } else {
        showNotification(`❌ ${data.error}`);
      }
    } catch (error) {
      showNotification('❌ Ошибка при входе');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      showNotification('❌ Пароли не совпадают');
      return;
    }
    
    try {
      const response = await fetch('https://danett-messenger-server.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username,
          email: registerForm.email,
          phone: registerForm.phone,
          password: registerForm.password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        socket.emit('user-connect', data.user.email);
        setIsConnected(true);
        showNotification(`✅ Аккаунт создан, ${data.user.username}!`);
        
        setEmailToUsername(prev => ({ ...prev, [data.user.email]: data.user.username }));
        
        loadContacts(data.user.email);
        loadUserGroups(data.user.email);
        
        setTimeout(() => {
          sendVerificationCode(data.user.email);
          sendPhoneCode(data.user.phone);
        }, 500);
      } else {
        showNotification(`❌ ${data.error}`);
      }
    } catch (error) {
      showNotification('❌ Ошибка при регистрации');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsConnected(false);
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    socket.disconnect();
    showNotification('👋 Вы вышли из аккаунта');
  };

  // ==================== ФУНКЦИИ ДЛЯ ЗВОНКОВ ====================

  // 1. endCall (завершение звонка)
  const endCall = () => {
    if (endCallCalled.current) return;
    endCallCalled.current = true;
    
    console.log('📴 ===== ЗАВЕРШЕНИЕ ЗВОНКА =====');
    
    try {
      if (peerRef.current) {
        console.log('   Уничтожаем peer соединение');
        if (typeof peerRef.current.destroy === 'function') {
          peerRef.current.destroy();
        }
        peerRef.current = null;
      }
    } catch (err) {
      console.log('   Ошибка при уничтожении peer:', err);
    }
    
    try {
      if (localStream) {
        console.log('   Останавливаем локальные треки');
        localStream.getTracks().forEach(track => {
          try {
            track.stop();
            console.log('   Трек остановлен:', track.kind);
          } catch (e) {}
        });
      }
    } catch (err) {
      console.log('   Ошибка при остановке треков:', err);
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    
    try {
      console.log('   Отправляем сигнал end-call');
      socket.emit('end-call', {
        to: recipient || callerEmail,
        from: currentUser.email,
        fromUsername: currentUser.username
      });
    } catch (err) {
      console.log('   Ошибка при отправке end-call:', err);
    }
    
    setTimeout(() => {
      endCallCalled.current = false;
    }, 1000);
  };

  // 2. rejectCall (отклонение звонка)
  const rejectCall = () => {
    console.log('❌ ===== ОТКЛОНЕНИЕ ЗВОНКА =====');
    console.log('   Отклоняем звонок от:', callerName);
    
    socket.emit('reject-call', {
      to: callerEmail,
      from: currentUser.email,
      fromUsername: currentUser.username
    });
    setIsCallIncoming(false);
    setCallerName('');
    setCallerEmail('');
  };

  // 3. startCall (инициация звонка)
  const startCall = async () => {
    if (!recipient || !currentUser) return;
    
    console.log('📞 ===== НАЧАЛО ЗВОНКА =====');
    console.log('   Кому:', recipient);
    console.log('   Статус получателя:', onlineUsers[recipient]);
    
    if (onlineUsers[recipient] !== 'online') {
      showNotification('❌ Пользователь не в сети');
      return;
    }
    
    try {
      console.log('📹 Запрашиваем доступ к камере и микрофону...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        }, 
        audio: true 
      });
      
      console.log('✅ Доступ получен!');
      console.log('   Видео треков:', stream.getVideoTracks().length);
      console.log('   Аудио треков:', stream.getAudioTracks().length);
      
      stream.getVideoTracks().forEach(track => {
        console.log('   Видео трек:', track.label, 'enabled:', track.enabled);
      });
      
      stream.getAudioTracks().forEach(track => {
        console.log('   Аудио трек:', track.label, 'enabled:', track.enabled);
      });
      
      setLocalStream(stream);
      callState.current.localStream = stream;
      
      setTimeout(() => {
        if (localVideoRef.current) {
          console.log('📹 Подключаем локальное видео после задержки');
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play()
            .then(() => console.log('✅ Локальное видео воспроизводится'))
            .catch(e => console.error('❌ Ошибка воспроизведения локального видео:', e));
        } else {
          console.error('❌ localVideoRef не найден!');
        }
      }, 100);
      
      console.log('🔌 Создаем Peer соединение (инициатор)...');
      const SimplePeer = (await import('simple-peer')).default;
      const peer = new SimplePeer({ 
        initiator: true, 
        stream, 
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ]
        }
      });
      
      callState.current.peer = peer;
      peerRef.current = peer;
      
      peer.on('signal', (data) => {
        console.log('📡 Отправка сигнала (offer) получателю:', recipient);
        console.log('   Размер offer:', JSON.stringify(data).length);
        
        socket.emit('call-user', {
          to: recipient,
          from: currentUser.email,
          fromUsername: currentUser.username,
          offer: data
        });
      });
      
      peer.on('stream', (remoteStream) => {
        console.log('📹 ===== ПОЛУЧЕН УДАЛЕННЫЙ ПОТОК =====');
        console.log('   Видео треков:', remoteStream.getVideoTracks().length);
        console.log('   Аудио треков:', remoteStream.getAudioTracks().length);
        
        remoteStream.getTracks().forEach(track => {
          console.log(`   ${track.kind} трек:`, track.label, 'enabled:', track.enabled);
        });
        
        setRemoteStream(remoteStream);
        callState.current.remoteStream = remoteStream;
        
        if (remoteVideoRef.current) {
          console.log('📹 Подключаем удаленное видео к элементу');
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play()
            .then(() => {
              console.log('✅ Удаленное видео успешно воспроизводится');
              console.log('   video readyState:', remoteVideoRef.current.readyState);
              console.log('   video paused:', remoteVideoRef.current.paused);
            })
            .catch(e => console.error('❌ Ошибка воспроизведения удаленного видео:', e));
        } else {
          console.error('❌ remoteVideoRef не найден!');
          
          setTimeout(() => {
            if (remoteVideoRef.current) {
              console.log('✅ remoteVideoRef найден после задержки');
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch(e => console.error('Ошибка:', e));
            }
          }, 500);
        }
      });
      
      peer.on('error', (err) => {
        console.error('❌ Peer error:', err);
        showNotification('❌ Ошибка соединения');
      });
      
      peer.on('connect', () => {
        console.log('🔗 ===== СОЕДИНЕНИЕ УСТАНОВЛЕНО! =====');
        showNotification('✅ Соединение установлено');
      });
      
      setIsCallActive(true);
      
      setTimeout(() => {
        if (peerRef.current && !peerRef.current.connected) {
          console.log('⏱️ Таймаут ожидания ответа');
          endCall();
          showNotification('❌ Собеседник не ответил');
        }
      }, 30000);
      
    } catch (error) {
      console.error('❌ Ошибка доступа к камере:', error);
      showNotification('❌ Не удалось получить доступ к камере');
    }
  };

  // 4. acceptCall (принятие звонка)
  const acceptCall = async () => {
    try {
      console.log('📞 ===== ПРИНЯТИЕ ЗВОНКА =====');
      console.log('📹 Запрашиваем доступ к камере и микрофону...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        }, 
        audio: true 
      });
      
      console.log('✅ Доступ получен!');
      console.log('   Видео треков:', stream.getVideoTracks().length);
      console.log('   Аудио треков:', stream.getAudioTracks().length);
      
      setLocalStream(stream);
      callState.current.localStream = stream;
      
      if (localVideoRef.current) {
        console.log('📹 Подключаем локальное видео');
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play()
          .then(() => console.log('✅ Локальное видео воспроизводится'))
          .catch(e => console.error('❌ Ошибка воспроизведения локального видео:', e));
      }
      
      console.log('🔌 Создаем Peer соединение (не инициатор)...');
      const SimplePeer = (await import('simple-peer')).default;
      const peer = new SimplePeer({ 
        initiator: false, 
        stream, 
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
      
      callState.current.peer = peer;
      peerRef.current = peer;
      
      peer.on('signal', (data) => {
        console.log('📡 ===== ОТПРАВКА ANSWER =====');
        console.log('   Кому:', callerEmail);
        console.log('   Размер данных:', JSON.stringify(data).length);
        
        socket.emit('accept-call', {
          to: callerEmail,
          from: currentUser.email,
          fromUsername: currentUser.username,
          answer: data
        });
      });
      
      peer.on('stream', (remoteStream) => {
        console.log('📹 ===== ПОЛУЧЕН УДАЛЕННЫЙ ПОТОК (acceptCall) =====');
        console.log('   Видео треков:', remoteStream.getVideoTracks().length);
        console.log('   Аудио треков:', remoteStream.getAudioTracks().length);
        
        remoteStream.getTracks().forEach(track => {
          console.log(`   ${track.kind} трек:`, track.label, 'enabled:', track.enabled);
        });
        
        setRemoteStream(remoteStream);
        callState.current.remoteStream = remoteStream;
        
        if (remoteVideoRef.current) {
          console.log('📹 Подключаем удаленное видео');
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play()
            .then(() => console.log('✅ Удаленное видео воспроизводится'))
            .catch(e => console.error('❌ Ошибка воспроизведения:', e));
        } else {
          console.error('❌ remoteVideoRef не найден!');
        }
      });
      
      peer.on('error', (err) => {
        console.error('❌ Peer error:', err);
      });
      
      peer.on('connect', () => {
        console.log('🔗 Соединение установлено!');
      });
      
      setIsCallActive(true);
      setIsCallIncoming(false);
      
    } catch (error) {
      console.error('❌ Ошибка доступа к камере:', error);
      showNotification('❌ Не удалось получить доступ к камере');
    }
  };

  // 5. toggleAudio (включение/выключение микрофона)
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        console.log('🎤 Микрофон:', audioTrack.enabled ? 'включен' : 'выключен');
      }
    }
  };

  // 6. toggleVideo (включение/выключение камеры)
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        console.log('📹 Камера:', videoTrack.enabled ? 'включена' : 'выключена');
      }
    }
  };

  // ==================== ЗАГРУЗКА ДАННЫХ ====================

  const loadMessageHistory = async (contact) => {
    try {
      const response = await fetch(`https://danett-messenger-server.onrender.com/api/messages/${encodeURIComponent(currentUser.email)}/${encodeURIComponent(contact)}`);
      const messages = await response.json();
      
      const formattedMessages = messages.map(msg => ({
        text: msg.message,
        from: msg.from === currentUser.email ? 'me' : msg.from,
        fromUsername: emailToUsername[msg.from] || msg.from,
        timestamp: new Date(msg.timestamp).toLocaleTimeString()
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const loadContacts = async (email) => {
    try {
      const response = await fetch(`https://danett-messenger-server.onrender.com/api/contacts/${encodeURIComponent(email)}`);
      const contacts = await response.json();
      
      const contactsObj = {};
      contacts.forEach(contact => {
        contactsObj[contact] = onlineUsers[contact] || 'offline';
      });
      
      setOnlineUsers(prev => ({ ...prev, ...contactsObj }));
      
      contacts.forEach(async (contactEmail) => {
        try {
          const userResponse = await fetch(`https://danett-messenger-server.onrender.com/api/auth/user-by-email/${encodeURIComponent(contactEmail)}`);
          const userData = await userResponse.json();
          if (userData.username) {
            setEmailToUsername(prev => ({ ...prev, [contactEmail]: userData.username }));
          }
        } catch (err) {
          console.log('Не удалось загрузить username для', contactEmail);
        }
      });
      
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error);
    }
  };
  
  // Синхронизация статусов
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    
    socket.on('user-status', ({ userEmail, status }) => {
      console.log('👤 Статус пользователя:', userEmail, status);
      setOnlineUsers(prev => ({ ...prev, [userEmail]: status }));
      
      if (userEmail === currentUser.email) return;
      
      const username = emailToUsername[userEmail] || userEmail;
      if (status === 'online') {
        showNotification(`${username} появился в сети 🟢`);
      } else {
        showNotification(`${username} вышел из сети 🔴`);
      }
    });
    
    return () => {
      socket.off('user-status');
    };
  }, [isAuthenticated, currentUser, emailToUsername]);

  // ==================== ГРУППЫ ====================

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0 || !currentUser) return;
    
    try {
      const response = await fetch('https://danett-messenger-server.onrender.com/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          members: selectedMembers,
          admin: currentUser.email
        })
      });
      
      const newGroup = await response.json();
      
      if (response.ok) {
        setGroups(prev => [...prev, newGroup]);
        setShowCreateGroup(false);
        setNewGroupName('');
        setSelectedMembers([]);
        showNotification(`✅ Группа "${newGroup.name}" создана`);
      }
    } catch (error) {
      showNotification('❌ Ошибка создания группы');
    }
  };

  const deleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Точно удалить группу "${groupName}"?`) || !currentUser) return;
    
    try {
      const response = await fetch(`https://danett-messenger-server.onrender.com/api/groups/${groupId}?email=${encodeURIComponent(currentUser.email)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setGroups(prev => prev.filter(g => g._id !== groupId));
        if (currentGroup?._id === groupId) {
          setCurrentGroup(null);
          setGroupMessages([]);
        }
        showNotification(`✅ Группа "${groupName}" удалена`);
      }
    } catch (error) {
      showNotification('❌ Ошибка удаления группы');
    }
  };
  
  // ==================== СООБЩЕНИЯ ====================

  const sendMessage = () => {
    if (message.trim() && recipient && currentUser) {
      socket.emit('private-message', {
        to: recipient,
        message: message,
        from: currentUser.email
      });
      
      const newMessage = {
        text: message,
        from: 'me',
        to: recipient,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      socket.emit('typing', { to: recipient, from: currentUser.email, isTyping: false });
    }
  };

  const sendGroupMessage = () => {
    if (message.trim() && currentGroup && currentUser) {
      socket.emit('group-message', {
        groupId: currentGroup._id,
        from: currentUser.email,
        message: message
      });
      
      const newMessage = {
        text: message,
        from: 'me',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setGroupMessages(prev => [...prev, newMessage]);
      setMessage('');
    }
  };

  // ==================== ВСПОМОГАТЕЛЬНЫЕ ====================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, groupMessages]);
  
  // ==================== ОБРАБОТКА WEBRTC СИГНАЛОВ ====================
  useEffect(() => {
    if (!isAuthenticated) return;

    socket.on('incoming-call', (data) => {
      console.log('📞 ===== ВХОДЯЩИЙ ЗВОНОК =====');
      console.log('   От:', data.from);
      console.log('   Имя:', data.fromUsername);
      console.log('   Текущий статус звонка:', isCallActive ? 'активен' : 'не активен');
      
      if (isCallActive) {
        console.log('❌ Пользователь уже занят звонком');
        socket.emit('call-busy', {
          to: data.from,
          from: currentUser.email,
          fromUsername: currentUser.username
        });
        return;
      }
      
      setCallerName(data.fromUsername);
      setCallerEmail(data.from);
      setIsCallIncoming(true);
      playCallSound();
    });

    socket.on('call-accepted', (data) => {
      console.log('✅ ===== ЗВОНОК ПРИНЯТ =====');
      console.log('   От (кто принял):', data.from);
      console.log('   Имя:', data.fromUsername);
      console.log('   Есть answer:', !!data.answer);
      
      if (peerRef.current) {
        console.log('📡 Отправляем answer в peer');
        peerRef.current.signal(data.answer);
      } else {
        console.error('❌ peerRef.current не существует!');
      }
    });

    socket.on('call-rejected', (data) => {
      console.log('❌ ===== ЗВОНОК ОТКЛОНЕН =====');
      console.log('   От:', data.from);
      console.log('   Имя:', data.fromUsername);
      showNotification(`❌ ${data.fromUsername} отклонил(а) звонок`);
      endCall();
    });

    socket.on('call-busy', (data) => {
      console.log('📞 ===== ПОЛЬЗОВАТЕЛЬ ЗАНЯТ =====');
      console.log('   От:', data.from);
      console.log('   Имя:', data.fromUsername);
      showNotification(`📞 ${data.fromUsername} сейчас занят(а)`);
      endCall();
    });

    socket.on('ice-candidate', (data) => {
      console.log('🧊 ICE кандидат получен от', data.from);
      if (peerRef.current) {
        peerRef.current.signal(data.candidate);
      }
    });

    socket.on('call-ended', (data) => {
      console.log('📴 ===== ЗВОНОК ЗАВЕРШЕН =====');
      console.log('   От:', data.from);
      if (isCallActive) {
        showNotification(`📴 Звонок завершен`);
        endCall();
      }
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-busy');
      socket.off('ice-candidate');
      socket.off('call-ended');
    };
  }, [isAuthenticated, isCallActive, currentUser]);

  useEffect(() => {
    if (!isAuthenticated) return;

    socket.on('private-message', (data) => {
      const newMessage = {
        text: data.message,
        from: data.from,
        fromUsername: emailToUsername[data.from] || data.from,
        timestamp: new Date(data.timestamp).toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      if (data.from !== currentUser?.email) {
        const senderName = emailToUsername[data.from] || data.from;
        showNotification(`Новое сообщение от ${senderName}`);
        playCallSound();
      }
    });

    socket.on('group-message', (data) => {
      if (currentGroup && data.groupId === currentGroup._id) {
        setGroupMessages(prev => [...prev, {
          text: data.message,
          from: data.from,
          fromUsername: emailToUsername[data.from] || data.from,
          timestamp: new Date(data.timestamp).toLocaleTimeString()
        }]);
      }
      
      if (data.from !== currentUser?.email) {
        showNotification(`Новое сообщение в группе`);
        playCallSound();
      }
    });

    socket.on('user-status', ({ userEmail, status }) => {
      setOnlineUsers(prev => ({ ...prev, [userEmail]: status }));
    });

    socket.on('typing-status', ({ from, isTyping }) => {
      if (from === recipient) {
        const fromName = emailToUsername[from] || from;
        setTypingStatus(isTyping ? `${fromName} печатает...` : '');
      }
    });

    return () => {
      socket.off('private-message');
      socket.off('group-message');
      socket.off('user-status');
      socket.off('typing-status');
    };
  }, [recipient, currentUser, currentGroup, isAuthenticated, emailToUsername]);

  useEffect(() => {
    if (recipient && currentUser?.email && activeTab === 'chats') {
      loadMessageHistory(recipient);
    }
  }, [recipient, currentUser, activeTab]);

  useEffect(() => {
    if (currentGroup && activeTab === 'groups') {
      loadGroupMessages(currentGroup._id);
    }
  }, [currentGroup, activeTab]);

  // ==================== ЗВУК ====================

  const initAudio = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
  };

  useEffect(() => {
    const handleFirstClick = () => {
      initAudio();
      document.removeEventListener('click', handleFirstClick);
    };
    document.addEventListener('click', handleFirstClick);
    return () => document.removeEventListener('click', handleFirstClick);
  }, []);

  const playCallSound = () => {
    if (!soundEnabled) return;
    
    const sound = new Audio('/sounds/notification.mp3');
    sound.volume = 0.3;
    sound.play().catch(e => {
      console.log('Первый звук не сработал, пробуем второй');
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    });
  };

  const showNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  };

  const handleTyping = () => {
    if (recipient && currentUser) {
      socket.emit('typing', { to: recipient, from: currentUser.email, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { to: recipient, from: currentUser.email, isTyping: false });
      }, 1000);
    }
  };

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const toggleMember = (email) => {
    setSelectedMembers(prev => 
      prev.includes(email) ? prev.filter(m => m !== email) : [...prev, email]
    );
  };

  const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '😢', '😡'];
  
  const filteredUsers = Object.entries(onlineUsers)
    .filter(([email]) => email !== currentUser?.email)
    .filter(([email]) => {
      const username = emailToUsername[email] || email;
      return username.toLowerCase().includes(searchTerm.toLowerCase());
    });

  // ==================== РЕНДЕР ====================

  if (!isAuthenticated) {
    return (
      <div className="App" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '400px',
          maxWidth: '90%'
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#667eea' }}>
            ✨ Danett Messenger
          </h1>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <button onClick={() => setAuthMode('login')} style={tabButtonStyle(authMode === 'login')}>Вход</button>
            <button onClick={() => setAuthMode('register')} style={tabButtonStyle(authMode === 'register')}>Регистрация</button>
          </div>

          {showVerification ? (
            <div>
              <h3>Подтверждение email</h3>
              <p>Код отправлен на {verificationEmail}</p>
              <input
                type="text"
                placeholder="Введите 6-значный код"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={inputStyle}
                maxLength="6"
              />
              <button onClick={() => setShowVerification(false)} style={cancelButtonStyle}>Назад</button>
              <button onClick={verifyEmail} style={submitButtonStyle}>Подтвердить</button>
              <div>
                {countdown > 0 ? (
                  <span>Отправить повторно через {countdown}с</span>
                ) : (
                  <button onClick={resendCode} style={linkButtonStyle}>Отправить код повторно</button>
                )}
              </div>
            </div>
          ) : showPhoneVerification ? (
            <div>
              <h3>Подтверждение телефона</h3>
              <p>Демо-режим: используйте код 123456</p>
              <input
                type="text"
                placeholder="Введите 6-значный код"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={inputStyle}
                maxLength="6"
              />
              <button onClick={() => setShowPhoneVerification(false)} style={cancelButtonStyle}>Назад</button>
              <button onClick={verifyPhone} style={submitButtonStyle}>Подтвердить</button>
            </div>
          ) : authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              <input type="text" placeholder="Email, телефон или имя" value={loginForm.login}
                onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })} style={inputStyle} required />
              <input type="password" placeholder="Пароль" value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} style={inputStyle} required />
              <button type="submit" style={submitButtonStyle}>Войти</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Имя пользователя" value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })} style={inputStyle} required />
              <input type="email" placeholder="Email" value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} style={inputStyle} required />
              <input type="tel" placeholder="Телефон" value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} style={inputStyle} required />
              <input type="password" placeholder="Пароль" value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} style={inputStyle} required />
              <input type="password" placeholder="Подтвердите пароль" value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} style={inputStyle} required />
              <button type="submit" style={submitButtonStyle}>Зарегистрироваться</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Основной интерфейс
  return (
    <div className="App">
      {notifications.map(notif => (
        <div key={notif.id} className="notification">{notif.message}</div>
      ))}

      <header className="App-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1>✨ Danett Messenger</h1>
          <button onClick={() => setSoundEnabled(!soundEnabled)} style={soundButtonStyle}>
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          {currentUser && !currentUser.isVerified && (
            <button onClick={() => sendVerificationCode(currentUser.email)} style={{
              padding: '5px 10px', background: '#ff9800', color: 'white',
              border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px'
            }}>✉️ Подтвердить email</button>
          )}
        </div>
        <div className="status-bar">
          <span className="online-count">
            Онлайн: {Object.values(onlineUsers).filter(s => s === 'online').length}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ color: 'white' }}>{currentUser?.username}{currentUser?.isVerified && ' ✅'}</span>
            <button onClick={handleLogout} style={logoutButtonStyle}>Выйти</button>
          </div>
        </div>
      </header>

      {/* Модальное окно для подтверждения email */}
      {showVerification && (
        <div style={modalStyle}>
          <h3>Подтверждение email</h3>
          <p>Код отправлен на {verificationEmail}</p>
          <input type="text" placeholder="Введите 6-значный код" value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={inputStyle} maxLength="6" />
          <button onClick={() => setShowVerification(false)} style={cancelButtonStyle}>Закрыть</button>
          <button onClick={verifyEmail} style={submitButtonStyle}>Подтвердить</button>
          <div>
            {countdown > 0 ? (
              <span>Отправить повторно через {countdown}с</span>
            ) : (
              <button onClick={resendCode} style={linkButtonStyle}>Отправить код повторно</button>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно входящего звонка */}
      {isCallIncoming && (
        <div style={modalStyle}>
          <h3>📞 Входящий звонок</h3>
          <p>{callerName} звонит вам...</p>
          <button onClick={acceptCall} style={submitButtonStyle}>✅ Ответить</button>
          <button onClick={rejectCall} style={cancelButtonStyle}>❌ Отклонить</button>
        </div>
      )}

      {/* Панель видеозвонка */}
      {isCallActive && (
        <>
          {/* Свёрнутый режим */}
          {isCallMinimized ? (
            <div
              onClick={() => setIsCallMinimized(false)}
              style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '300px',
                height: '200px',
                background: '#1a1a1a',
                borderRadius: '10px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 2000,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '2px solid #4CAF50'
              }}
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#333',
                  objectFit: 'cover'
                }}
              />
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '5px',
                fontSize: '12px'
              }}>
                📹 Звонок
              </div>
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '5px',
                fontSize: '12px'
              }}>
                {recipientUsername}
              </div>
            </div>
          ) : (
            /* Развёрнутый режим */
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '1200px',
              height: '80vh',
              background: '#1a1a1a',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              zIndex: 2000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Шапка звонка */}
              <div style={{
                padding: '15px 20px',
                background: '#2d2d2d',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #404040'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>📹</span>
                  <strong style={{ fontSize: '18px' }}>Видеозвонок с {recipientUsername}</strong>
                </div>
                <button
                  onClick={() => setIsCallMinimized(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '5px 10px'
                  }}
                >
                  ⚪
                </button>
              </div>

              {/* Основная область видео */}
              <div style={{
                flex: 1,
                display: 'flex',
                padding: '20px',
                gap: '20px',
                background: '#1a1a1a',
                position: 'relative'
              }}>
                {/* Видео собеседника */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    flex: 1,
                    width: '100%',
                    height: '100%',
                    background: '#333',
                    borderRadius: '10px',
                    objectFit: 'cover'
                  }}
                />
                
                {/* Своё видео */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '200px',
                    height: '150px',
                    position: 'absolute',
                    bottom: '30px',
                    right: '30px',
                    borderRadius: '10px',
                    border: '3px solid #4CAF50',
                    background: '#333',
                    objectFit: 'cover',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                  }}
                />
              </div>

              {/* Панель управления */}
              <div style={{
                padding: '20px',
                background: '#2d2d2d',
                borderTop: '1px solid #404040',
                display: 'flex',
                justifyContent: 'center',
                gap: '15px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={toggleAudio}
                  style={{
                    padding: '12px 25px',
                    background: isAudioMuted ? '#ff4444' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                >
                  {isAudioMuted ? '🔇 Микрофон выкл' : '🎤 Микрофон вкл'}
                </button>
                
                <button
                  onClick={toggleVideo}
                  style={{
                    padding: '12px 25px',
                    background: isVideoOff ? '#ff4444' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                >
                  {isVideoOff ? '📹 Камера выкл' : '📹 Камера вкл'}
                </button>
                
                <button
                  onClick={endCall}
                  style={{
                    padding: '12px 35px',
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                >
                  📴 Завершить звонок
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      <div className="container">
        <div className="sidebar">
          <div className="sidebar-header">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button onClick={() => setActiveTab('chats')} style={tabButtonStyle(activeTab === 'chats')}>💬 Чаты</button>
              <button onClick={() => setActiveTab('groups')} style={tabButtonStyle(activeTab === 'groups')}>👥 Группы</button>
            </div>
            
            {activeTab === 'chats' ? (
              <>
                <h3>👥 Контакты</h3>
                <input type="text" placeholder="Поиск по имени..." className="user-search"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </>
            ) : (
              <>
                <h3>👥 Группы</h3>
                <button onClick={() => setShowCreateGroup(true)} style={createGroupButtonStyle}>+ Создать группу</button>
              </>
            )}
          </div>

          <div className="users-list">
            {activeTab === 'chats' ? (
              filteredUsers.map(([email, status]) => {
                const displayName = emailToUsername[email] || email;
                return (
                  <div key={email} className={`user-item ${recipient === email ? 'selected' : ''}`}
                       onClick={() => { setRecipient(email); setRecipientUsername(displayName); setCurrentGroup(null); }}>
                    <div className="user-avatar">{displayName.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                      <div className="user-name">{displayName}<span className={`status-dot ${status}`}></span></div>
                      <div className="last-message">{status === 'online' ? 'В сети' : 'Был недавно'}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              groups.map(group => (
                <div key={group._id} className={`user-item ${currentGroup?._id === group._id ? 'selected' : ''}`}
                     onClick={() => { setCurrentGroup(group); setRecipient(''); }}>
                  <div className="user-avatar" style={{ background: '#ff9800' }}>👥</div>
                  <div className="user-info">
                    <div className="user-name">{group.name}</div>
                    <div className="last-message">{group.members?.length || 0} участников</div>
                  </div>
                  {group.admin === currentUser?.email && (
                    <button onClick={(e) => { e.stopPropagation(); deleteGroup(group._id, group.name); }}
                            style={deleteButtonStyle}>🗑️</button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chat-area">
          {showCreateGroup && (
            <div style={modalStyle}>
              <h3>Создание группы</h3>
              <input type="text" placeholder="Название группы" value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)} style={inputStyle} />
              <h4>Выберите участников:</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {Object.keys(onlineUsers).map(email => email !== currentUser?.email && (
                  <div key={email}>
                    <label>
                      <input type="checkbox" checked={selectedMembers.includes(email)}
                             onChange={() => toggleMember(email)} />
                      {emailToUsername[email] || email}
                    </label>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowCreateGroup(false)} style={cancelButtonStyle}>Отмена</button>
              <button onClick={createGroup} style={submitButtonStyle}>Создать</button>
            </div>
          )}

          {activeTab === 'chats' && recipient ? (
            <>
              <div className="chat-header">
                <div className="chat-user-info">
                  <div className="chat-user-avatar">{recipientUsername.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="chat-user-name">{recipientUsername}</div>
                    <div className="chat-user-status">
                      {onlineUsers[recipient] === 'online' ? '🟢 В сети' : '🔴 Офлайн'}
                    </div>
                  </div>
                </div>
                {onlineUsers[recipient] === 'online' && !isCallActive && (
                  <button onClick={startCall} style={{
                    padding: '8px 15px', background: '#4CAF50', color: 'white',
                    border: 'none', borderRadius: '10px', cursor: 'pointer'
                  }}>📞 Позвонить</button>
                )}
              </div>

              <div className="messages-container">
                {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.from === 'me' ? 'my-message' : ''}`}>
                    <div className="message-content">
                      {msg.from !== 'me' && <div className="message-sender">{emailToUsername[msg.from] || msg.from}</div>}
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">{msg.timestamp}</div>
                    </div>
                  </div>
                ))}
                {typingStatus && (
                  <div className="message"><div className="message-content"><em>{typingStatus}</em></div></div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input-area">
                <div className="message-form">
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={emojiButtonStyle}>😊</button>
                  {showEmojiPicker && (
                    <div style={emojiPickerStyle}>
                      {emojis.map(emoji => (
                        <button key={emoji} onClick={() => addEmoji(emoji)} style={emojiButtonStyle}>{emoji}</button>
                      ))}
                    </div>
                  )}
                  <input type="text" placeholder={onlineUsers[recipient] === 'online' 
                    ? `Напишите сообщение для ${recipientUsername}...` 
                    : `${recipientUsername} не в сети. Сообщение придет, когда он появится.`}
                    value={message} onChange={(e) => setMessage(e.target.value)}
                    onKeyUp={handleTyping} onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={!isConnected} />
                  <button onClick={sendMessage} disabled={!isConnected || !recipient}>➤</button>
                </div>
              </div>
            </>
          ) : activeTab === 'groups' && currentGroup ? (
            <>
              <div className="chat-header">
                <div className="chat-user-info">
                  <div className="chat-user-avatar" style={{ background: '#ff9800' }}>👥</div>
                  <div>
                    <div className="chat-user-name">{currentGroup.name}</div>
                    <div className="chat-user-status">{currentGroup.members?.length || 0} участников</div>
                  </div>
                </div>
                {currentGroup.admin === currentUser?.email && (
                  <button onClick={() => deleteGroup(currentGroup._id, currentGroup.name)} style={deleteGroupButtonStyle}>
                    🗑️ Удалить группу
                  </button>
                )}
              </div>

              <div className="messages-container">
                {groupMessages.map((msg, index) => (
                  <div key={index} className={`message ${msg.from === 'me' ? 'my-message' : ''}`}>
                    <div className="message-content">
                      {msg.from !== 'me' && <div className="message-sender">{emailToUsername[msg.from] || msg.from}</div>}
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">{msg.timestamp}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input-area">
                <div className="message-form">
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={emojiButtonStyle}>😊</button>
                  {showEmojiPicker && (
                    <div style={emojiPickerStyle}>
                      {emojis.map(emoji => (
                        <button key={emoji} onClick={() => addEmoji(emoji)} style={emojiButtonStyle}>{emoji}</button>
                      ))}
                    </div>
                  )}
                  <input type="text" placeholder={`Напишите сообщение в группу ${currentGroup.name}...`}
                    value={message} onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendGroupMessage()} disabled={!isConnected} />
                  <button onClick={sendGroupMessage} disabled={!isConnected || !currentGroup}>➤</button>
                </div>
              </div>
            </>
          ) : (
            <div style={placeholderStyle}>
              {activeTab === 'chats' ? 'Выберите собеседника, чтобы начать общение 💬' : 'Выберите группу или создайте новую 👥'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== СТИЛИ ====================

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '15px',
  border: '1px solid #e0e0e0',
  borderRadius: '10px',
  fontSize: '16px'
};

const submitButtonStyle = {
  padding: '12px 20px',
  background: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontSize: '16px',
  cursor: 'pointer',
  margin: '5px'
};

const cancelButtonStyle = {
  padding: '12px 20px',
  background: '#f0f0f0',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  margin: '5px'
};

const logoutButtonStyle = {
  padding: '5px 10px',
  background: '#ff4444',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer'
};

const soundButtonStyle = {
  background: 'transparent',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  padding: '5px'
};

const linkButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#667eea',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: '14px'
};

const tabButtonStyle = (isActive) => ({
  padding: '8px 15px',
  background: isActive ? '#667eea' : '#f0f0f0',
  color: isActive ? 'white' : '#333',
  border: 'none',
  borderRadius: '20px',
  cursor: 'pointer'
});

const createGroupButtonStyle = {
  width: '100%',
  padding: '10px',
  background: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  marginBottom: '10px'
};

const deleteButtonStyle = {
  padding: '5px 10px',
  background: '#ff4444',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '12px',
  marginLeft: '10px'
};

const deleteGroupButtonStyle = {
  padding: '8px 15px',
  background: '#ff4444',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer'
};

const modalStyle = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'white',
  padding: '30px',
  borderRadius: '20px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  zIndex: 1000,
  width: '400px'
};

const emojiPickerStyle = {
  position: 'absolute',
  bottom: '50px',
  left: '0',
  background: 'white',
  border: '1px solid #e0e0e0',
  borderRadius: '10px',
  padding: '10px',
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '5px',
  boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
  zIndex: 100
};

const emojiButtonStyle = {
  padding: '5px',
  fontSize: '20px',
  border: 'none',
  background: 'none',
  cursor: 'pointer'
};

const placeholderStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#999',
  fontSize: '18px'
};

export default App;