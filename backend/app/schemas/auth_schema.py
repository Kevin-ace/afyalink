from marshmallow import Schema, fields

class RegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)

class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)
