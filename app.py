import os
import json
import logging
import redis
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, g, flash
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# Import extensions
from extensions import db, migrate, oauth, socketio, make_celery

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

def create_app():
    app = Flask(__name__)

    # App Configuration
    app.config.from_object('config.Config')

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    oauth.init_app(app)

    # Initialize Socket.IO with message queue from config
    socketio.init_app(app, message_queue=app.config['SOCKETIO_MESSAGE_QUEUE'])

    # Initialize Celery
    celery = make_celery(app)

    # Redis client
    redis_client = redis.from_url(app.config['REDIS_URL'])

    # Register blueprints to avoid circular imports
    from auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint, url_prefix="/auth")

    # Allowed extensions for file uploads
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    # Utility function for allowed file types
    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    # Import models within app context
    with app.app_context():
        from models import User, Character, Conversation

    # Load current user before each request
    @app.before_request
    def load_current_user():
        g.current_user = None
        if 'user' in session:
            g.current_user = session['user']

    # Home route
    @app.route('/')
    def home():
        return render_template('home.html')

    # Dashboard route (requires authentication)
    @app.route('/dashboard')
    def dashboard():
        if not g.current_user:
            return redirect(url_for('auth.login'))
        user_id = g.current_user['sub']
        characters = Character.query.filter_by(user_id=user_id).all()
        return render_template('dashboard.html', characters=characters)

    # Character creation route
    @app.route('/create_character', methods=['GET', 'POST'])
    def create_character():
        if not g.current_user:
            return redirect(url_for('auth.login'))

        if request.method == 'POST':
            name = request.form.get('name', '').strip()
            description = request.form.get('description', '').strip()
            attributes = request.form.get('attributes', '{}')
            avatar = request.form.get('avatar', 'avatar1.png')

            try:
                attributes = json.loads(attributes)
            except json.JSONDecodeError:
                flash('Invalid attributes format.', 'danger')
                return redirect(request.url)

            # Handle avatar upload if 'custom' is selected
            if avatar == 'custom':
                if 'avatarUpload' not in request.files:
                    flash('No file part', 'danger')
                    return redirect(request.url)
                file = request.files['avatarUpload']
                if file.filename == '':
                    flash('No selected file', 'danger')
                    return redirect(request.url)
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    avatar_path = os.path.join(app.root_path, 'static', 'images', 'avatars', filename)
                    file.save(avatar_path)
                    avatar = filename
                else:
                    flash('Invalid file type. Allowed types: png, jpg, jpeg, gif.', 'danger')
                    return redirect(request.url)
            elif avatar not in [f'avatar{i}.png' for i in range(1, 7)]:
                avatar = 'avatar1.png'  # Default avatar if none selected

            new_character = Character(
                name=name,
                description=description,
                attributes=attributes,
                avatar=avatar,
                user_id=g.current_user['sub']
            )
            db.session.add(new_character)
            db.session.commit()
            flash('Character created successfully.', 'success')
            return redirect(url_for('dashboard'))

        return render_template('create_character.html')

    # Chat route
    @app.route('/chat/<int:character_id>')
    def chat(character_id):
        if not g.current_user:
            return redirect(url_for('auth.login'))

        character = Character.query.filter_by(id=character_id, user_id=g.current_user['sub']).first_or_404()
        return render_template('chat.html', character=character)

    # API route to send message and get AI response
    @app.route('/api/send_message', methods=['POST'])
    def send_message():
        if not g.current_user:
            return jsonify({'error': 'Authentication required'}), 401

        data = request.get_json()
        character_id = data.get('character_id')
        user_message = data.get('message')

        if not character_id or not user_message:
            return jsonify({'error': 'Character ID and message are required.'}), 400

        character = Character.query.filter_by(id=character_id, user_id=g.current_user['sub']).first()
        if not character:
            return jsonify({'error': 'Character not found'}), 404

        conversation = Conversation.query.filter_by(character_id=character_id, user_id=g.current_user['sub']).first()
        if not conversation:
            conversation = Conversation(character_id=character_id, user_id=g.current_user['sub'], messages=[])
            db.session.add(conversation)
            db.session.commit()

        # Append user message to conversation
        conversation.add_message('user', user_message)
        db.session.commit()

        # Enqueue background task for AI response
        from tasks import generate_character_response_task
        generate_character_response_task.delay(conversation.id, character_id, user_message, g.current_user['sub'])

        return jsonify({'message': 'Message sent and processing in background'}), 200

    # API route to get conversation messages
    @app.route('/api/get_conversation/<int:character_id>')
    def get_conversation(character_id):
        if not g.current_user:
            return jsonify({'error': 'Authentication required'}), 401

        page = request.args.get('page', 1, type=int)
        per_page = 20  # Number of messages per page

        conversation = Conversation.query.filter_by(
            character_id=character_id,
            user_id=g.current_user['sub']
        ).order_by(Conversation.created_at.desc()).first()

        if conversation and conversation.messages:
            messages = conversation.messages
            messages.reverse()
            start = (page - 1) * per_page
            end = start + per_page
            page_messages = messages[start:end]
            has_more = end < len(messages)
            result = {
                'messages': page_messages,
                'has_more': has_more
            }
            return jsonify(result)
        else:
            return jsonify({'messages': [], 'info': 'No conversation found for this character. Start chatting to begin!'})

    # Error Handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('500.html'), 500

    return app