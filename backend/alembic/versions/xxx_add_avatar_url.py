"""add avatar and updated_at

Revision ID: xxxx
Revises: None
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic
revision = 'xxxx'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns
    op.add_column('users', sa.Column('phone_number', sa.String(), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(), nullable=True))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Update existing rows to set updated_at to current timestamp
    connection = op.get_bind()
    connection.execute(sa.text("UPDATE users SET updated_at = :timestamp"), 
                      {"timestamp": datetime.utcnow()})

def downgrade():
    # Remove the columns in reverse order
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'phone_number')