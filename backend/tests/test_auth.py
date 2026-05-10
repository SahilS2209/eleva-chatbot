from app.auth import hash_password, verify_password, create_access_token
from app.config import get_settings
from jose import jwt

settings = get_settings()


def test_hash_password_returns_string():
    """Test that hash_password returns a string."""
    result = hash_password("testpassword")
    assert isinstance(result, str)
    assert len(result) > 0


def test_hash_password_different_from_plain():
    """Test that hashed password differs from plain text."""
    plain = "mypassword123"
    hashed = hash_password(plain)
    assert hashed != plain


def test_hash_password_unique_each_time():
    """Test that same password produces different hashes (salt)."""
    hash1 = hash_password("samepassword")
    hash2 = hash_password("samepassword")
    assert hash1 != hash2


def test_verify_password_correct():
    """Test that correct password verifies successfully."""
    plain = "correctpassword"
    hashed = hash_password(plain)
    assert verify_password(plain, hashed) is True


def test_verify_password_incorrect():
    """Test that incorrect password fails verification."""
    hashed = hash_password("correctpassword")
    assert verify_password("wrongpassword", hashed) is False


def test_verify_password_empty_string():
    """Test verification with empty password."""
    hashed = hash_password("realpassword")
    assert verify_password("", hashed) is False


def test_create_access_token_returns_string():
    """Test that token creation returns a string."""
    token = create_access_token(data={"sub": "test@example.com"})
    assert isinstance(token, str)
    assert len(token) > 0


def test_create_access_token_contains_subject():
    """Test that token contains the correct subject."""
    token = create_access_token(data={"sub": "user@test.com", "role": "admin"})
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert payload["sub"] == "user@test.com"
    assert payload["role"] == "admin"


def test_create_access_token_has_expiration():
    """Test that token has an expiration claim."""
    token = create_access_token(data={"sub": "test@example.com"})
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert "exp" in payload


def test_create_access_token_with_custom_data():
    """Test token with additional custom data."""
    token = create_access_token(data={"sub": "admin@test.com", "role": "admin", "name": "Admin"})
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert payload["sub"] == "admin@test.com"
    assert payload["role"] == "admin"
    assert payload["name"] == "Admin"
