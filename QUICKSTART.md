# Quick Start Guide

Get EventFaceMatch up and running in 5 minutes.

## Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

## Step 2: Configure AWS

1. Ensure AWS CLI is configured:
```bash
aws configure
```

2. Create Rekognition collection:
```bash
aws rekognition create-collection \
  --collection-id eventfacematch-collection-dev \
  --region us-east-1
```

## Step 3: Deploy Backend

```bash
cd backend
npm run deploy:dev
```

After deployment, copy the API Gateway URL from the output.

## Step 4: Configure Frontend

1. Create `.env` file in `frontend/`:
```bash
cd frontend
echo "VITE_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev" > .env
```

Replace `https://your-api-id...` with your actual API Gateway URL.

## Step 5: Run Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## Step 6: Test the Application

1. **Register/Login**: Create an account or login
2. **Create Event**: Click "Create Event" and give it a name
3. **Upload Photos**: Drag and drop photos or click to browse
4. **Wait for Processing**: Photos are automatically processed (check CloudWatch logs)
5. **View Faces**: Once processed, faces will appear in the "Detected People" section
6. **Generate QR Codes**: Click "Generate QR Codes" to create QR codes for each person
7. **Test Guest Flow**: Open the guest link and try face scanning

## Troubleshooting

### Backend deployment fails
- Check AWS credentials: `aws sts get-caller-identity`
- Verify IAM permissions for Lambda, S3, DynamoDB, Rekognition
- Check Serverless Framework version: `serverless --version`

### Photos not processing
- Check S3 bucket trigger configuration in `serverless.yml`
- Verify Lambda has S3 read permissions
- Check CloudWatch logs for errors

### Face matching not working
- Ensure Rekognition collection exists
- Verify faces were indexed (check DynamoDB Faces table)
- Check image quality (minimum 80x80 pixels)

### Frontend can't connect to API
- Verify API Gateway URL in `.env` file
- Check CORS configuration in `serverless.yml`
- Test API endpoint directly: `curl https://your-api-url/dev/events`

## Next Steps

- Set up AWS Cognito for real authentication
- Configure CloudFront for frontend hosting
- Set up monitoring and alerts
- Add error tracking (Sentry, etc.)
- Implement proper multipart form data parsing for photo uploads

