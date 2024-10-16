import os
from flask import Blueprint, session, redirect, url_for, g, jsonify
from extensions import db, oauth
from models import User
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

auth = Blueprint('auth', __name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)  # Enable debug logging
logger = logging.getLogger(__name__)

# Auth0 Configuration using oauth.register with correct parameter
auth0 = oauth.register(
    'auth0',
    client_id=os.getenv('AUTH0_CLIENT_ID'),
    client_secret=os.getenv('AUTH0_CLIENT_SECRET'),
    api_base_url=f'https://{os.getenv("AUTH0_DOMAIN")}',
    access_token_url=f'https://{os.getenv("AUTH0_DOMAIN")}/oauth/token',
    authorize_url=f'https://{os.getenv("AUTH0_DOMAIN")}/authorize',
    client_kwargs={
        'scope': 'openid profile email',
    },
    # Correct parameter is 'server_metadata_url', not 'client_metadata_url'
    server_metadata_url=f'https://{os.getenv("AUTH0_DOMAIN")}/.well-known/openid-configuration'
)

@auth.route('/login')
def login():
    logger.debug("Initiating login process")
    redirect_uri = 'https://matrixmingle.com/auth/callback'
    logger.debug(f"Redirect URI: {redirect_uri}")
    return auth0.authorize_redirect(redirect_uri=redirect_uri)

@auth.route('/register')
def register():
    logger.debug("Initiating registration process")
    redirect_uri = 'https://matrixmingle.com/auth/callback'
    logger.debug(f"Redirect URI: {redirect_uri}")
    return auth0.authorize_redirect(redirect_uri=redirect_uri, screen_hint='signup')

@auth.route('/callback')
def callback():
    logger.debug("Handling callback from Auth0")
    token = auth0.authorize_access_token()
    logger.debug(f"Access token received: {token}")
    userinfo = auth0.get('userinfo').json()
    logger.debug(f"User info received: {userinfo}")
    session['user'] = userinfo

    # Add user to the database if not already present
    user = User.query.filter_by(id=userinfo['sub']).first()
    if not user:
        user = User(id=userinfo['sub'])
        db.session.add(user)
        db.session.commit()
        logger.info(f"New user added: {userinfo['sub']}")
    else:
        logger.debug(f"User already exists: {userinfo['sub']}")

    return redirect(url_for('dashboard'))

@auth.route('/logout')
def logout():
    logger.debug("Logging out user")
    session.clear()
    return redirect(
        f'https://{os.getenv("AUTH0_DOMAIN")}/v2/logout?client_id={os.getenv("AUTH0_CLIENT_ID")}&returnTo=https://matrixmingle.com'
    )