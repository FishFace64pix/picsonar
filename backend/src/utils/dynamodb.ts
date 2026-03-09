import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
  ScanCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

const dynamoClient = new DynamoDBClient({ region: process.env.REGION || 'us-east-1' })

export async function putItem(tableName: string, item: any): Promise<void> {
  const command = new PutItemCommand({
    TableName: tableName,
    Item: marshall(item),
  })
  await dynamoClient.send(command)
}

export async function getItem(tableName: string, key: any): Promise<any | null> {
  const command = new GetItemCommand({
    TableName: tableName,
    Key: marshall(key),
  })
  const response = await dynamoClient.send(command)
  return response.Item ? unmarshall(response.Item) : null
}

export async function queryItems(
  tableName: string,
  keyConditionExpression: string,
  expressionAttributeValues: any,
  indexName?: string
): Promise<any[]> {
  const commandParams: any = {
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: marshall(expressionAttributeValues),
  }

  if (indexName) {
    commandParams.IndexName = indexName
  }

  const command = new QueryCommand(commandParams)
  const response = await dynamoClient.send(command)
  return (response.Items || []).map(item => unmarshall(item))
}

export async function scanTable(tableName: string): Promise<any[]> {
  const command = new ScanCommand({
    TableName: tableName,
  })
  const response = await dynamoClient.send(command)
  return (response.Items || []).map(item => unmarshall(item))
}

export async function updateItem(
  tableName: string,
  key: any,
  updateExpression: string,
  expressionAttributeValues: any,
  expressionAttributeNames?: any
): Promise<void> {
  const params: any = {
    TableName: tableName,
    Key: marshall(key),
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: marshall(expressionAttributeValues),
  }

  if (expressionAttributeNames) {
    params.ExpressionAttributeNames = expressionAttributeNames
  }

  const command = new UpdateItemCommand(params)
  await dynamoClient.send(command)
}

export const deleteItem = async (tableName: string, key: Record<string, any>) => {
  const command = new DeleteItemCommand({
    TableName: tableName,
    Key: marshall(key),
  })
  return dynamoClient.send(command)
}


