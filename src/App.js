import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';
import Profile from './components/Profile';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'https://danett-messenger-server.onrender.com');

function App() {
  // ==================== СОСТОЯНИЯ ====================
  
  // Авторизация
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  
  // Подтверждение
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  
  // Формы
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  
  // Основные
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [recipient, setRecipient] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
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
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  // UI состояния
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  
  // Звонки
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [callerEmail, setCallerEmail] = useState('');
  const [callerOffer, setCallerOffer] = useState(null);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  
  // Словарь email -> username
  const [emailToUsername, setEmailToUsername] = useState({});
  
  // Refs
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const countdownInterval = useRef(null);
  const pendingCandidates = useRef([]); // Для ICE-кандидатов до установки соединения

  // ==================== ЭФФЕКТЫ ====================

  // Проверка токена при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedTheme = localStorage.getItem('darkTheme') === 'true';
    setDarkTheme(savedTheme);
    if (token) {
      fetchUserData(token);
    }
  }, []);

  // Применение темы
  useEffect(() => {
    if (darkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('darkTheme', darkTheme);
  }, [darkTheme]);

  // Таймер для подтверждения
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

  // Скролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, groupMessages]);

  // Загрузка истории при смене собеседника
  useEffect(() => {
    if (recipient && currentUser?.email && activeTab === 'chats') {
      loadMessageHistory(recipient);
    }
  }, [recipient, currentUser, activeTab]);

  // Загрузка сообщений группы при смене группы
  useEffect(() => {
    if (currentGroup && activeTab === 'groups') {
      loadGroupMessages(currentGroup._id);
    }
  }, [currentGroup, activeTab]);

  // ==================== СОКЕТЫ ====================

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    // Подключение
    socket.on('connect', () => {
      console.log('✅ Сокет подключен');
      setIsConnected(true);
      socket.emit('user-connect', currentUser.email);
      showNotification('✅ Соединение восстановлено');
    });

    socket.on('disconnect', () => {
      console.log('❌ Сокет отключен');
      setIsConnected(false);
      showNotification('❌ Потеряно соединение с сервером');
    });

    socket.on('connect_error', (error) => {
      console.error('Ошибка сокета:', error);
      showNotification('❌ Ошибка подключения к серверу');
    });

    // Онлайн статусы
    socket.on('current-users', (users) => {
      console.log('👥 Текущие онлайн:', users);
      const newOnlineStatus = {};
      users.forEach(email => {
        newOnlineStatus[email] = 'online';
      });
      setOnlineUsers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(email => {
          updated[email] = users.includes(email) ? 'online' : 'offline';
        });
        return updated;
      });
    });

    socket.on('online-users-update', (onlineEmails) => {
      setOnlineUsers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(email => {
          updated[email] = onlineEmails.includes(email) ? 'online' : 'offline';
        });
        return updated;
      });
    });

    socket.on('user-status', ({ userEmail, status }) => {
      console.log(`👤 ${userEmail}: ${status}`);
      setOnlineUsers(prev => ({ ...prev, [userEmail]: status }));
      
      if (userEmail !== currentUser.email) {
        const username = emailToUsername[userEmail] || userEmail;
        showNotification(`${username} ${status === 'online' ? '🟢 в сети' : '🔴 вышел'}`);
      }
    });

    // Сообщения
    socket.on('private-message', (data) => {
      const newMessage = {
        text: data.message,
        from: data.from,
        fromUsername: emailToUsername[data.from] || data.from,
        timestamp: new Date(data.timestamp).toLocaleTimeString(),
        id: data.id
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      if (data.from !== currentUser?.email) {
        const senderName = emailToUsername[data.from] || data.from;
        showNotification(`💬 ${senderName}: ${data.message.substring(0, 30)}${data.message.length > 30 ? '...' : ''}`);
        playSound('message');
      }
    });

    socket.on('group-message', (data) => {
      if (currentGroup && data.groupId === currentGroup._id) {
        setGroupMessages(prev => [...prev, {
          text: data.message,
          from: data.from,
          fromUsername: emailToUsername[data.from] || data.from,
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
          id: data.id
        }]);
      }
      
      if (data.from !== currentUser?.email) {
        showNotification(`👥 Новое сообщение в группе`);
        playSound('message');
      }
    });

    socket.on('typing-status', ({ from, isTyping }) => {
      if (from === recipient) {
        const fromName = emailToUsername[from] || from;
        setTypingStatus(isTyping ? `${fromName} печатает...` : '');
      }
    });

    socket.on('message-sent', (data) => {
      // Можно обновить ID сообщения если нужно
    });

    socket.on('message-error', (data) => {
      showNotification(`❌ Ошибка: ${data.message}`);
    });

    // ==================== ЗВОНКИ (ИСПРАВЛЕНО) ====================

    socket.on('incoming-call', (data) => {
      console.log('📞 Входящий звонок от', data.fromUsername);
      
      if (isCallActive) {
        socket.emit('call-busy', {
          to: data.from,
          from: currentUser.email,
          fromUsername: currentUser.username
        });
        return;
      }
      
      setCallerName(data.fromUsername);
      setCallerEmail(data.from);
      setCallerOffer(data.offer);
      setCurrentCallId(data.callId);
      setIsCallIncoming(true);
      playSound('ringtone');
    });

    socket.on('call-ringing', () => {
      playSound('ringback');
    });

    socket.on('call-accepted', (data) => {
      console.log('✅ Звонок принят');
      if (peerRef.current) {
        peerRef.current.signal(data.answer);
      }
      // Отправляем накопленные ICE-кандидаты
      pendingCandidates.current.forEach(candidate => {
        if (peerRef.current) {
          peerRef.current.signal(candidate);
        }
      });
      pendingCandidates.current = [];
    });

    socket.on('call-rejected', (data) => {
      console.log('❌ Звонок отклонен');
      showNotification(`❌ ${data.fromUsername} отклонил(а) звонок`);
      endCall();
    });

    socket.on('call-busy', (data) => {
      console.log('📞 Пользователь занят');
      showNotification(`📞 ${data.fromUsername} сейчас занят(а)`);
      endCall();
    });

    socket.on('ice-candidate', (data) => {
      if (peerRef.current) {
        peerRef.current.signal(data.candidate);
      } else {
        pendingCandidates.current.push(data.candidate);
      }
    });

    socket.on('call-ended', (data) => {
      console.log('📴 Звонок завершен');
      if (isCallActive) {
        showNotification(`📴 Звонок завершен`);
        endCall();
      }
    });

    socket.on('call-audio-toggled', (data) => {
      // Можно показать иконку что собеседник выключил микрофон
    });

    socket.on('call-video-toggled', (data) => {
      // Можно показать иконку что собеседник выключил камеру
    });

    socket.on('force-disconnect', (reason) => {
      showNotification(reason);
      handleLogout();
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('current-users');
      socket.off('online-users-update');
      socket.off('user-status');
      socket.off('private-message');
      socket.off('group-message');
      socket.off('typing-status');
      socket.off('message-sent');
      socket.off('message-error');
      socket.off('incoming-call');
      socket.off('call-ringing');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-busy');
      socket.off('ice-candidate');
      socket.off('call-ended');
      socket.off('call-audio-toggled');
      socket.off('call-video-toggled');
      socket.off('force-disconnect');
    };
  }, [isAuthenticated, currentUser, isCallActive, recipient, currentGroup]);

  // ==================== ФУНКЦИИ АВТОРИЗАЦИИ ====================

  const fetchUserData = async (token) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setIsAuthenticated(true);
        socket.emit('user-connect', user.email);
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        socket.emit('user-connect', data.user.email);
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
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      showNotification('❌ Пароли не совпадают');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/auth/register`, {
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
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        socket.emit('user-connect', data.user.email);
        showNotification(`✅ Аккаунт создан, ${data.user.username}!`);
        
        setEmailToUsername(prev => ({ ...prev, [data.user.email]: data.user.username }));
        
        loadContacts(data.user.email);
        loadUserGroups(data.user.email);
        
        setTimeout(() => {
          sendVerificationCode(data.user.email);
        }, 500);
      } else {
        showNotification(`❌ ${data.error}`);
      }
    } catch (error) {
      showNotification('❌ Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    window.location.reload(); // Простой способ сбросить все состояния
  };

  // ==================== ПОДТВЕРЖДЕНИЕ ПОЧТЫ ====================

  const sendVerificationCode = async (email) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/auth/send-verification`, {
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
        showNotification('📧 Код отправлен на почту');
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/auth/verify-email`, {
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
        showNotification('✅ Email подтверждён!');
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

  // ==================== ЗАГРУЗКА ДАННЫХ ====================

  const loadContacts = async (email) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/contacts/${encodeURIComponent(email)}`);
      const contacts = await response.json();
      
      const contactsObj = {};
      contacts.forEach(contact => {
        contactsObj[contact] = onlineUsers[contact] || 'offline';
      });
      
      setOnlineUsers(prev => ({ ...prev, ...contactsObj }));
      
      contacts.forEach(async (contactEmail) => {
        try {
          const userResponse = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/auth/user-by-email/${encodeURIComponent(contactEmail)}`);
          const userData = await userResponse.json();
          if (userData.username) {
            setEmailToUsername(prev => ({ ...prev, [contactEmail]: userData.username }));
          }
        } catch (err) {}
      });
      
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error);
    }
  };

  const loadUserGroups = async (email) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/groups/${encodeURIComponent(email)}`);
      const data = await response.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Ошибка загрузки групп:', error);
      setGroups([]);
    }
  };

  const loadMessageHistory = async (contact) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/messages/${encodeURIComponent(currentUser.email)}/${encodeURIComponent(contact)}`);
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

  const loadGroupMessages = async (groupId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/group-messages/${groupId}`);
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

  // ==================== СООБЩЕНИЯ ====================

  const sendMessage = () => {
    if (!socket.connected) {
      showNotification('❌ Нет соединения с сервером');
      return;
    }
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

  const handleTyping = () => {
    if (recipient && currentUser) {
      socket.emit('typing', { to: recipient, from: currentUser.email, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { to: recipient, from: currentUser.email, isTyping: false });
      }, 1000);
    }
  };

  // ==================== ГРУППЫ ====================

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0 || !currentUser) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/groups`, {
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://danett-messenger-server.onrender.com'}/api/groups/${groupId}?email=${encodeURIComponent(currentUser.email)}`, {
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

  // ==================== ЗВОНКИ (ИСПРАВЛЕНО) ====================

  const startCall = async () => {
    if (!recipient || !currentUser) return;
    
    console.log('📞 Начинаем звонок к:', recipient);
    
    if (onlineUsers[recipient] !== 'online') {
      showNotification('❌ Пользователь не в сети');
      return;
    }
    
    const callId = Date.now().toString();
    setCurrentCallId(callId);
    
    try {
      console.log('📹 Запрашиваем доступ к камере...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      console.log('✅ Доступ получен!');
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const SimplePeer = (await import('simple-peer')).default;
      const peer = new SimplePeer({ 
        initiator: true, 
        stream, 
        trickle: true,
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
      
      peerRef.current = peer;
      
      peer.on('signal', (data) => {
        console.log('📡 Сигнал:', data.type);
        socket.emit('call-user', {
          to: recipient,
          from: currentUser.email,
          fromUsername: currentUser.username,
          offer: data,
          callId
        });
      });
      
      peer.on('stream', (remoteStream) => {
        console.log('📹 ПОЛУЧЕН УДАЛЕННЫЙ ПОТОК!');
        setRemoteStream(remoteStream);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });
      
      peer.on('error', (err) => {
        console.error('❌ Peer error:', err);
        showNotification('❌ Ошибка соединения');
        endCall();
      });
      
      peer.on('connect', () => {
        console.log('🔗 СОЕДИНЕНИЕ УСТАНОВЛЕНО!');
        showNotification('✅ Соединение установлено');
      });
      
      peer.on('close', () => {
        console.log('🔒 Соединение закрыто');
        endCall();
      });
      
      setIsCallActive(true);
      
      // Таймаут 30 секунд
      setTimeout(() => {
        if (peerRef.current && !peerRef.current.connected) {
          console.log('⏱️ Таймаут ожидания ответа');
          showNotification('❌ Собеседник не отвечает');
          endCall();
        }
      }, 30000);
      
    } catch (error) {
      console.error('❌ Ошибка доступа к камере:', error);
      showNotification('❌ Не удалось получить доступ к камере');
    }
  };

  const acceptCall = async () => {
    try {
      console.log('📞 Принимаем звонок от:', callerName);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      console.log('✅ Доступ к камере получен');
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const SimplePeer = (await import('simple-peer')).default;
      const peer = new SimplePeer({ 
        initiator: false, 
        stream, 
        trickle: true,
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
      
      peerRef.current = peer;
      
      peer.on('signal', (data) => {
        console.log('📡 Ответ:', data.type);
        socket.emit('accept-call', {
          to: callerEmail,
          from: currentUser.email,
          fromUsername: currentUser.username,
          answer: data,
          callId: currentCallId
        });
      });
      
      peer.on('stream', (remoteStream) => {
        console.log('📹 ПОЛУЧЕН УДАЛЕННЫЙ ПОТОК!');
        setRemoteStream(remoteStream);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });
      
      peer.on('error', (err) => {
        console.error('❌ Peer error:', err);
        showNotification('❌ Ошибка соединения');
        endCall();
      });
      
      peer.on('connect', () => {
        console.log('🔗 Соединение установлено!');
      });
      
      peer.on('close', () => {
        console.log('🔒 Соединение закрыто');
        endCall();
      });
      
      // Если есть накопленные кандидаты, отправляем их
      if (callerOffer) {
        peer.signal(callerOffer);
      }
      
      setIsCallActive(true);
      setIsCallIncoming(false);
      
    } catch (error) {
      console.error('❌ Ошибка доступа к камере:', error);
      showNotification('❌ Не удалось получить доступ к камере');
    }
  };

  const rejectCall = () => {
    console.log('❌ Отклоняем звонок');
    socket.emit('reject-call', {
      to: callerEmail,
      from: currentUser.email,
      fromUsername: currentUser.username,
      callId: currentCallId
    });
    setIsCallIncoming(false);
    setCallerName('');
    setCallerEmail('');
    setCallerOffer(null);
    setCurrentCallId(null);
  };

  const endCall = () => {
    console.log('📴 Завершаем звонок');
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (isCallActive && currentCallId) {
      socket.emit('end-call', {
        to: recipient || callerEmail,
        from: currentUser.email,
        fromUsername: currentUser.username,
        callId: currentCallId
      });
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setIsCallIncoming(false);
    setIsCallMinimized(false);
    setCallerName('');
    setCallerEmail('');
    setCallerOffer(null);
    setCurrentCallId(null);
    pendingCandidates.current = [];
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        
        socket.emit('call-toggle-audio', {
          to: recipient || callerEmail,
          from: currentUser.email,
          muted: !audioTrack.enabled,
          callId: currentCallId
        });
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        
        socket.emit('call-toggle-video', {
          to: recipient || callerEmail,
          from: currentUser.email,
          off: !videoTrack.enabled,
          callId: currentCallId
        });
      }
    }
  };

  // ==================== ВСПОМОГАТЕЛЬНЫЕ ====================

  const playSound = (type) => {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    
    if (type === 'message') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'ringtone') {
      // Простой рингтон - 3 коротких сигнала
      for (let i = 0; i < 3; i++) {
        const time = audioContext.currentTime + i * 0.5;
        oscillator.frequency.setValueAtTime(600, time);
        gainNode.gain.setValueAtTime(0.1, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      }
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 1.5);
    } else if (type === 'ringback') {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 1);
    }
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
  };

  const showNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
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

  const handleUpdateProfile = (updatedUser) => {
    setCurrentUser(updatedUser);
    setShowProfile(false);
    showNotification('✅ Профиль обновлён');
  };

  const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '😢', '😡', '😎', '🤔', '👋', '✅'];
  
  const filteredUsers = Object.entries(onlineUsers)
    .filter(([email]) => email !== currentUser?.email)
    .filter(([email]) => {
      const username = emailToUsername[email] || email;
      return username.toLowerCase().includes(searchTerm.toLowerCase());
    });

  // ==================== РЕНДЕР АВТОРИЗАЦИИ ====================

  if (!isAuthenticated) {
    return (
      <div className={`App auth-page ${darkTheme ? 'dark-theme' : ''}`}>
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-logo">✨ Danett Messenger</h1>
            
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Вход
              </button>
              <button 
                className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                Регистрация
              </button>
            </div>

            {showVerification ? (
              <div className="auth-form">
                <h3>Подтверждение email</h3>
                <p>Код отправлен на <strong>{verificationEmail}</strong></p>
                <input
                  type="text"
                  placeholder="Введите 6-значный код"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="auth-input"
                  maxLength="6"
                  autoFocus
                />
                <div className="auth-buttons">
                  <button onClick={() => setShowVerification(false)} className="auth-button secondary">
                    Назад
                  </button>
                  <button onClick={verifyEmail} className="auth-button primary" disabled={verificationCode.length !== 6}>
                    Подтвердить
                  </button>
                </div>
                <div className="auth-footer">
                  {countdown > 0 ? (
                    <span>Отправить повторно через {countdown}с</span>
                  ) : (
                    <button onClick={resendCode} className="auth-link">
                      Отправить код повторно
                    </button>
                  )}
                </div>
              </div>
            ) : authMode === 'login' ? (
              <form onSubmit={handleLogin} className="auth-form">
                <input
                  type="text"
                  placeholder="Email, телефон или имя"
                  value={loginForm.login}
                  onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                  className="auth-input"
                  required
                />
                <input
                  type="password"
                  placeholder="Пароль"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="auth-input"
                  required
                />
                <button type="submit" className="auth-button primary" disabled={loading}>
                  {loading ? 'Вход...' : 'Войти'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="auth-form">
                <input
                  type="text"
                  placeholder="Имя пользователя"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  className="auth-input"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="auth-input"
                  required
                />
                <input
                  type="tel"
                  placeholder="Телефон"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  className="auth-input"
                  required
                />
                <input
                  type="password"
                  placeholder="Пароль"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="auth-input"
                  required
                />
                <input
                  type="password"
                  placeholder="Подтвердите пароль"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  className="auth-input"
                  required
                />
                <button type="submit" className="auth-button primary" disabled={loading}>
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
              </form>
            )}
            
            <button 
              onClick={() => setDarkTheme(!darkTheme)} 
              className="theme-toggle"
              aria-label="Переключить тему"
            >
              {darkTheme ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== РЕНДЕР ОСНОВНОГО ИНТЕРФЕЙСА ====================

  return (
    <div className={`App ${darkTheme ? 'dark-theme' : ''}`}>
      {/* Уведомления */}
      <div className="notifications-container">
        {notifications.map(notif => (
          <div key={notif.id} className="notification">
            {notif.message}
          </div>
        ))}
      </div>

      {/* Шапка */}
      <header className="app-header">
        <div className="header-left">
          <button className="menu-button" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <h1 className="app-logo">Danett</h1>
        </div>
        
        <div className="header-center">
          <span className="online-count">
            {Object.values(onlineUsers).filter(s => s === 'online').length} онлайн
          </span>
        </div>
        
        <div className="header-right">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="icon-button">
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button onClick={() => setDarkTheme(!darkTheme)} className="icon-button">
            {darkTheme ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowProfile(true)} className="profile-button">
            <div className="avatar-small">
              {currentUser?.username?.charAt(0).toUpperCase()}
            </div>
          </button>
        </div>
      </header>

      {/* Модалка профиля */}
      {showProfile && (
        <Profile 
          user={currentUser} 
          onClose={() => setShowProfile(false)}
          onUpdate={handleUpdateProfile}
          onLogout={handleLogout}
        />
      )}

      {/* Модалка подтверждения */}
      {showVerification && (
        <div className="modal-overlay" onClick={() => setShowVerification(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Подтверждение email</h3>
            <p>Код отправлен на <strong>{verificationEmail}</strong></p>
            <input
              type="text"
              placeholder="Введите 6-значный код"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="modal-input"
              maxLength="6"
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={() => setShowVerification(false)} className="modal-button secondary">
                Закрыть
              </button>
              <button onClick={verifyEmail} className="modal-button primary" disabled={verificationCode.length !== 6}>
                Подтвердить
              </button>
            </div>
            <div className="modal-footer">
              {countdown > 0 ? (
                <span>Отправить повторно через {countdown}с</span>
              ) : (
                <button onClick={resendCode} className="modal-link">
                  Отправить код повторно
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка входящего звонка */}
      {isCallIncoming && (
        <div className="modal-overlay">
          <div className="modal-content call-modal">
            <div className="call-avatar">
              {callerName?.charAt(0).toUpperCase()}
            </div>
            <h3>Входящий звонок</h3>
            <p className="caller-name">{callerName}</p>
            <div className="call-buttons">
              <button onClick={acceptCall} className="call-button accept">
                ✅ Ответить
              </button>
              <button onClick={rejectCall} className="call-button reject">
                ❌ Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Интерфейс звонка */}
      {isCallActive && (
        <div className={`call-interface ${isCallMinimized ? 'minimized' : ''}`}>
          {isCallMinimized ? (
            <div className="minimized-call" onClick={() => setIsCallMinimized(false)}>
              <video ref={remoteVideoRef} autoPlay playsInline className="minimized-video" />
              <div className="minimized-info">
                <span>{recipientUsername || callerName}</span>
                <span className="call-duration">🎥</span>
              </div>
            </div>
          ) : (
            <div className="fullscreen-call">
              <div className="call-header">
                <span>Звонок с {recipientUsername || callerName}</span>
                <button onClick={() => setIsCallMinimized(true)} className="minimize-button">
                  ⚪
                </button>
              </div>
              
              <div className="videos-container">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="remote-video" 
                />
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="local-video" 
                />
              </div>
              
              <div className="call-controls">
                <button 
                  onClick={toggleAudio} 
                  className={`control-button ${isAudioMuted ? 'off' : ''}`}
                >
                  {isAudioMuted ? '🔇' : '🎤'}
                </button>
                <button 
                  onClick={toggleVideo} 
                  className={`control-button ${isVideoOff ? 'off' : ''}`}
                >
                  {isVideoOff ? '📹❌' : '📹'}
                </button>
                <button onClick={endCall} className="control-button end-call">
                  📴
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Основной контейнер */}
      <div className="main-container">
        {/* Сайдбар */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'chats' ? 'active' : ''}`}
                onClick={() => { setActiveTab('chats'); setSidebarOpen(false); }}
              >
                💬 Чаты
              </button>
              <button 
                className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
                onClick={() => { setActiveTab('groups'); setSidebarOpen(false); }}
              >
                👥 Группы
              </button>
            </div>
            
            {activeTab === 'chats' ? (
              <>
                <h3>Контакты</h3>
                <input
                  type="text"
                  placeholder="Поиск..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </>
            ) : (
              <>
                <h3>Группы</h3>
                <button onClick={() => setShowCreateGroup(true)} className="create-group-button">
                  + Создать группу
                </button>
              </>
            )}
          </div>

          <div className="users-list">
            {activeTab === 'chats' ? (
              filteredUsers.length > 0 ? (
                filteredUsers.map(([email, status]) => {
                  const displayName = emailToUsername[email] || email.split('@')[0];
                  return (
                    <div
                      key={email}
                      className={`user-item ${recipient === email ? 'selected' : ''}`}
                      onClick={() => { 
                        setRecipient(email); 
                        setRecipientUsername(displayName); 
                        setCurrentGroup(null);
                        setSidebarOpen(false);
                      }}
                    >
                      <div className="user-avatar">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <div className="user-name">
                          {displayName}
                          <span className={`status-dot ${status}`}></span>
                        </div>
                        <div className="last-message">
                          {status === 'online' ? 'В сети' : 'Был недавно'}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-list">
                  {searchTerm ? 'Ничего не найдено' : 'Нет контактов'}
                </div>
              )
            ) : (
              groups.length > 0 ? (
                groups.map(group => (
                  <div
                    key={group._id}
                    className={`user-item ${currentGroup?._id === group._id ? 'selected' : ''}`}
                    onClick={() => { 
                      setCurrentGroup(group); 
                      setRecipient('');
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="user-avatar group-avatar">👥</div>
                    <div className="user-info">
                      <div className="user-name">{group.name}</div>
                      <div className="last-message">
                        {group.members?.length || 0} участников
                      </div>
                    </div>
                    {group.admin === currentUser?.email && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteGroup(group._id, group.name); }}
                        className="delete-button"
                        title="Удалить группу"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-list">
                  Нет групп. Создайте первую!
                </div>
              )
            )}
          </div>
        </aside>

        {/* Модалка создания группы */}
        {showCreateGroup && (
          <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Создание группы</h3>
              <input
                type="text"
                placeholder="Название группы"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="modal-input"
                autoFocus
              />
              
              <h4>Выберите участников:</h4>
              <div className="members-list">
                {Object.keys(onlineUsers).map(email => email !== currentUser?.email && (
                  <label key={email} className="member-item">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(email)}
                      onChange={() => toggleMember(email)}
                    />
                    <span className="member-name">{emailToUsername[email] || email}</span>
                  </label>
                ))}
              </div>
              
              <div className="modal-buttons">
                <button onClick={() => setShowCreateGroup(false)} className="modal-button secondary">
                  Отмена
                </button>
                <button 
                  onClick={createGroup} 
                  className="modal-button primary"
                  disabled={!newGroupName.trim() || selectedMembers.length === 0}
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Область чата */}
        <main className="chat-area">
          {activeTab === 'chats' && recipient ? (
            <>
              <div className="chat-header">
                <div className="chat-user-info">
                  <div className="chat-user-avatar">
                    {recipientUsername.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="chat-user-name">{recipientUsername}</div>
                    <div className="chat-user-status">
                      {onlineUsers[recipient] === 'online' ? '🟢 В сети' : '🔴 Офлайн'}
                    </div>
                  </div>
                </div>
                
                {onlineUsers[recipient] === 'online' && !isCallActive && (
                  <button onClick={startCall} className="call-button">
                    📞 Позвонить
                  </button>
                )}
              </div>

              <div className="messages-container">
                {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.from === 'me' ? 'my-message' : ''}`}>
                    <div className="message-content">
                      {msg.from !== 'me' && (
                        <div className="message-sender">
                          {emailToUsername[msg.from] || msg.from}
                        </div>
                      )}
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">{msg.timestamp}</div>
                    </div>
                  </div>
                ))}
                
                {typingStatus && (
                  <div className="message typing-indicator">
                    <div className="message-content">
                      <em>{typingStatus}</em>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input-area">
                <div className="message-form">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                    className="emoji-button"
                  >
                    😊
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      {emojis.map(emoji => (
                        <button key={emoji} onClick={() => addEmoji(emoji)} className="emoji-item">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <input
                    type="text"
                    placeholder={onlineUsers[recipient] === 'online' 
                      ? `Напишите сообщение...` 
                      : `Сообщение придет, когда пользователь появится.`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyUp={handleTyping}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={!isConnected}
                    className="message-input"
                  />
                  
                  <button 
                    onClick={sendMessage} 
                    disabled={!isConnected || !recipient || !message.trim()}
                    className="send-button"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </>
          ) : activeTab === 'groups' && currentGroup ? (
            <>
              <div className="chat-header">
                <div className="chat-user-info">
                  <div className="chat-user-avatar group-avatar">👥</div>
                  <div>
                    <div className="chat-user-name">{currentGroup.name}</div>
                    <div className="chat-user-status">
                      {currentGroup.members?.length || 0} участников
                    </div>
                  </div>
                </div>
                
                {currentGroup.admin === currentUser?.email && (
                  <button 
                    onClick={() => deleteGroup(currentGroup._id, currentGroup.name)} 
                    className="delete-group-button"
                  >
                    🗑️ Удалить группу
                  </button>
                )}
              </div>

              <div className="messages-container">
                {groupMessages.map((msg, index) => (
                  <div key={index} className={`message ${msg.from === 'me' ? 'my-message' : ''}`}>
                    <div className="message-content">
                      {msg.from !== 'me' && (
                        <div className="message-sender">
                          {emailToUsername[msg.from] || msg.from}
                        </div>
                      )}
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">{msg.timestamp}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input-area">
                <div className="message-form">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                    className="emoji-button"
                  >
                    😊
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      {emojis.map(emoji => (
                        <button key={emoji} onClick={() => addEmoji(emoji)} className="emoji-item">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <input
                    type="text"
                    placeholder={`Напишите сообщение...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendGroupMessage()}
                    disabled={!isConnected}
                    className="message-input"
                  />
                  
                  <button 
                    onClick={sendGroupMessage} 
                    disabled={!isConnected || !currentGroup || !message.trim()}
                    className="send-button"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="placeholder">
              {activeTab === 'chats' 
                ? 'Выберите собеседника, чтобы начать общение 💬' 
                : 'Выберите группу или создайте новую 👥'}
            </div>
          )}
        </main>
      </div>

      {/* Затемнение для мобильного меню */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

export default App;
