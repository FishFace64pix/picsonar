variable "stage" {
  description = "Deployment stage (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# Events Table
resource "aws_dynamodb_table" "events" {
  name           = "eventfacematch-events-${var.stage}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "eventId"

  attribute {
    name = "eventId"
    type = "S"
  }

  tags = {
    Name        = "EventFaceMatch Events"
    Environment = var.stage
  }
}

# Faces Table
resource "aws_dynamodb_table" "faces" {
  name           = "eventfacematch-faces-${var.stage}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "faceId"

  attribute {
    name = "faceId"
    type = "S"
  }

  attribute {
    name = "eventId"
    type = "S"
  }

  global_secondary_index {
    name     = "eventId-index"
    hash_key = "eventId"
  }

  tags = {
    Name        = "EventFaceMatch Faces"
    Environment = var.stage
  }
}

# Photos Table
resource "aws_dynamodb_table" "photos" {
  name           = "eventfacematch-photos-${var.stage}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "photoId"

  attribute {
    name = "photoId"
    type = "S"
  }

  attribute {
    name = "eventId"
    type = "S"
  }

  global_secondary_index {
    name     = "eventId-index"
    hash_key = "eventId"
  }

  tags = {
    Name        = "EventFaceMatch Photos"
    Environment = var.stage
  }
}

