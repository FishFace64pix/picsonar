import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Utility to check if a request originates from Romania.
 * Uses the CloudFront-Viewer-Country header provided by AWS.
 * 
 * @param event - The API Gateway proxy event
 * @returns boolean - true if from Romania or if check is disabled (e.g., local dev)
 */
export const isFromRomania = (event: APIGatewayProxyEvent): boolean => {
    // In local development, headers might not be present or stage might be 'dev'
    const stage = process.env.STAGE || 'dev';
    if (stage === 'dev') {
        // Log skip for dev
        console.log('[GeoRestriction] Skipping check for dev stage');
        return true;
    }

    // Standard AWS CloudFront header for country
    const country = event.headers['CloudFront-Viewer-Country'] || event.headers['cloudfront-viewer-country'];
    
    if (!country) {
        // If header is missing, we might be in a direct API Gateway call without CF 
        // or a testing environment. 
        // For strictness, return false in production if header is missing, 
        // but for now, we'll log it.
        console.warn('[GeoRestriction] CloudFront-Viewer-Country header missing');
        return true; // Allow for now to prevent breaking changes if CF is not fully configured
    }

    return country.toUpperCase() === 'RO';
};
