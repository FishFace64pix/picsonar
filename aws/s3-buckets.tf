terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "stage" {
  description = "Deployment stage (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# Raw Photos Bucket
resource "aws_s3_bucket" "raw_photos" {
  bucket = "eventfacematch-raw-photos-${var.stage}"

  tags = {
    Name        = "EventFaceMatch Raw Photos"
    Environment = var.stage
  }
}

resource "aws_s3_bucket_versioning" "raw_photos" {
  bucket = aws_s3_bucket.raw_photos.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_photos" {
  bucket = aws_s3_bucket.raw_photos.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "raw_photos" {
  bucket = aws_s3_bucket.raw_photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Face Index Bucket
resource "aws_s3_bucket" "face_index" {
  bucket = "eventfacematch-face-index-${var.stage}"

  tags = {
    Name        = "EventFaceMatch Face Index"
    Environment = var.stage
  }
}

resource "aws_s3_bucket_versioning" "face_index" {
  bucket = aws_s3_bucket.face_index.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "face_index" {
  bucket = aws_s3_bucket.face_index.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "face_index" {
  bucket = aws_s3_bucket.face_index.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# QR Codes Bucket
resource "aws_s3_bucket" "qr_codes" {
  bucket = "eventfacematch-qr-codes-${var.stage}"

  tags = {
    Name        = "EventFaceMatch QR Codes"
    Environment = var.stage
  }
}

resource "aws_s3_bucket_versioning" "qr_codes" {
  bucket = aws_s3_bucket.qr_codes.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "qr_codes" {
  bucket = aws_s3_bucket.qr_codes.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# QR Codes bucket can be public for easy access
resource "aws_s3_bucket_public_access_block" "qr_codes" {
  bucket = aws_s3_bucket.qr_codes.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "qr_codes" {
  bucket = aws_s3_bucket.qr_codes.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.qr_codes.arn}/*"
      }
    ]
  })
}

