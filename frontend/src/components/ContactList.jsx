import React from 'react';
import '../styles/ContactList.css';

function ContactList({ contacts, selectedContact, onSelectContact, searchQuery, onSearchChange }) {
  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h2>Messages</h2>
      </div>
      
      <div className="search-container">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" strokeWidth="2"/>
          <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="contacts-container">
        {contacts.length === 0 ? (
          <div className="no-contacts">
            <p>No conversations yet</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className={`contact-item ${selectedContact?.id === contact.id ? 'active' : ''}`}
              onClick={() => onSelectContact(contact)}
            >
              <div className="contact-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                {contact.isOnline && <span className="online-indicator"></span>}
              </div>
              
              <div className="contact-info">
                <div className="contact-name-row">
                  <span className="contact-name">{contact.name}</span>
                  <span className="contact-time">{contact.lastMessageTime}</span>
                </div>
                <div className="contact-message-row">
                  <span className="contact-message">{contact.lastMessage}</span>
                  {contact.unreadCount > 0 && (
                    <span className="unread-badge">{contact.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ContactList;
