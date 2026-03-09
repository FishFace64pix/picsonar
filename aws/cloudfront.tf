variable "stage" {
  description = "Deployment stage (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "Custom domain name for CloudFront"
  type        = string
  default     = ""
}

# CloudFront Distribution for S3 buckets
resource "aws_cloudfront_distribution" "photos_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "EventFaceMatch Photos CDN - ${var.stage}"
  default_root_object = "index.html"

  # Origin for raw photos bucket
  origin {
    domain_name = aws_s3_bucket.raw_photos.bucket_regional_domain_name
    origin_id   = "S3-raw-photos"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.raw_photos.cloudfront_access_identity_path
    }
  }

  # Origin for QR codes bucket
  origin {
    domain_name = aws_s3_bucket.qr_codes.bucket_regional_domain_name
    origin_id   = "S3-qr-codes"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-raw-photos"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # Cache behavior for QR codes
  ordered_cache_behavior {
    path_pattern     = "/qr-codes/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-qr-codes"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == "" ? true : false
    # For custom domain, use ACM certificate
    # acm_certificate_arn      = var.domain_name != "" ? aws_acm_certificate.cdn[0].arn : null
    # ssl_support_method       = "sni-only"
    # minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "EventFaceMatch CDN"
    Environment = var.stage
  }
}

# Origin Access Identity for raw photos bucket
resource "aws_cloudfront_origin_access_identity" "raw_photos" {
  comment = "OAI for EventFaceMatch raw photos - ${var.stage}"
}

# Update S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "raw_photos_cloudfront" {
  bucket = aws_s3_bucket.raw_photos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.raw_photos.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.raw_photos.arn}/*"
      }
    ]
  })
}

