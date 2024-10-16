from datetime import datetime
from extensions import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(255), primary_key=True)
    characters = db.relationship('Character', backref='owner', lazy=True, cascade="all, delete-orphan")
    conversations = db.relationship('Conversation', backref='user', lazy=True, cascade="all, delete-orphan")

class Character(db.Model):
    __tablename__ = 'characters'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    attributes = db.Column(db.JSON, nullable=False)
    avatar = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    conversations = db.relationship('Conversation', backref='character', lazy=True, cascade="all, delete-orphan")

class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('characters.id'), nullable=False)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    messages = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def add_message(self, role, content):
        if not self.messages:
            self.messages = []
        self.messages.append({'role': role, 'content': content})
        db.session.commit()