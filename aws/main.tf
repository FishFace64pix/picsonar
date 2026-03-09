terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "stage" {
  description = "Deployment stage (dev, staging, prod)"
  type        = string
  default     = "dev"
}

output "raw_photos_bucket" {
  value = aws_s3_bucket.raw_photos.id
}

output "face_index_bucket" {
  value = aws_s3_bucket.face_index.id
}

output "qr_codes_bucket" {
  value = aws_s3_bucket.qr_codes.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.photos_cdn.domain_name
}

