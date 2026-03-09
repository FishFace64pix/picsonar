import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';

export const parseBody = <T>(event: APIGatewayProxyEvent, schema: z.Schema<T>): T => {
    if (!event.body) {
        throw new Error('Missing request body');
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(event.body);
    } catch (error) {
        throw new Error('Invalid JSON body');
    }

    const result = schema.safeParse(parsedBody);

    if (!result.success) {
        // queries 'issues' instead of 'errors' to be safe with Zod versions, or use ZodError type
        const errorMessages = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation Error: ${errorMessages}`);
    }

    return result.data;
};

export const validateSchema = <T>(data: any, schema: z.Schema<T>): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errorMessages = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation Error: ${errorMessages}`);
    }
    return result.data;
}
