def test_register(client):
    response = client.post('/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 201

def test_login(client):
    response = client.post('/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 200
    assert 'access_token' in response.json
