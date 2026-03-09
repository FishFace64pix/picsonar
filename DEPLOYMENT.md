# EventFaceMatch Deployment Guide

## Prerequisites

- Node.js 20.x or higher
- AWS CLI configured with appropriate credentials
- Serverless Framework CLI (`npm install -g serverless`)
- Terraform (for infrastructure, optional - Serverless can create resources)

## Setup Instructions

### 1. Install Dependencies

```bash
# Root
npm install

# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Configure Environment Variables

#### Frontend
```bash
cd frontend
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL to your API Gateway URL
```

#### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your AWS configuration
```

### 3. Deploy Backend (Serverless)

```bash
cd backend

# Deploy to dev
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

After deployment, note the API Gateway URL and update the frontend `.env` file.

### 4. Deploy Infrastructure (Optional - Terraform)

If you want to manage infrastructure separately:

```bash
cd aws
terraform init
terraform plan
terraform apply
```

### 5. Build and Deploy Frontend

```bash
cd frontend
npm run build
```

Deploy the `dist/` folder to your hosting service (S3 + CloudFront, Vercel, Netlify, etc.)

## AWS Services Setup

### 1. Create Rekognition Collection

```bash
aws rekognition create-collection \
  --collection-id eventfacematch-collection-dev \
  --region us-east-1
```

### 2. Configure S3 Buckets

The Serverless framework will create the buckets automatically, but you may need to configure:
- CORS policies for photo uploads
- Lifecycle policies for old photos
- Public access for QR codes bucket

### 3. Set Up API Gateway

The Serverless framework handles this automatically. Ensure:
- CORS is enabled (already configured in serverless.yml)
- Binary media types are set for image uploads

## Development

### Run Frontend Locally

```bash
cd frontend
npm run dev
```

### Run Backend Locally

```bash
cd backend
serverless offline
```

## Testing

### Test Photo Upload

1. Create an event via API or dashboard
2. Upload a photo using the upload endpoint
3. Check S3 bucket for the uploaded file
4. Verify Lambda processes the photo and indexes faces

### Test Face Matching

1. Use the guest scan page
2. Upload a selfie or use webcam
3. Verify matching photos are returned

## Troubleshooting

### Lambda Function Errors

Check CloudWatch logs:
```bash
serverless logs -f functionName --tail
```

### S3 Upload Issues

- Verify bucket permissions
- Check CORS configuration
- Ensure API Gateway binary media types are configured

### Rekognition Errors

- Verify collection exists
- Check IAM permissions
- Ensure images meet Rekognition requirements (min 80x80 pixels)

## Production Checklist

- [ ] Set up custom domain for API Gateway
- [ ] Configure CloudFront for frontend
- [ ] Set up AWS Cognito for authentication
- [ ] Configure proper IAM roles and policies
- [ ] Set up monitoring and alerts
- [ ] Configure backup for DynamoDB
- [ ] Set up S3 lifecycle policies
- [ ] Enable CloudWatch logging
- [ ] Set up error tracking (e.g., Sentry)

