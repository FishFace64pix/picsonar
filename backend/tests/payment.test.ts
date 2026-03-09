import { handler } from '../functions/payment/createPaymentIntent';
import { APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';

// Mock Stripe
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        paymentIntents: {
            create: jest.fn().mockResolvedValue({
                client_secret: 'test_client_secret',
            }),
        },
    }));
});

// Mock DynamoDB (getItem for user lookup)
jest.mock('../src/utils/dynamodb', () => ({
    getItem: jest.fn().mockResolvedValue({
        userId: 'test_user_id',
        plan: 'starter',
    }),
}));

// Generate a valid test JWT using the same 'dev-secret-change-in-production' default
const TEST_SECRET = 'dev-secret-change-in-production';
const validToken = jwt.sign({ userId: 'test_user_id', role: 'user' }, TEST_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

describe('createPaymentIntent', () => {
    const mockEvent = {
        headers: {
            Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
            packageId: 'starter',
            type: 'credit_bundle',
            quantity: 1,
            billingData: {
                companyName: 'Test SRL',
                cui: '18547290',      // valid Romanian CUI from validateCUI.ts test cases
                vatPayer: false,
                country: 'Romania',
                city: 'Bucharest',
                street: 'Str. Exemplu 1',
                postalCode: '010101',
                billingEmail: 'test@example.com',
            },
        }),
    } as unknown as APIGatewayProxyEvent;

    it('should create a payment intent successfully', async () => {
        const response = await handler(mockEvent);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
            clientSecret: 'test_client_secret',
        });
    });

    it('should return 400 if body is missing', async () => {
        const eventWithoutBody = { ...mockEvent, body: null } as unknown as APIGatewayProxyEvent;
        const response = await handler(eventWithoutBody);

        expect(response.statusCode).toBe(400);
    });

    it('should return 401 if authorization header is missing', async () => {
        const eventWithoutAuth = { ...mockEvent, headers: {} } as unknown as APIGatewayProxyEvent;
        const response = await handler(eventWithoutAuth);

        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const eventWithBadToken = {
            ...mockEvent,
            headers: { Authorization: 'Bearer obviously-not-a-valid-jwt' },
        } as unknown as APIGatewayProxyEvent;
        const response = await handler(eventWithBadToken);

        expect(response.statusCode).toBe(401);
    });
});
