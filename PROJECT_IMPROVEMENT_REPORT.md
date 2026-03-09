# EventFaceMatch Project Analysis and Improvement Report

## 1. Executive Summary
The EventFaceMatch project is a well-structured serverless application using AWS services (Lambda, DynamoDB, Rekognition, S3) and a React frontend. The core functionality of event creation, photo uploading, and face matching is implemented. However, there are significant opportunities for optimization, particularly in the face-matching logic and test coverage.

## 2. Code Quality & Architecture

### Backend
-   **Structure**: The `functions/` directory structure is clean and modular.
-   **Database Access**: The `matchFace.ts` function performs a query inside a loop, which is inefficient.
    -   *Current*: For each face matched by Rekognition, it queries DynamoDB to find metadata.
    -   *Improvement*: Batch queries or optimize the data model to fetch all necessary data in fewer requests.
-   **Error Handling**: Basic try-catch blocks are used. A centralized error handling middleware or wrapper would ensure consistent error responses.
-   **Type Safety**: TypeScript is used, which is excellent. Ensure `any` types are minimized.

### Frontend
-   **Structure**: Standard React/Vite structure. Components are reasonably separated.
-   **State Management**: Uses Context API (`AuthContext`). For larger state (like caching event photos), consider React Query or similar.
-   **Hardcoded Logic**: Some business logic (e.g., event limits check in `DashboardPage.tsx`) resides in the frontend. This should be enforced/calculated on the backend to prevent tampering.

## 3. Performance & Scalability

### `matchFace` Optimization
The current implementation of `matchFace` is a potential bottleneck:
```typescript
// Current Logic
for (const match of faceMatches) {
  const allFaces = await queryItems(...) // Database call inside loop!
  // ...
}
```
**Recommendation**:
1.  Query `FacesTable` once for the `eventId`.
2.  Create a map/dictionary of `rekognitionFaceId` -> `FaceRecord` in memory.
3.  Iterate through `faceMatches` and look up in the map.
This reduces database calls from `N` to `1`.

### Image Optimization
-   Ensure uploaded photos are resized/optimized before storage or delivery. Serving raw photos can be slow and expensive.
-   Use `sharp` or similar in a Lambda Layer to generate thumbnails for the gallery view.

## 4. Testing & Reliability
-   **Current Status**: Very coverage is low. Only `payment.test.ts` and `format.test.ts` were found.
-   **Critical Gaps**:
    -   `matchFace` logic (critical path).
    -   `processPhoto` (S3 trigger logic).
    -   End-to-end flows (Upload -> Index -> Search).
-   **Recommendation**: Implement integration tests using `serverless-offline` or mocked AWS services to verify flow without deploying.

## 5. Security
-   **Input Validation**: Ensure all API inputs (body, query params) are validated (e.g., using `zod` or `joi`).
-   **CORS**: `serverless.yml` has wildcard CORS (`origin: '*'`). For production, this should be restricted to the actual frontend domain.
-   **Least Privilege**: IAM roles in `serverless.yml` are somewhat broad (e.g., `rekognition:IndexFaces` on `*`). Scope these down if possible.

## 6. Recommended Roadmap

### Phase 1: Optimization & Hardening (Immediate)
1.  **Refactor `matchFace.ts`**: Fix the N+1 query problem.
2.  **Add Tests**: Write unit tests for `matchFace` and `processPhoto`.
3.  **Input Validation**: Add schema validation for API endpoints.

### Phase 2: Feature & UX (Short-term)
1.  **Image Thumbnails**: Implement thumbnail generation for faster gallery loading.
2.  **Frontend State**: Refactor data fetching to use a library like generic `swr` or `react-query` for better caching.

### Phase 3: Operations (Long-term)
1.  **CI/CD**: Set up GitHub Actions for automated testing and deployment.
2.  **Observability**: Enable AWS X-Ray and set up CloudWatch alarms for errors/latency.
