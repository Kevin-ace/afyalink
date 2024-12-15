from flask import Blueprint, request, jsonify
from app.models import User
from app.extensions import db
from flask_jwt_extended import create_access_token, jwt_required
from werkzeug.security import generate_password_hash, check_password_hash

auth = Blueprint('auth', __name__)

# User Registration
@auth.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 400

    # Hash the password
    password_hash = generate_password_hash(password)

    new_user = User(username=username, email=email, password_hash=password_hash)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

# User Login
@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    # Check if user exists and password is correct
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid email or password"}), 401

    # Create JWT token
    access_token = create_access_token(identity=user.id)

    return jsonify({"access_token": access_token}), 200




# from flask import Blueprint, request, jsonify
# from app.services.auth_service import register_user, login_user

# auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# @auth_bp.route('/register', methods=['POST'])
# def register():
#     data = request.json
#     return register_user(data)

# @auth_bp.route('/login', methods=['POST'])
# def login():
#     data = request.json
#     return login_user(data)
