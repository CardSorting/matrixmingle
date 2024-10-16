# tasks.py

from extensions import celery
from models import Conversation, Character
from openrouter_api import generate_character_response
from flask import current_app
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy import create_engine
import logging
from flask_socketio import SocketIO

# Configure logging
logger = logging.getLogger(__name__)

@celery.task
def generate_character_response_task(conversation_id, character_id, user_message, user_id):
    with current_app.app_context():
        # Create a new SQLAlchemy session
        engine = create_engine(current_app.config['SQLALCHEMY_DATABASE_URI'])
        Session = scoped_session(sessionmaker(bind=engine))
        session = Session()

        try:
            # Retrieve conversation and character
            conversation = session.query(Conversation).get(conversation_id)
            character = session.query(Character).get(character_id)

            if not conversation or not character:
                current_app.logger.error(f"Conversation or character not found (ID: {conversation_id}, {character_id})")
                return

            # Initialize Socket.IO with message queue
            socketio_message_queue = current_app.config.get('SOCKETIO_MESSAGE_QUEUE')
            if not socketio_message_queue:
                current_app.logger.error("SOCKETIO_MESSAGE_QUEUE is not configured.")
                return

            socketio = SocketIO(message_queue=socketio_message_queue)

            # Generate AI response using openrouter_api
            ai_response_generator = generate_character_response(character, user_message)

            ai_response = ''
            room = f"chat_{user_id}_{character_id}"

            max_tokens = 1000  # Set a reasonable limit to prevent infinite loops
            token_count = 0

            for token in ai_response_generator:
                ai_response += token
                token_count += 1

                # Emit partial responses to the client via Socket.IO
                socketio.emit('partial_ai_response', {'token': token}, room=room)

                if token_count >= max_tokens:
                    current_app.logger.warning(f"Token limit reached in generate_character_response_task for conversation {conversation_id}")
                    break

            # Append AI response to conversation
            conversation.add_message('ai', ai_response)

            # Commit the session to save changes
            session.commit()

            # Notify client that the AI response is complete
            socketio.emit('ai_response_complete', {'role': 'ai', 'content': ai_response}, room=room)

        except Exception as e:
            current_app.logger.error(f"Error in generate_character_response_task: {e}")
            # Emit error message to the client
            try:
                socketio.emit('error', {'error': 'An error occurred while generating the AI response.'}, room=room)
            except Exception as emit_error:
                current_app.logger.error(f"Failed to emit error message via Socket.IO: {emit_error}")
        finally:
            # Close the session
            session.remove()