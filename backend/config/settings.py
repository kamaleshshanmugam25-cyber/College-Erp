"""Settings. All secrets come from the environment; nothing sensitive is hard-coded."""
import os
from decimal import Decimal
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env if present
env_file = BASE_DIR / ".env"
if env_file.exists():
    with open(env_file, encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())

env = os.environ.get

DEBUG = env("DJANGO_DEBUG", "1") == "1"
SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-only-insecure-key")
ALLOWED_HOSTS = [h.strip() for h in env("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver,*").split(",") if h.strip()]
if "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

INSTALLED_APPS = [
    "corsheaders",
    "django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes",
    "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
    "rest_framework",
    "apps.core", "apps.ledger", "apps.fees", "apps.hr",
]
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
CSRF_COOKIE_HTTPONLY = False
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"], "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# ---- Database: PostgreSQL. Services wrap work in transaction.atomic() explicitly,
# so ATOMIC_REQUESTS stays off (a webhook must commit or roll back as one unit it controls).
if env("USE_SQLITE", "1") == "1":  # tests / quick local checks only
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
else:
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", "edu_erp"), "USER": env("POSTGRES_USER", "erp"),
        "PASSWORD": env("POSTGRES_PASSWORD", ""), "HOST": env("POSTGRES_HOST", "localhost"),
        "PORT": env("POSTGRES_PORT", "5432"), "CONN_MAX_AGE": 60, "ATOMIC_REQUESTS": False,
    }}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": f"django.contrib.auth.password_validation.{n}"}
    for n in ("UserAttributeSimilarityValidator", "MinimumLengthValidator",
              "CommonPasswordValidator", "NumericPasswordValidator")
]
LOGIN_URL, LOGIN_REDIRECT_URL, LOGOUT_REDIRECT_URL = "login", "/", "login"

LANGUAGE_CODE, TIME_ZONE, USE_I18N, USE_TZ = "en-in", "Asia/Kolkata", True, True
STATIC_URL, STATIC_ROOT = "static/", BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL, MEDIA_ROOT = "media/", BASE_DIR / "media"   # serve media via a private bucket / signed URLs in prod

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.UserRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"user": "120/min"},
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

# ---- Celery / Redis
REDIS_URL = env("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_ALWAYS_EAGER = env("CELERY_EAGER", "1") == "1"
CELERY_TIMEZONE = TIME_ZONE

# ---- Payment gateways (HMAC secrets). An empty secret rejects every webhook.
PAYMENT_GATEWAYS = {
    "razorpay": {"webhook_secret": env("RAZORPAY_WEBHOOK_SECRET", "")},
    "cashfree": {"webhook_secret": env("CASHFREE_WEBHOOK_SECRET", "")},
}

# ---- Payroll rules. These are DATA, not logic: statutory rates change between
# financial years, so verify every value below against the current notification before go-live.
D = Decimal
PAYROLL = {
    "WEEKLY_OFF_DAYS": {6},                      # Python weekday(): Mon=0 ... Sun=6
    "PF_RATE": D("0.12"), "PF_WAGE_CEILING": D("15000"),
    "ESI_RATE": D("0.0075"), "ESI_GROSS_CEILING": D("21000"),
    "STANDARD_DEDUCTION": D("75000"), "REBATE_LIMIT": D("1200000"), "CESS": D("0.04"),
    "TDS_SLABS": [  # (upper bound of slab, rate); None = no upper bound. New-regime shape.
        (D("400000"), D("0")), (D("800000"), D("0.05")), (D("1200000"), D("0.10")),
        (D("1600000"), D("0.15")), (D("2000000"), D("0.20")), (D("2400000"), D("0.25")),
        (None, D("0.30")),
    ],
}

# ---- Production hardening
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS, SECURE_HSTS_INCLUDE_SUBDOMAINS, SECURE_HSTS_PRELOAD = 31536000, True, True
SESSION_COOKIE_HTTPONLY = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
