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

export async function putItem(
  tableName: string,
  item: any,
  conditionExpression?: string,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, any>
): Promise<void> {
  const params: any = {
    TableName: tableName,
    Item: marshall(item),
  }
  if (conditionExpression) params.ConditionExpression = conditionExpression
  if (expressionAttributeNames) params.ExpressionAttributeNames = expressionAttributeNames
  if (expressionAttributeValues) params.ExpressionAttributeValues = marshall(expressionAttributeValues)

  const command = new PutItemCommand(params)
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

/**
 * Pagination-aware query.
 *
 * Returns a single page plus an opaque base64 cursor the caller can feed back
 * in as `cursor` to continue. When there are no more results, `nextCursor` is
 * undefined.
 */
export interface QueryPageParams {
  tableName: string
  keyConditionExpression: string
  expressionAttributeValues: Record<string, any>
  expressionAttributeNames?: Record<string, string>
  filterExpression?: string
  indexName?: string
  limit?: number
  cursor?: string
  scanIndexForward?: boolean
}

export interface QueryPageResult<T = any> {
  items: T[]
  nextCursor?: string
}

function encodeCursor(lek: Record<string, any> | undefined): string | undefined {
  if (!lek) return undefined
  return Buffer.from(JSON.stringify(lek), 'utf8').toString('base64url')
}

function decodeCursor(cursor: string | undefined): Record<string, any> | undefined {
  if (!cursor) return undefined
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
  } catch {
    throw new Error('Invalid pagination cursor')
  }
}

export async function queryItemsPage<T = any>(
  params: QueryPageParams,
): Promise<QueryPageResult<T>> {
  const commandParams: any = {
    TableName: params.tableName,
    KeyConditionExpression: params.keyConditionExpression,
    ExpressionAttributeValues: marshall(params.expressionAttributeValues),
  }
  if (params.indexName) commandParams.IndexName = params.indexName
  if (params.expressionAttributeNames)
    commandParams.ExpressionAttributeNames = params.expressionAttributeNames
  if (params.filterExpression) commandParams.FilterExpression = params.filterExpression
  if (params.limit) commandParams.Limit = params.limit
  if (params.scanIndexForward !== undefined)
    commandParams.ScanIndexForward = params.scanIndexForward

  const lek = decodeCursor(params.cursor)
  if (lek) commandParams.ExclusiveStartKey = marshall(lek)

  const response = await dynamoClient.send(new QueryCommand(commandParams))
  const items = (response.Items ?? []).map((i) => unmarshall(i)) as T[]
  const nextCursor = response.LastEvaluatedKey
    ? encodeCursor(unmarshall(response.LastEvaluatedKey))
    : undefined

  return { items, nextCursor }
}

/**
 * Async generator that iterates *all* pages of a query.
 * Use with `for await (const page of queryAll(...))`.
 */
export async function* queryAllPages<T = any>(
  params: Omit<QueryPageParams, 'cursor'>,
): AsyncGenerator<T[]> {
  let cursor: string | undefined
  do {
    const page = await queryItemsPage<T>({ ...params, cursor })
    yield page.items
    cursor = page.nextCursor
  } while (cursor)
}

export async function scanTable(tableName: string): Promise<any[]> {
  const command = new ScanCommand({
    TableName: tableName,
  })
  const response = await dynamoClient.send(command)
  return (response.Items || []).map(item => unmarshall(item))
}

export interface ScanPageParams {
  tableName: string
  limit?: number
  cursor?: string
  filterExpression?: string
  expressionAttributeValues?: Record<string, any>
  expressionAttributeNames?: Record<string, string>
}

export async function scanTablePage<T = any>(
  params: ScanPageParams,
): Promise<QueryPageResult<T>> {
  const cmd: any = { TableName: params.tableName }
  if (params.limit) cmd.Limit = params.limit
  if (params.filterExpression) cmd.FilterExpression = params.filterExpression
  if (params.expressionAttributeNames)
    cmd.ExpressionAttributeNames = params.expressionAttributeNames
  if (params.expressionAttributeValues)
    cmd.ExpressionAttributeValues = marshall(params.expressionAttributeValues)
  const lek = decodeCursor(params.cursor)
  if (lek) cmd.ExclusiveStartKey = marshall(lek)

  const resp = await dynamoClient.send(new ScanCommand(cmd))
  const items = (resp.Items ?? []).map((i) => unmarshall(i)) as T[]
  const nextCursor = resp.LastEvaluatedKey
    ? encodeCursor(unmarshall(resp.LastEvaluatedKey))
    : undefined
  return { items, nextCursor }
}

/**
 * BatchGetItem with automatic chunking (25 keys/batch) and unprocessed-key
 * retry with exponential backoff.
 */
export async function batchGetItems<T = any>(
  tableName: string,
  keys: Array<Record<string, any>>,
): Promise<T[]> {
  if (keys.length === 0) return []
  const { BatchGetItemCommand } = await import('@aws-sdk/client-dynamodb')
  const chunks: Array<Array<Record<string, any>>> = []
  for (let i = 0; i < keys.length; i += 25) chunks.push(keys.slice(i, i + 25))

  const out: T[] = []
  for (const chunk of chunks) {
    let requestItems: any = {
      [tableName]: { Keys: chunk.map((k) => marshall(k)) },
    }
    let attempt = 0
    while (requestItems[tableName]?.Keys?.length) {
      const resp = await dynamoClient.send(
        new BatchGetItemCommand({ RequestItems: requestItems }),
      )
      const got = resp.Responses?.[tableName] ?? []
      for (const item of got) out.push(unmarshall(item) as T)
      const unprocessed = resp.UnprocessedKeys?.[tableName]?.Keys
      if (!unprocessed || unprocessed.length === 0) break
      requestItems = { [tableName]: { Keys: unprocessed } }
      attempt++
      await new Promise((r) => setTimeout(r, Math.min(100 * 2 ** attempt, 2000)))
    }
  }
  return out
}

export async function updateItem(
  tableName: string,
  key: any,
  updateExpression: string,
  expressionAttributeValues: any,
  expressionAttributeNames?: any,
  conditionExpression?: string
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
  if (conditionExpression) {
    params.ConditionExpression = conditionExpression
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


