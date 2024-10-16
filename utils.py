# app/utils.py

import os
import logging
from flask import current_app

def init_logging(app):
    """
    Initializes logging for the Flask application.
    Logs are written to both console and a file.
    """
    # Remove default handlers to prevent duplicate logs
    for handler in app.logger.handlers[:]:
        app.logger.removeHandler(handler)

    # Set log level
    app.logger.setLevel(logging.INFO)

    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)

    # Create file handler
    if not os.path.exists('logs'):
        os.makedirs('logs')
    file_handler = logging.FileHandler('logs/matrixmingle.log')
    file_handler.setLevel(logging.INFO)

    # Create formatter and add to handlers
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    )
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)

    # Add handlers to the app's logger
    app.logger.addHandler(console_handler)
    app.logger.addHandler(file_handler)

def allowed_file(filename):
    """
    Checks if the uploaded file has an allowed extension.
    """
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions