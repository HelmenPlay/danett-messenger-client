import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';
import Profile from './components/Profile';

const socket = io('https://danett-messenger-server.onrender.com');

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
  const pendingCandidates = useRef([]);

  // ==================== ЭФФЕКТЫ ====================

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedTheme = localStorage.getItem('darkTheme') === 'true';
    setDarkTheme(savedTheme);
    if (token) {
      fetchUserData(token);
    }
  }, []);

  useEffect(() => {
    if (darkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('darkTheme', darkTheme);
  }, [darkTheme]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, groupMessages]);

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

  // ==================== СОКЕТЫ ====================

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

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
        showNotification('👥 Новое сообщение в группе');
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

    // ==================== ЗВОНКИ ====================

    socket.on('incoming-call', (data) => {
      console.log('📞 Входящий звонок от', data.fromUsername);
      
      if (isCallActive) {
        socket.emit('call-busy', {
          to: data.from,
          from: currentUser.email,
          fromUsername: currentUser.username,
          callId: data.callId
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
        showNotification('📴 Звонок завершен');
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
      const response = await fetch('https://danett-messenger-server.onrender.com/api/auth/me', {
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
      const response = await fetch('https://danett-messenger-server.onrender.com/api/auth/login', {
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
    window.location.reload();
  };

  const handleUpdateProfile = (updatedUser) => {
    setCurrentUser(updatedUser);
    setShowProfile(false);
    showNotification('✅ Профиль обновлён');
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
        showNotification('📧 Код отправлен на почту');
        return true;
      } else {
        showNotification(`❌ ${data.error}`);
        return false;
      }
    } catch (error) {
      showNotification('❌ Ошибка отправки кода');
      return false;
    }
  };

  const verifyEmail = async (email, code) => {
    try {
      const response = await fetch('https://danett-messenger-server.onrender.com/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email || verificationEmail, 
          code: code || verificationCode 
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
        return true;
      } else {
        showNotification(`❌ ${data.error}`);
        return false;
      }
    } catch (error) {
      showNotification('❌ Ошибка подтверждения');
      return false;
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
        } catch (err) {}
      });
      
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error);
    }
  };

  const loadUserGroups = async (email) => {
    try {
      const response = await fetch(`https://danett-messenger-server.onrender.com/api/groups/${encodeURIComponent(email)}`);
      const data = await response.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Ошибка загрузки групп:', error);
      setGroups([]);
    }
  };

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

  // ==================== ЗВОНКИ ====================

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
            { urls: 'stun:stun4.l.google.com:19302' },
            {
              urls: 'turn:relay1.expressturn.com:3478',
              username: 'efEX1N6I7YCD6KOI0M',
              credential: 'zl9I2aNCWq2KOsG2'
            }
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
            { urls: 'stun:stun4.l.google.com:19302' },
            {
              urls: 'turn:relay1.expressturn.com:3478',
              username: 'efEX1N6I7YCD6KOI0M',
              credential: 'zl9I2aNCWq2KOsG2'
            }
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
    setNotifications(prev => [{ id, message }, ...prev].slice(0, 5));
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

  const emojis = ['😊', '😂', '❤️', '👍', '🎉', '
