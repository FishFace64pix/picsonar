/**
 * Jest setup — populates the environment that getEnv() requires.
 * Kept minimal: only vars the schema marks as required.
 */
process.env.NODE_ENV = 'test'
process.env.STAGE = 'test'
process.env.AWS_REGION = 'eu-central-1'
process.env.JWT_SECRET =
  'test-jwt-secret-must-be-at-least-32-characters-long-xxxxx'
process.env.JWT_REFRESH_SECRET =
  'test-refresh-secret-must-be-at-least-32-characters-long'

process.env.USERS_TABLE = 'picsonar-users-test'
process.env.EVENTS_TABLE = 'picsonar-events-test'
process.env.PHOTOS_TABLE = 'picsonar-photos-test'
process.env.FACES_TABLE = 'picsonar-faces-test'
process.env.ORDERS_TABLE = 'picsonar-orders-test'
process.env.RATE_LIMITS_TABLE = 'picsonar-rate-limits-test'

process.env.RAW_PHOTOS_BUCKET = 'picsonar-raw-test'
process.env.FACE_INDEX_BUCKET = 'picsonar-faces-test'
process.env.REKOGNITION_COLLECTION_ID = 'picsonar-test-collection'

process.env.STRIPE_SECRET_KEY = 'sk_test_00000000'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_00000000'

process.env.SMTP_HOST = 'smtp.test'
process.env.SMTP_USER = 'test'
process.env.SMTP_PASS = 'test'
process.env.EMAIL_FROM = 'no-reply@test.picsonar.example'

process.env.ALLOWED_ORIGINS = 'http://localhost:5173'
process.env.LOG_LEVEL = 'error'
