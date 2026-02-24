import React, { useState, useRef } from 'react';

const Profile = ({ user, onClose, onUpdate, onLogout, onVerifyEmail }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    phone: user?.phone || ''
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [privacy, setPrivacy] = useState(user?.privacy || {
    showLastSeen: true,
    showOnline: true,
    allowCalls: true,
    allowGroups: true
  });
  const [notifications, setNotifications] = useState({
    messages: true,
    groups: true,
    calls: true,
    sound: true
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  // ==================== СТАТИСТИКА ====================
  const stats = {
    messagesSent: 128,
    groupsCreated: 3,
    callsMade: 15,
    contactsCount: 24,
    accountAge: '2 месяца',
    lastActive: new Date().toLocaleDateString('ru-RU')
  };

  // ==================== АВАТАР ====================
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

  // ==================== СОХРАНЕНИЕ ====================
  const handleSave = async () => {
    setIsLoading(true);
    
    // Имитация сохранения
    setTimeout(() => {
      onUpdate({
        ...user,
        ...editedUser,
        avatar: avatarPreview,
        privacy
      });
      setIsEditing(false);
      setIsLoading(false);
    }, 1000);
  };

  const handleCancel = () => {
    setEditedUser({
      name: user?.name || '',
      username: user?.username || '',
      bio: user?.bio || '',
      phone: user?.phone || ''
    });
    setAvatarPreview(user?.avatar || null);
    setAvatarFile(null);
    setIsEditing(false);
  };

  // ==================== ПОДТВЕРЖДЕНИЕ ПОЧТЫ ====================
  const handleVerifyClick = () => {
    if (onVerifyEmail) {
      onVerifyEmail();
    }
  };

  // ==================== ВСПОМОГАТЕЛЬНЫЕ ====================
  const getInitials = (name) => {
    return name?.charAt(0).toUpperCase() || '?';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>✕</button>
        
        {/* Шапка профиля */}
        <div className="profile-header">
          <div 
            className={`profile-avatar-container ${isEditing ? 'editable' : ''}`}
            onClick={handleAvatarClick}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar">
                {getInitials(user?.name)}
              </div>
            )}
            {isEditing && (
              <div className="avatar-edit-overlay">
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
          
          <h2 className="profile-name">{user?.name}</h2>
          <div className="profile-username">{user?.username}</div>
          
          {!user?.isVerified && (
            <button 
              className="verify-email-button"
              onClick={handleVerifyClick}
            >
              ✉️ Подтвердить email
            </button>
          )}
        </div>

        {/* Табы */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Профиль
          </button>
          <button
            className={`profile-tab ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            🔒 Приватность
          </button>
          <button
            className={`profile-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            🔔 Уведомления
          </button>
          <button
            className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Статистика
          </button>
        </div>

        {/* Контент */}
        <div className="profile-content">
          {/* Вкладка Профиль */}
          {activeTab === 'profile' && (
            <div className="profile-info">
              {isEditing ? (
                <>
                  <div className="info-row">
                    <label>Имя</label>
                    <input
                      type="text"
                      value={editedUser.name}
                      onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                      className="profile-input"
                      placeholder="Ваше имя"
                    />
                  </div>
                  
                  <div className="info-row">
                    <label>Username</label>
                    <input
                      type="text"
                      value={editedUser.username}
                      onChange={(e) => setEditedUser({...editedUser, username: e.target.value})}
                      className="profile-input"
                      placeholder="@username"
                    />
                  </div>
                  
                  <div className="info-row">
                    <label>О себе</label>
                    <textarea
                      value={editedUser.bio}
                      onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})}
                      className="profile-textarea"
                      placeholder="Расскажите о себе"
                      rows="3"
                    />
                  </div>
                  
                  <div className="info-row">
                    <label>Телефон</label>
                    <input
                      type="tel"
                      value={editedUser.phone}
                      onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})}
                      className="profile-input"
                      placeholder="+7 (999) 999-99-99"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="info-item">
                    <span className="info-label">📧 Email</span>
                    <span className="info-value">{user?.email}</span>
                    {!user?.isVerified && (
                      <span className="unverified-badge">Не подтверждён</span>
                    )}
                  </div>
                  
                  {user?.bio && (
                    <div className="info-item bio">
                      <span className="info-label">📝 О себе</span>
                      <span className="info-value">{user.bio}</span>
                    </div>
                  )}
                  
                  {user?.phone && (
                    <div className="info-item">
                      <span className="info-label">📱 Телефон</span>
                      <span className="info-value">{user.phone}</span>
                    </div>
                  )}
                  
                  <div className="info-item">
                    <span className="info-label">📅 Дата регистрации</span>
                    <span className="info-value">{formatDate(user?.createdAt)}</span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">🆔 ID</span>
                    <span className="info-value id">{user?.id}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Вкладка Приватность */}
          {activeTab === 'privacy' && (
            <div className="privacy-settings">
              <div className="settings-section">
                <h3>Кто может видеть</h3>
                
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={privacy.showLastSeen}
                    onChange={(e) => setPrivacy({...privacy, showLastSeen: e.target.checked})}
                    disabled={!isEditing}
                  />
                  <span>Время последнего посещения</span>
                </label>
                
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={privacy.showOnline}
                    onChange={(e) => setPrivacy({...privacy, showOnline: e.target.checked})}
                    disabled={!isEditing}
                  />
                  <span>Статус «онлайн»</span>
                </label>
                
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={privacy.allowCalls}
                    onChange={(e) => setPrivacy({...privacy, allowCalls: e.target.checked})}
                    disabled={!isEditing}
                  />
                  <span>Разрешить звонки от всех</span>
                </label>
                
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={privacy.allowGroups}
                    onChange={(e) => setPrivacy({...privacy, allowGroups: e.target.checked})}
                    disabled={!isEditing}
                  />
                  <span>Разрешать добавлять в группы</span>
                </label>
              </div>
              
              <div className="settings-section">
                <h3>Заблокированные</h3>
                <p className="empty-blocked">Нет заблокированных пользователей</p>
              </div>
              
              <div className="danger-zone">
                <h3>Опасная зона</h3>
                <button className="danger-button">🚫 Заблокировать пользователя</button>
                <button className="danger-button">🗑️ Удалить аккаунт</button>
              </div>
            </div>
          )}

          {/* Вкладка Уведомления */}
          {activeTab === 'notifications' && (
            <div className="notification-settings">
              <div className="settings-section">
                <h3>Типы уведомлений</h3>
                
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={notifications.messages}
                    onChange={(e) => setNotifications({...notifications, messages: e.target.checked})}
                  />
                  <span>Личные сообщения</span>
                </label>
                
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={notifications.groups}
                    onChange={(e) => setNotifications({...notifications, groups: e.target.checked})}
                  />
                  <span>Групповые чаты</span>
                </label>
                
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={notifications.calls}
                    onChange={(e) => setNotifications({...notifications, calls: e.target.checked})}
                  />
                  <span>Звонки</span>
                </label>
              </div>
              
              <div className="settings-section">
                <h3>Звук</h3>
                
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={notifications.sound}
                    onChange={(e) => setNotifications({...notifications, sound: e.target.checked})}
                  />
                  <span>Звуковые уведомления</span>
                </label>
              </div>
              
              <div className="settings-section">
                <h3>Дополнительно</h3>
                <button className="secondary-button">🔔 Настроить исключения</button>
                <button className="secondary-button">⏰ Режим «Не беспокоить»</button>
              </div>
            </div>
          )}

          {/* Вкладка Статистика */}
          {activeTab === 'stats' && (
            <div className="profile-stats">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{stats.messagesSent}</div>
                  <div className="stat-label">Сообщений</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{stats.groupsCreated}</div>
                  <div className="stat-label">Групп создано</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{stats.callsMade}</div>
                  <div className="stat-label">Звонков</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value">{stats.contactsCount}</div>
                  <div className="stat-label">Контактов</div>
                </div>
              </div>
              
              <div className="stats-details">
                <div className="stat-row">
                  <span>В системе:</span>
                  <strong>{stats.accountAge}</strong>
                </div>
                
                <div className="stat-row">
                  <span>Последняя активность:</span>
                  <strong>{stats.lastActive}</strong>
                </div>
                
                <div className="stat-row">
                  <span>Средняя длина сообщения:</span>
                  <strong>42 символа</strong>
                </div>
                
                <div className="stat-row">
                  <span>Любимый стикер:</span>
                  <strong>😊</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Футер с кнопками */}
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

      {/* Стили компонента */}
      <style jsx>{`
        .profile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .profile-modal {
          background: var(--bg-light);
          border-radius: var(--radius-2xl);
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          padding: 2rem;
          box-shadow: var(--shadow-xl);
          animation: slideUp 0.3s ease;
        }

        .dark .profile-modal {
          background: var(--bg-sidebar-dark);
          color: var(--text-dark);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .profile-close {
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

        .dark .profile-close {
          color: var(--text-secondary-dark);
        }

        .profile-close:hover {
          background: var(--bg-chat-light);
        }

        .dark .profile-close:hover {
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
          cursor: default;
        }

        .profile-avatar-container.editable {
          cursor: pointer;
        }

        .profile-avatar, .profile-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: var(--radius-full);
          object-fit: cover;
        }

        .profile-avatar {
          background: linear-gradient(135deg, var(--primary-light), var(--primary-dark));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 3rem;
          font-weight: bold;
          border: 4px solid var(--primary);
          transition: transform 0.3s;
        }

        .profile-avatar-container.editable:hover .profile-avatar {
          transform: scale(1.05);
        }

        .avatar-edit-overlay {
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

        .profile-avatar-container.editable:hover .avatar-edit-overlay {
          opacity: 1;
        }

        .profile-name {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
          color: var(--text-light);
        }

        .dark .profile-name {
          color: var(--text-dark);
        }

        .profile-username {
          font-size: 1rem;
          color: var(--text-secondary-light);
          margin-bottom: 1rem;
        }

        .dark .profile-username {
          color: var(--text-secondary-dark);
        }

        .verify-email-button {
          background: var(--warning);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .verify-email-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          filter: brightness(1.1);
        }

        .profile-tabs {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 2rem;
          background: var(--bg-chat-light);
          padding: 0.25rem;
          border-radius: var(--radius-full);
        }

        .dark .profile-tabs {
          background: var(--bg-dark);
        }

        .profile-tab {
          flex: 1;
          padding: 0.5rem;
          border: none;
          background: none;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s;
          color: var(--text-secondary-light);
        }

        .dark .profile-tab {
          color: var(--text-secondary-dark);
        }

        .profile-tab.active {
          background: var(--primary);
          color: white;
        }

        .profile-content {
          min-height: 300px;
          margin-bottom: 2rem;
        }

        .info-item {
          display: flex;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border-light);
        }

        .dark .info-item {
          border-bottom-color: var(--border-dark);
        }

        .info-item.bio {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .info-label {
          width: 120px;
          color: var(--text-secondary-light);
          font-weight: 500;
        }

        .dark .info-label {
          color: var(--text-secondary-dark);
        }

        .info-value {
          flex: 1;
          color: var(--text-light);
          font-weight: 600;
        }

        .dark .info-value {
          color: var(--text-dark);
        }

        .info-value.id {
          font-family: monospace;
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .unverified-badge {
          background: var(--warning);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          margin-left: 1rem;
        }

        .profile-input, .profile-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          font-size: 1rem;
          margin-top: 0.25rem;
          background: var(--bg-light);
          color: var(--text-light);
        }

        .dark .profile-input, .dark .profile-textarea {
          background: var(--bg-dark);
          border-color: var(--border-dark);
          color: var(--text-dark);
        }

        .profile-input:focus, .profile-textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .profile-textarea {
          resize: vertical;
          font-family: inherit;
        }

        .settings-section {
          margin-bottom: 2rem;
        }

        .settings-section h3 {
          margin-bottom: 1rem;
          font-size: 1rem;
          color: var(--text-light);
        }

        .dark .settings-section h3 {
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

        .dark .setting-item:hover {
          background: var(--bg-dark);
        }

        .setting-item input[type="checkbox"] {
          width: 1.125rem;
          height: 1.125rem;
          cursor: pointer;
        }

        .empty-blocked {
          text-align: center;
          padding: 1rem;
          color: var(--text-secondary-light);
          background: var(--bg-chat-light);
          border-radius: var(--radius-lg);
        }

        .dark .empty-blocked {
          background: var(--bg-dark);
          color: var(--text-secondary-dark);
        }

        .danger-zone {
          margin-top: 2rem;
          padding: 1rem;
          border: 1px solid var(--danger);
          border-radius: var(--radius-lg);
        }

        .danger-zone h3 {
          color: var(--danger);
          margin-bottom: 1rem;
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

        .secondary-button {
          width: 100%;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          background: var(--bg-chat-light);
          color: var(--text-light);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .dark .secondary-button {
          background: var(--bg-dark);
          color: var(--text-dark);
          border-color: var(--border-dark);
        }

        .secondary-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: var(--bg-chat-light);
          padding: 1.5rem 1rem;
          border-radius: var(--radius-lg);
          text-align: center;
          transition: transform 0.3s;
        }

        .dark .stat-card {
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

        .dark .stat-label {
          color: var(--text-secondary-dark);
        }

        .stats-details {
          background: var(--bg-chat-light);
          padding: 1rem;
          border-radius: var(--radius-lg);
        }

        .dark .stats-details {
          background: var(--bg-dark);
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-light);
        }

        .dark .stat-row {
          border-bottom-color: var(--border-dark);
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .profile-footer {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          border-top: 1px solid var(--border-light);
          padding-top: 1.5rem;
        }

        .dark .profile-footer {
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

        .dark .profile-button.cancel {
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

        @media (max-width: 768px) {
          .profile-modal {
            padding: 1.5rem;
          }

          .profile-avatar-container {
            width: 100px;
            height: 100px;
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

          .info-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .info-label {
            width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;
