/**
 * Idempotent Rekognition collection bootstrap.
 *
 * Why not a CFN custom resource?
 *   - AWS::Rekognition::Collection does not exist.
 *   - A custom resource that wraps this API couples stack updates to a
 *     Lambda's availability — a broken custom resource Lambda blocks every
 *     future stack update until manually skip-resource'd.
 *   - A standalone script is trivially debuggable and the alternative
 *     (`aws rekognition list-collections`) works offline.
 *
 * Usage:
 *   AWS_REGION=eu-central-1 STAGE=dev ts-node scripts/ensureRekognitionCollection.ts
 *
 * Wired into CI via the deploy workflow (see .github/workflows/deploy.yml):
 * runs after `serverless deploy` but before the smoke-test step.
 *
 * Exit code:
 *   0 — collection exists (whether we created it or it was already there)
 *   1 — hard error (credentials, permission, API outage)
 */
import {
  RekognitionClient,
  CreateCollectionCommand,
  DescribeCollectionCommand,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '@aws-sdk/client-rekognition'

const stage = process.env.STAGE ?? process.env.SLS_STAGE ?? 'dev'
const region = process.env.AWS_REGION ?? 'eu-central-1'
const collectionId =
  process.env.REKOGNITION_COLLECTION_ID ??
  `eventfacematch-collection-${stage}`

async function main() {
  const client = new RekognitionClient({ region })
  console.log(
    `[rekognition] ensuring collection "${collectionId}" in ${region}`,
  )

  // Describe first — cheaper and a better audit log than blind-creating.
  try {
    const existing = await client.send(
      new DescribeCollectionCommand({ CollectionId: collectionId }),
    )
    console.log(
      `[rekognition] collection exists (FaceCount=${existing.FaceCount ?? 0}, ARN=${existing.CollectionARN})`,
    )
    return
  } catch (err) {
    if (!(err instanceof ResourceNotFoundException)) {
      throw err
    }
    // falls through to create
  }

  try {
    const created = await client.send(
      new CreateCollectionCommand({ CollectionId: collectionId }),
    )
    console.log(
      `[rekognition] created collection (StatusCode=${created.StatusCode}, ARN=${created.CollectionArn})`,
    )
  } catch (err) {
    if (err instanceof ResourceAlreadyExistsException) {
      // Benign race: another deploy created it between our describe and create.
      console.log('[rekognition] collection already exists (race) — ok')
      return
    }
    throw err
  }
}

main().catch((err) => {
  console.error('[rekognition] bootstrap failed', err)
  process.exit(1)
})
