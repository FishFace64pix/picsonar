import { LambdaResponse } from '../types'

export function successResponse(data: any, statusCode: number = 200): LambdaResponse {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
      'Access-Control-Allow-Credentials': 'false',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }
}

export function errorResponse(message: string, statusCode: number = 500): LambdaResponse {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
      'Access-Control-Allow-Credentials': 'false',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error: message }),
  }
}

