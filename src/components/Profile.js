import React, { useState, useRef } from 'react';

const Profile = ({ user, onClose, onUpdate, onLogout, onVerifyEmail }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({
    username: user?.username || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const fileInputRef = useRef(null);
  const countdownInterval = useRef(null);

  // Статистика
  const stats = {
    messagesSent: 127,
    groupsCreated: 3,
    callsMade: 15,
    accountAge: '2 месяца',
    lastActive: new Date().toLocaleDateString()
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    // Имитация обновления
    setTimeout(() => {
      onUpdate({
        ...user,
        ...editedUser,
        avatar: avatarPreview || user?.avatar
      });
      setIsEditing(false);
      setIsLoading(false);
    }, 1000);
  };

  const handleCancel = () => {
    setEditedUser({
      username: user?.username || '',
      phone: user?.phone || '',
      email: user?.email || ''
    });
    setAvatarPreview(null);
    setAvatarFile(null);
    setIsEditing(false);
  };

  const handleVerifyClick = async () => {
    if (onVerifyEmail) {
      setIsVerifying(true);
      try {
        const success = await onVerifyEmail(user?.email);
        if (success) {
          setShowVerificationInput(true);
          startCountdown(60);
        }
      } catch (error) {
        alert('Ошибка отправки кода. Попробуйте позже.');
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleCodeSubmit = async () => {
    if (verificationCode.length === 6 && onVerifyEmail) {
      try {
        const success = await onVerifyEmail(user?.email, verificationCode);
        if (success) {
          setShowVerificationInput(false);
          setVerificationCode('');
          // Обновим пользователя
          onUpdate({ ...user, isVerified: true });
        }
      } catch (error) {
        alert('Неверный код. Попробуйте снова.');
      }
    }
  };

  const startCountdown = (seconds) => {
    setCountdown(seconds);
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const getInitials = (name) => {
    return name?.charAt(0).toUpperCase() || '?';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>✕</button>
        
        <div className="profile-header">
          <div className="profile-avatar-container" onClick={handleAvatarClick}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar">
                {getInitials(user?.username)}
              </div>
            )}
            {isEditing && (
              <div className="avatar-overlay">
                <span>📷</span>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          
          <h2 className="profile-name">{user?.username}</h2>
          <div className="profile-badge">
            {user?.isVerified ? '✅ Подтверждён' : '⏳ Не подтверждён'}
          </div>
        </div>

        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Профиль
          </button>
          <button 
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Настройки
          </button>
          <button 
            className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Статистика
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'profile' && (
            <div className="profile-info">
              {isEditing ? (
                <>
                  <div className="info-row">
                    <label>Имя пользователя</label>
                    <input
                      type="text"
                      value={editedUser.username}
                      onChange={(e) => setEditedUser({...editedUser, username: e.target.value})}
                      className="profile-input"
                      placeholder="Введите имя"
                    />
                  </div>
                  <div className="info-row">
                    <label>Телефон</label>
                    <input
                      type="tel"
                      value={editedUser.phone}
                      onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})}
                      className="profile-input"
                      placeholder="Введите телефон"
                    />
                  </div>
                  <div className="info-row">
                    <label>Email</label>
                    <input
                      type="email"
                      value={editedUser.email}
                      onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                      className="profile-input"
                      placeholder="Введите email"
                      disabled
                    />
                    <small>Email нельзя изменить</small>
                  </div>
                </>
              ) : (
                <>
                  <div className="info-row">
                    <span className="info-label">📧 Email</span>
                    <span className="info-value">{user?.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📱 Телефон</span>
                    <span className="info-value">{user?.phone || 'Не указан'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">🆔 ID</span>
                    <span className="info-value">{user?.id || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">📅 Регистрация</span>
                    <span className="info-value">{new Date().toLocaleDateString()}</span>
                  </div>
                </>
              )}

              {/* БЛОК ПОДТВЕРЖДЕНИЯ ПОЧТЫ */}
              {!user?.isVerified && !isEditing && (
                <div className="verification-section">
                  {!showVerificationInput ? (
                    <>
                      <button 
                        className="verify-email-button"
                        onClick={handleVerifyClick}
                        disabled={isVerifying}
                      >
                        {isVerifying ? 'Отправка...' : '✉️ Подтвердить email'}
                      </button>
                      <p className="verify-hint">
                        На вашу почту будет отправлен 6-значный код
                      </p>
                    </>
                  ) : (
                    <div className="verify-code-section">
                      <p className="verify-instruction">
                        Введите код, отправленный на <strong>{user?.email}</strong>
                      </p>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-значный код"
                        className="verify-code-input"
                        maxLength="6"
                        autoFocus
                      />
                      <div className="verify-code-buttons">
                        <button 
                          className="verify-submit-button"
                          onClick={handleCodeSubmit}
                          disabled={verificationCode.length !== 6}
                        >
                          Подтвердить
                        </button>
                        <button 
                          className="verify-cancel-button"
                          onClick={() => {
                            setShowVerificationInput(false);
                            setVerificationCode('');
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                      {countdown > 0 ? (
                        <p className="verify-countdown">
                          Отправить повторно через {countdown}с
                        </p>
                      ) : (
                        <button 
                          className="verify-resend-link"
                          onClick={handleVerifyClick}
                          disabled={isVerifying}
                        >
                          Отправить код повторно
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="profile-settings">
              <div className="settings-section">
                <h3>Уведомления</h3>
                <label className="setting-item">
                  <input type="checkbox" defaultChecked /> 
                  <span>Звук сообщений</span>
                </label>
                <label className="setting-item">
                  <input type="checkbox" defaultChecked /> 
                  <span>Звук звонков</span>
                </label>
                <label className="setting-item">
                  <input type="checkbox" defaultChecked /> 
                  <span>Уведомления на рабочем столе</span>
                </label>
              </div>

              <div className="settings-section">
                <h3>Конфиденциальность</h3>
                <label className="setting-item">
                  <input type="checkbox" defaultChecked /> 
                  <span>Показывать статус "онлайн"</span>
                </label>
                <label className="setting-item">
                  <input type="checkbox" defaultChecked /> 
                  <span>Читать подтверждения</span>
                </label>
              </div>

              <div className="settings-section">
                <h3>Данные</h3>
                <button className="danger-button">🗑️ Очистить историю</button>
                <button className="danger-button">📤 Экспортировать данные</button>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="profile-stats">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{stats.messagesSent}</div>
                  <div className="stat-label">Сообщений</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.groupsCreated}</div>
                  <div className="stat-label">Групп</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.callsMade}</div>
                  <div className="stat-label">Звонков</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.accountAge}</div>
                  <div className="stat-label">В системе</div>
                </div>
              </div>
              
              <div className="last-active">
                Последняя активность: {stats.lastActive}
              </div>
            </div>
          )}
        </div>

        <div className="profile-footer">
          {isEditing ? (
            <>
              <button 
                className="profile-button cancel" 
                onClick={handleCancel}
                disabled={isLoading}
              >
                Отмена
              </button>
              <button 
                className="profile-button save" 
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </>
          ) : (
            <>
              <button 
                className="profile-button edit" 
                onClick={() => setIsEditing(true)}
              >
                ✏️ Редактировать
              </button>
              <button 
                className="profile-button logout" 
                onClick={onLogout}
              >
                🚪 Выйти
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .profile-modal {
          background: var(--bg-light);
          border-radius: var(--radius-2xl);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          padding: 2rem;
          box-shadow: var(--shadow-xl);
          animation: scaleIn 0.3s ease;
        }

        .dark-theme .profile-modal {
          background: var(--bg-sidebar-dark);
          color: var(--text-dark);
        }

        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-secondary-light);
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          transition: all 0.3s;
          z-index: 10;
        }

        .dark-theme .close-button {
          color: var(--text-secondary-dark);
        }

        .close-button:hover {
          background: var(--bg-chat-light);
        }

        .dark-theme .close-button:hover {
          background: var(--bg-dark);
        }

        .profile-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .profile-avatar-container {
          width: 120px;
          height: 120px;
          margin: 0 auto 1rem;
          position: relative;
          cursor: ${isEditing ? 'pointer' : 'default'};
        }

        .profile-avatar, .profile-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: var(--radius-full);
          object-fit: cover;
        }

        .profile-avatar {
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-dark) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 3rem;
          font-weight: bold;
          border: 4px solid var(--primary);
          transition: all 0.3s;
        }

        .profile-avatar:hover {
          transform: ${isEditing ? 'scale(1.05)' : 'none'};
        }

        .avatar-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 2rem;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .profile-avatar-container:hover .avatar-overlay {
          opacity: 1;
        }

        .profile-name {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: var(--text-light);
        }

        .dark-theme .profile-name {
          color: var(--text-dark);
        }

        .profile-badge {
          font-size: 0.875rem;
          color: var(--text-secondary-light);
        }

        .dark-theme .profile-badge {
          color: var(--text-secondary-dark);
        }

        .profile-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          background: var(--bg-chat-light);
          padding: 0.25rem;
          border-radius: var(--radius-full);
        }

        .dark-theme .profile-tabs {
          background: var(--bg-dark);
        }

        .profile-tab {
          flex: 1;
          padding: 0.5rem;
          border: none;
          background: none;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          color: var(--text-secondary-light);
        }

        .dark-theme .profile-tab {
          color: var(--text-secondary-dark);
        }

        .profile-tab.active {
          background: var(--primary);
          color: white;
        }

        .profile-content {
          min-height: 200px;
          margin-bottom: 2rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border-light);
        }

        .dark-theme .info-row {
          border-bottom-color: var(--border-dark);
        }

        .info-label {
          color: var(--text-secondary-light);
          font-weight: 500;
        }

        .dark-theme .info-label {
          color: var(--text-secondary-dark);
        }

        .info-value {
          color: var(--text-light);
          font-weight: 600;
        }

        .dark-theme .info-value {
          color: var(--text-dark);
        }

        .profile-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          font-size: 1rem;
          margin-top: 0.25rem;
          background: var(--bg-light);
          color: var(--text-light);
        }

        .dark-theme .profile-input {
          background: var(--bg-dark);
          border-color: var(--border-dark);
          color: var(--text-dark);
        }

        .profile-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        small {
          display: block;
          color: var(--text-secondary-light);
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        /* Стили для подтверждения почты */
        .verification-section {
          margin-top: 2rem;
          padding: 1.5rem;
          background: rgba(124, 58, 237, 0.1);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(124, 58, 237, 0.2);
        }

        .verify-email-button {
          width: 100%;
          padding: 1rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .verify-email-button:hover:not(:disabled) {
          background: var(--primary-dark);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .verify-email-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .verify-hint {
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-secondary-light);
          margin-top: 0.75rem;
        }

        .dark-theme .verify-hint {
          color: var(--text-secondary-dark);
        }

        .verify-code-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .verify-instruction {
          text-align: center;
          font-size: 0.9375rem;
          color: var(--text-light);
          line-height: 1.5;
        }

        .dark-theme .verify-instruction {
          color: var(--text-dark);
        }

        .verify-instruction strong {
          color: var(--primary);
        }

        .verify-code-input {
          width: 100%;
          padding: 1rem;
          font-size: 1.5rem;
          text-align: center;
          letter-spacing: 0.5rem;
          border: 2px solid var(--primary);
          border-radius: var(--radius-lg);
          background: var(--bg-light);
          color: var(--text-light);
          font-weight: 600;
        }

        .dark-theme .verify-code-input {
          background: var(--bg-dark);
          color: var(--text-dark);
        }

        .verify-code-input:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.3);
        }

        .verify-code-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .verify-submit-button,
        .verify-cancel-button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
        }

        .verify-submit-button {
          background: var(--success);
          color: white;
        }

        .verify-submit-button:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .verify-submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .verify-cancel-button {
          background: var(--bg-chat-light);
          color: var(--text-light);
        }

        .dark-theme .verify-cancel-button {
          background: var(--bg-dark);
          color: var(--text-dark);
        }

        .verify-cancel-button:hover {
          filter: brightness(0.95);
        }

        .verify-countdown {
          text-align: center;
          color: var(--text-secondary-light);
          font-size: 0.875rem;
        }

        .verify-resend-link {
          background: none;
          border: none;
          color: var(--primary);
          font-size: 0.875rem;
          text-decoration: underline;
          cursor: pointer;
          padding: 0.5rem;
        }

        .verify-resend-link:hover:not(:disabled) {
          color: var(--primary-dark);
        }

        .verify-resend-link:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .settings-section {
          margin-bottom: 2rem;
        }

        .settings-section h3 {
          margin-bottom: 1rem;
          font-size: 1rem;
          color: var(--text-light);
        }

        .dark-theme .settings-section h3 {
          color: var(--text-dark);
        }

        .setting-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          cursor: pointer;
          border-radius: var(--radius);
          transition: background-color 0.3s;
        }

        .setting-item:hover {
          background: var(--bg-chat-light);
        }

        .dark-theme .setting-item:hover {
          background: var(--bg-dark);
        }

        .setting-item input[type="checkbox"] {
          width: 1.125rem;
          height: 1.125rem;
          cursor: pointer;
        }

        .danger-button {
          width: 100%;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          background: var(--danger);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
        }

        .danger-button:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .stat-card {
          background: var(--bg-chat-light);
          padding: 1.5rem 1rem;
          border-radius: var(--radius-lg);
          text-align: center;
          transition: transform 0.3s;
        }

        .dark-theme .stat-card {
          background: var(--bg-dark);
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: var(--text-secondary-light);
          font-size: 0.875rem;
        }

        .dark-theme .stat-label {
          color: var(--text-secondary-dark);
        }

        .last-active {
          text-align: center;
          color: var(--text-secondary-light);
          font-size: 0.875rem;
          padding: 1rem;
          background: var(--bg-chat-light);
          border-radius: var(--radius-lg);
        }

        .dark-theme .last-active {
          background: var(--bg-dark);
          color: var(--text-secondary-dark);
        }

        .profile-footer {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          border-top: 1px solid var(--border-light);
          padding-top: 1.5rem;
        }

        .dark-theme .profile-footer {
          border-top-color: var(--border-dark);
        }

        .profile-button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
        }

        .profile-button.edit {
          background: var(--primary);
          color: white;
        }

        .profile-button.edit:hover:not(:disabled) {
          background: var(--primary-dark);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .profile-button.logout {
          background: var(--danger);
          color: white;
        }

        .profile-button.logout:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .profile-button.cancel {
          background: var(--bg-chat-light);
          color: var(--text-light);
        }

        .dark-theme .profile-button.cancel {
          background: var(--bg-dark);
          color: var(--text-dark);
        }

        .profile-button.save {
          background: var(--success);
          color: white;
        }

        .profile-button.save:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .profile-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .profile-modal {
            padding: 1.5rem;
            width: 95%;
          }

          .profile-avatar-container {
            width: 100px;
            height: 100px;
          }

          .profile-avatar {
            font-size: 2.5rem;
          }

          .profile-name {
            font-size: 1.25rem;
          }

          .stats-grid {
            gap: 0.5rem;
          }

          .stat-card {
            padding: 1rem 0.5rem;
          }

          .stat-value {
            font-size: 1.5rem;
          }

          .verify-code-input {
            font-size: 1.25rem;
            letter-spacing: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;
