import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const socket = io(API_URL, {
  auth: { token: localStorage.getItem('token') }
});

function App() {
  // ==================== СОСТОЯНИЯ ====================
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('chats'); // chats, contacts, calls, settings
  const [darkTheme, setDarkTheme] = useState(localStorage.getItem('theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [calls, setCalls] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callId, setCallId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [groupCallMembers, setGroupCallMembers] = useState([]);
  
  // Refs
  const messagesEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const peerConnections = useRef({});
  const pendingCandidates = useRef({});

  // ==================== ТЕМА ====================
  useEffect(() => {
    if (darkTheme) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkTheme]);

  // ==================== АВТОРИЗАЦИЯ ====================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        socket.auth = { token };
        socket.connect();
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: formData.get('login'),
          password: formData.get('password')
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        socket.auth = { token: data.token };
        socket.connect();
        
        if (!data.user.isVerified) {
          setVerificationEmail(data.user.email);
          setShowVerification(true);
        }
      } else {
        showNotification(data.error, 'error');
      }
    } catch (error) {
      showNotification('Ошибка входа', 'error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    if (formData.get('password') !== formData.get('confirmPassword')) {
      showNotification('Пароли не совпадают', 'error');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          username: formData.get('username'),
          email: formData.get('email'),
          password: formData.get('password')
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        socket.auth = { token: data.token };
        socket.connect();
        setVerificationEmail(data.user.email);
        setShowVerification(true);
      } else {
        showNotification(data.error, 'error');
      }
    } catch (error) {
      showNotification('Ошибка регистрации', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    socket.disconnect();
    window.location.reload();
  };

  // ==================== ПОДТВЕРЖДЕНИЕ ПОЧТЫ ====================
  const sendVerificationCode = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail })
      });
      
      if (res.ok) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        showNotification('Код отправлен на почту');
      }
    } catch (error) {
      showNotification('Ошибка отправки', 'error');
    }
  };

  const verifyCode = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verificationEmail,
          code: verificationCode
        })
      });
      
      if (res.ok) {
        setShowVerification(false);
        setUser({ ...user, isVerified: true });
        showNotification('Email подтверждён!');
      } else {
        showNotification('Неверный код', 'error');
      }
    } catch (error) {
      showNotification('Ошибка подтверждения', 'error');
    }
  };

  // ==================== ПОИСК ====================
  const searchUsers = async (query) => {
    if (!query.startsWith('@') && query.length > 0) {
      query = '@' + query;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/users/search/${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const addContact = async (contactId) => {
    try {
      await fetch(`${API_URL}/api/users/contact/${contactId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification('Контакт добавлен');
      loadContacts();
    } catch (error) {
      showNotification('Ошибка', 'error');
    }
  };

  // ==================== ЗВОНКИ ====================
  const startCall = async (targetUser, isGroup = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const callId = Date.now().toString();
      setCallId(callId);
      setIsCallActive(true);
      
      if (isGroup) {
        socket.emit('group-call', {
          groupId: currentChat._id,
          members: currentChat.members,
          fromUsername: user.username
        });
        setGroupCallMembers(currentChat.members);
      } else {
        const peer = createPeerConnection(targetUser._id, false);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        
        socket.emit('call-user', {
          to: targetUser._id,
          fromUsername: user.username,
          offer,
          callId
        });
      }
    } catch (error) {
      console.error('Call error:', error);
      showNotification('Не удалось получить доступ к камере', 'error');
    }
  };

  const createPeerConnection = (targetId, isInitiator) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:relay1.expressturn.com:3478',
          username: 'efEX1N6I7YCD6KOI0M',
          credential: 'zl9I2aNCWq2KOsG2'
        }
      ]
    });
    
    localStream.getTracks().forEach(track => {
      peer.addTrack(track, localStream);
    });
    
    peer.ontrack = (event) => {
      if (event.streams[0]) {
        setRemoteStreams(prev => ({
          ...prev,
          [targetId]: event.streams[0]
        }));
      }
    };
    
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: targetId,
          candidate: event.candidate,
          callId
        });
      }
    };
    
    peer.oniceconnectionstatechange = () => {
      console.log('ICE state:', peer.iceConnectionState);
    };
    
    peerConnections.current[targetId] = peer;
    return peer;
  };

  // ==================== СОКЕТЫ ====================
  useEffect(() => {
    if (!user) return;
    
    socket.on('online-users', (users) => {
      setOnlineUsers(users);
    });
    
    socket.on('private-message', (message) => {
      if (currentChat?._id === message.from || currentChat?._id === message.to) {
        setMessages(prev => [...prev, message]);
      }
      showNotification(`Новое сообщение от ${message.fromUsername}`);
    });
    
    socket.on('group-message', (message) => {
      if (currentChat?._id === message.group) {
        setMessages(prev => [...prev, message]);
      }
    });
    
    socket.on('incoming-call', (data) => {
      setCaller(data);
      setIsCallIncoming(true);
    });
    
    socket.on('call-accepted', async (data) => {
      const peer = peerConnections.current[data.from];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
        pendingCandidates.current[data.from]?.forEach(candidate => {
          peer.addIceCandidate(new RTCIceCandidate(candidate));
        });
      }
    });
    
    socket.on('ice-candidate', (data) => {
      const peer = peerConnections.current[data.from];
      if (peer && peer.remoteDescription) {
        peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        if (!pendingCandidates.current[data.from]) {
          pendingCandidates.current[data.from] = [];
        }
        pendingCandidates.current[data.from].push(data.candidate);
      }
    });
    
    socket.on('call-ended', (data) => {
      endCall();
    });
    
    socket.on('group-call-invite', (data) => {
      if (window.confirm(`${data.fromUsername} приглашает вас в групповой звонок. Присоединиться?`)) {
        joinGroupCall(data);
      }
    });
    
    return () => {
      socket.off('online-users');
      socket.off('private-message');
      socket.off('group-message');
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('ice-candidate');
      socket.off('call-ended');
      socket.off('group-call-invite');
    };
  }, [user, currentChat]);

  // ==================== ЗАГРУЗКИ ====================
  useEffect(() => {
    if (user) {
      loadContacts();
      loadCalls();
      socket.emit('get-online');
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadContacts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/contacts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Load contacts error:', error);
    }
  };

  const loadCalls = async () => {
    try {
      const res = await fetch(`${API_URL}/api/calls`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setCalls(data);
    } catch (error) {
      console.error('Load calls error:', error);
    }
  };

  // ==================== ВСПОМОГАТЕЛЬНЫЕ ====================
  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const endCall = () => {
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    pendingCandidates.current = {};
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setRemoteStreams({});
    setIsCallActive(false);
    setIsCallIncoming(false);
    setIsCallMinimized(false);
    setCaller(null);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ==================== РЕНДЕР АВТОРИЗАЦИИ ====================
  if (!user) {
    return (
      <div className={`auth-page ${darkTheme ? 'dark' : ''}`}>
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-logo">Danett</h1>
            <div className="auth-tabs">
              <button className="auth-tab active">Вход</button>
              <button className="auth-tab">Регистрация</button>
            </div>
            
            <form onSubmit={handleLogin} className="auth-form">
              <input
                type="text"
                name="login"
                placeholder="Email или @username"
                className="auth-input"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Пароль"
                className="auth-input"
                required
              />
              <button type="submit" className="auth-button">Войти</button>
            </form>
            
            <form onSubmit={handleRegister} className="auth-form" style={{ display: 'none' }}>
              <input
                type="text"
                name="name"
                placeholder="Имя"
                className="auth-input"
                required
              />
              <input
                type="text"
                name="username"
                placeholder="@username"
                className="auth-input"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="auth-input"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Пароль"
                className="auth-input"
                required
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Подтвердите пароль"
                className="auth-input"
                required
              />
              <button type="submit" className="auth-button">Зарегистрироваться</button>
            </form>
            
            <button onClick={() => setDarkTheme(!darkTheme)} className="theme-toggle">
              {darkTheme ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        
        {showVerification && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Подтверждение email</h2>
              <p>Код отправлен на {verificationEmail}</p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-значный код"
                className="verification-input"
                maxLength="6"
              />
              <div className="modal-buttons">
                <button onClick={verifyCode} className="modal-button primary">
                  Подтвердить
                </button>
                <button onClick={sendVerificationCode} className="modal-button" disabled={countdown > 0}>
                  {countdown > 0 ? `Отправить через ${countdown}с` : 'Отправить повторно'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== РЕНДЕР ОСНОВНОГО ИНТЕРФЕЙСА ====================
  return (
    <div className={`app ${darkTheme ? 'dark' : ''}`}>
      {/* Уведомления */}
      <div className="notifications">
        {notifications.map(n => (
          <div key={n.id} className={`notification ${n.type}`}>
            {n.message}
          </div>
        ))}
      </div>

      {/* Шапка */}
      <header className="header">
        <button className="menu-button" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <h1 className="logo">Danett</h1>
        <div className="header-actions">
          <button onClick={() => setDarkTheme(!darkTheme)} className="icon-button">
            {darkTheme ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowProfile(true)} className="profile-button">
            <div className="avatar-small">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </button>
        </div>
      </header>

      {/* Основной контейнер */}
      <div className="main-container">
        {/* Сайдбар */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-tabs">
              <button
                className={`sidebar-tab ${activeTab === 'chats' ? 'active' : ''}`}
                onClick={() => setActiveTab('chats')}
              >
                💬
              </button>
              <button
                className={`sidebar-tab ${activeTab === 'contacts' ? 'active' : ''}`}
                onClick={() => setActiveTab('contacts')}
              >
                👥
              </button>
              <button
                className={`sidebar-tab ${activeTab === 'calls' ? 'active' : ''}`}
                onClick={() => setActiveTab('calls')}
              >
                📞
              </button>
              <button
                className={`sidebar-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                ⚙️
              </button>
            </div>
            
            <div className="search-container">
              <input
                type="text"
                placeholder="Поиск по @username"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) searchUsers(e.target.value);
                }}
                className="search-input"
              />
            </div>
          </div>

          <div className="sidebar-content">
            {activeTab === 'chats' && (
              <div className="chats-list">
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="create-group-button"
                >
                  + Создать группу
                </button>
                {/* Список чатов */}
                {users.map(u => (
                  <div
                    key={u._id}
                    className={`chat-item ${currentChat?._id === u._id ? 'active' : ''}`}
                    onClick={() => setCurrentChat(u)}
                  >
                    <div className="chat-avatar">
                      {u.name.charAt(0).toUpperCase()}
                      {onlineUsers.includes(u._id) && <span className="online-dot" />}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{u.name}</div>
                      <div className="chat-username">{u.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="contacts-list">
                {searchResults.length > 0 ? (
                  searchResults.map(u => (
                    <div key={u._id} className="contact-item">
                      <div className="contact-avatar">{u.name.charAt(0).toUpperCase()}</div>
                      <div className="contact-info">
                        <div className="contact-name">{u.name}</div>
                        <div className="contact-username">{u.username}</div>
                      </div>
                      <button
                        onClick={() => addContact(u._id)}
                        className="add-contact-button"
                      >
                        +
                      </button>
                    </div>
                  ))
                ) : (
                  users.map(u => (
                    <div key={u._id} className="contact-item">
                      <div className="contact-avatar">{u.name.charAt(0).toUpperCase()}</div>
                      <div className="contact-info">
                        <div className="contact-name">{u.name}</div>
                        <div className="contact-username">{u.username}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'calls' && (
              <div className="calls-list">
                {calls.map(call => (
                  <div key={call._id} className="call-item">
                    <div className="call-avatar">
                      {call.from._id === user._id ? '📞' : call.from.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="call-info">
                      <div className="call-name">
                        {call.from._id === user._id ? call.to.name : call.from.name}
                      </div>
                      <div className="call-details">
                        <span className="call-type">
                          {call.type === 'video' ? '📹' : '🎤'}
                        </span>
                        <span className="call-time">{formatTime(call.createdAt)}</span>
                        <span className={`call-status ${call.status}`}>
                          {call.status === 'missed' ? '❌' : call.status === 'answered' ? '✅' : '📞'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Область чата */}
        <main className="chat-area">
          {currentChat ? (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="chat-header-avatar">
                    {currentChat.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="chat-header-name">{currentChat.name}</div>
                    <div className="chat-header-status">
                      {onlineUsers.includes(currentChat._id) ? 'в сети' : 'был недавно'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => startCall(currentChat)}
                  className="call-button"
                  disabled={isCallActive}
                >
                  📹
                </button>
              </div>

              <div className="messages">
                {messages.map(msg => (
                  <div
                    key={msg._id}
                    className={`message ${msg.from === user._id ? 'outgoing' : 'incoming'}`}
                  >
                    <div className="message-content">
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">{formatTime(msg.createdAt)}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input-container">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Напишите сообщение..."
                  className="message-input"
                />
                <button onClick={sendMessage} className="send-button">
                  ➤
                </button>
              </div>
            </>
          ) : (
            <div className="empty-chat">
              <h2>Выберите чат</h2>
              <p>Начните общение с друзьями</p>
            </div>
          )}
        </main>
      </div>

      {/* Затемнение для мобильного меню */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Интерфейс звонка */}
      {isCallActive && (
        <div className={`call-interface ${isCallMinimized ? 'minimized' : ''}`}>
          {isCallMinimized ? (
            <div className="minimized-call" onClick={() => setIsCallMinimized(false)}>
              <video autoPlay playsInline ref={localVideoRef} className="minimized-video" />
            </div>
          ) : (
            <div className="fullscreen-call">
              <div className="call-header">
                <span>Звонок с {caller?.fromUsername || currentChat?.name}</span>
                <button onClick={() => setIsCallMinimized(true)} className="minimize-button">
                  ⚪
                </button>
              </div>
              
              <div className="videos-grid">
                <video autoPlay playsInline muted ref={localVideoRef} className="local-video" />
                {Object.entries(remoteStreams).map(([id, stream]) => (
                  <video
                    key={id}
                    autoPlay
                    playsInline
                    ref={el => {
                      if (el) el.srcObject = stream;
                    }}
                    className="remote-video"
                  />
                ))}
              </div>
              
              <div className="call-controls">
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className={`control-button ${isAudioMuted ? 'off' : ''}`}
                >
                  {isAudioMuted ? '🔇' : '🎤'}
                </button>
                <button
                  onClick={() => setIsVideoOff(!isVideoOff)}
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

      {/* Входящий звонок */}
      {isCallIncoming && (
        <div className="modal-overlay">
          <div className="incoming-call">
            <div className="caller-avatar">
              {caller?.fromUsername?.charAt(0).toUpperCase()}
            </div>
            <h3>{caller?.fromUsername}</h3>
            <p>Входящий видеозвонок</p>
            <div className="incoming-buttons">
              <button onClick={acceptCall} className="accept-button">
                ✅
              </button>
              <button onClick={rejectCall} className="reject-button">
                ❌
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== ФУНКЦИИ ДЛЯ ЗВОНКОВ И СООБЩЕНИЙ ====================

const acceptCall = async () => {
  try {
    console.log('📞 Принимаем звонок от:', caller?.fromUsername);
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    
    const peer = createPeerConnection(caller.from, false);
    await peer.setRemoteDescription(new RTCSessionDescription(caller.offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    
    socket.emit('accept-call', {
      to: caller.from,
      answer,
      callId
    });
    
    setIsCallIncoming(false);
  } catch (error) {
    console.error('Accept call error:', error);
    showNotification('Не удалось принять звонок', 'error');
  }
};

const rejectCall = () => {
  socket.emit('reject-call', {
    to: caller.from,
    callId
  });
  setIsCallIncoming(false);
  setCaller(null);
};

const joinGroupCall = (data) => {
  console.log('👥 Присоединяемся к групповому звонку:', data);
  showNotification('Групповые звонки в разработке', 'info');
};

const sendMessage = () => {
  if (!inputMessage.trim() || !currentChat) return;
  
  const messageData = {
    text: inputMessage,
    to: currentChat._id,
    from: user._id,
    fromUsername: user.username
  };
  
  socket.emit('private-message', messageData);
  
  setMessages(prev => [...prev, {
    ...messageData,
    createdAt: new Date().toISOString()
  }]);
  
  setInputMessage('');
};

export default App;
