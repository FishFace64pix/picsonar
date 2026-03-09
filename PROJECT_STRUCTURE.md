# EventFaceMatch Project Structure

```
EventFaceMatch/
├── frontend/                 # React + Vite frontend application
│   ├── src/
│   │   ├── api/             # API client functions
│   │   │   ├── client.ts    # Axios instance with interceptors
│   │   │   ├── auth.ts      # Authentication API calls
│   │   │   └── events.ts    # Events and photos API calls
│   │   ├── components/      # React components
│   │   │   ├── PhotoUpload.tsx      # Drag & drop photo upload
│   │   │   └── WebcamCapture.tsx    # Webcam face capture
│   │   ├── contexts/        # React contexts
│   │   │   └── AuthContext.tsx      # Authentication state
│   │   ├── pages/           # Page components
│   │   │   ├── LandingPage.tsx     # Landing page
│   │   │   ├── LoginPage.tsx        # Login page
│   │   │   ├── RegisterPage.tsx     # Registration page
│   │   │   ├── DashboardPage.tsx    # Events dashboard
│   │   │   ├── EventPage.tsx        # Event management page
│   │   │   └── GuestScanPage.tsx    # Guest face scan page
│   │   ├── types/           # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── App.tsx          # Main app component with routing
│   │   ├── main.tsx         # React entry point
│   │   └── index.css        # Global styles with Tailwind
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/                 # Serverless Lambda functions
│   ├── functions/           # Lambda function handlers
│   │   ├── createEvent.ts           # Create new event
│   │   ├── getEvents.ts             # List all events
│   │   ├── getEvent.ts              # Get single event
│   │   ├── uploadPhoto.ts           # Upload photo endpoint
│   │   ├── processPhoto.ts          # S3 trigger - process uploaded photo
│   │   ├── getEventFaces.ts         # Get all faces for event
│   │   ├── generateQRCodes.ts       # Generate QR codes for faces
│   │   ├── matchFace.ts             # Match guest face to photos
│   │   └── auth/                    # Authentication functions
│   │       ├── login.ts
│   │       ├── register.ts
│   │       └── me.ts
│   ├── src/
│   │   ├── types/           # TypeScript types
│   │   │   └── index.ts
│   │   └── utils/           # Utility functions
│   │       ├── rekognition.ts      # AWS Rekognition helpers
│   │       ├── dynamodb.ts          # DynamoDB helpers
│   │       ├── s3.ts                # S3 helpers
│   │       └── response.ts          # Lambda response helpers
│   ├── serverless.yml       # Serverless Framework configuration
│   ├── tsconfig.json
│   └── package.json
│
├── aws/                     # Terraform infrastructure as code
│   ├── main.tf              # Main Terraform configuration
│   ├── s3-buckets.tf        # S3 bucket definitions
│   ├── dynamodb-tables.tf   # DynamoDB table definitions
│   └── cloudfront.tf        # CloudFront CDN configuration
│
├── package.json             # Root package.json (workspace)
├── README.md                # Project overview
├── DEPLOYMENT.md            # Deployment instructions
└── .gitignore
```

## Key Technologies

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Backend
- **AWS Lambda** - Serverless functions
- **Serverless Framework** - Deployment and configuration
- **TypeScript** - Type safety
- **AWS SDK v3** - AWS service clients

### AWS Services
- **S3** - Photo and QR code storage
- **Rekognition** - Face detection and matching
- **DynamoDB** - Metadata storage
- **API Gateway** - REST API
- **CloudFront** - CDN for static assets
- **Lambda** - Serverless compute

## Data Flow

1. **Photo Upload Flow:**
   - Frontend → API Gateway → uploadPhoto Lambda → S3
   - S3 event → processPhoto Lambda → Rekognition → DynamoDB

2. **Face Matching Flow:**
   - Guest uploads selfie → matchFace Lambda → Rekognition SearchFacesByImage
   - Returns matched face IDs → Query DynamoDB for associated photos

3. **QR Code Generation:**
   - generateQRCodes Lambda → Query faces → Generate QR codes → Upload to S3 → Create ZIP

## Database Schema

### Events Table
- `eventId` (PK)
- `userId`
- `eventName`
- `createdAt`
- `status`
- `totalPhotos`
- `totalFaces`

### Photos Table
- `photoId` (PK)
- `eventId` (GSI)
- `s3Url`
- `s3Key`
- `faces[]`
- `uploadedAt`

### Faces Table
- `faceId` (PK)
- `eventId` (GSI)
- `rekognitionFaceId`
- `samplePhotoUrl`
- `associatedPhotos[]`
- `qrCodeUrl`

