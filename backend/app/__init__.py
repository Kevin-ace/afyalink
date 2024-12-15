from flask import Flask
from .extensions import db, jwt
from flask_migrate import Migrate

def create_app():
    app = Flask(__name__)

    # Database URI
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://username:password@localhost/afyalink_db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # JWT Setup
    app.config['JWT_SECRET_KEY'] = 'your_jwt_secret_key'  # Change this in production
    jwt.init_app(app)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    return app





# from .routes.auth_routes import auth_bp
# from .routes import (
#     auth_bp, 
#     hospital_bp, 
#     root_bp
# )

# def create_app():
#     app = Flask(__name__)
    
#     # Load configuration
#     app.config.from_object('app.config.Config')

#     # Initialize extensions
#     db.init_app(app)
#     jwt.init_app(app)

#     # Register blueprints
#     app.register_blueprint(root_bp)
#     app.register_blueprint(auth_bp)
#     app.register_blueprint(hospital_bp)

#     return app

