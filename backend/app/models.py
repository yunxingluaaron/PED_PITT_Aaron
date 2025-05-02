# app/models.py
from datetime import datetime
from app.database import db
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.dialects.postgresql import JSON

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    conversations = db.relationship('Conversation', backref='user', lazy=True)
    questions = db.relationship('Question', backref='user', lazy=True)

    def set_password(self, password):
        """Set hashed password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check hashed password."""
        return check_password_hash(self.password_hash, password)

    def update_last_login(self):
        """Update last login timestamp."""
        self.last_login = datetime.utcnow()

    def to_dict(self):
        """Convert user object to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active
        }

class Conversation(db.Model):
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.String(36), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    messages = db.relationship('Message', backref='conversation', lazy=True)

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'))
    content = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text)
    response_metadata = db.Column(JSON)  # Changed from metadata to response_metadata
    source_data = db.Column(JSON)        # Changed from sources to source_data
    relationship_data = db.Column(JSON)   # Changed from relationships to relationship_data
    parent_name = db.Column(db.String(255), nullable=True)  # Added parent_name field
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    message_type = db.Column(db.String(50), default='text')  # text, image, etc.

    def to_dict(self):
        """Convert message object to dictionary."""
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'content': self.content,
            'response': self.response,
            'metadata': self.response_metadata,
            'sources': self.source_data,
            'relationships': self.relationship_data,
            'parent_name': self.parent_name,  # Include parent_name in dict
            'created_at': self.created_at.isoformat(),
            'message_type': self.message_type
        }

class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'))
    parent_name = db.Column(db.String(255), nullable=True)  # Added parent_name field
    versions = db.relationship('VersionHistory', backref='question', lazy=True)
    is_archived = db.Column(db.Boolean, default=False)

    def to_dict(self):
        """Convert question object to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'conversation_id': self.conversation_id,
            'parent_name': self.parent_name,  # Include parent_name in dict
            'is_archived': self.is_archived
        }

class VersionHistory(db.Model):
    __tablename__ = 'version_history'
    
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'user' or 'ai'
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    parent_name = db.Column(db.String(255), nullable=True)  # Added parent_name field
    is_liked = db.Column(db.Boolean, default=False)
    is_bookmarked = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'question_id': self.question_id,
            'content': self.content,
            'type': self.type,
            'timestamp': self.timestamp.isoformat(),
            'parent_name': self.parent_name,  # Include parent_name in dict
            'is_liked': self.is_liked,
            'is_bookmarked': self.is_bookmarked,
        }