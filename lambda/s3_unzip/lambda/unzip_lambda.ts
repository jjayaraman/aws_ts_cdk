import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'

import { S3Event } from 'aws-lambda'
import { Readable } from 'stream'
import * as unzipper from 'unzipper'
import { pipeline } from 'stream/promises'

const s3Client = new S3Client({})

export const handler = async (event: S3Event) => {
  console.log('Received S3 event:', JSON.stringify(event))

  const bucketName = event.Records[0].s3.bucket.name
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, ' ')
  )
  const destinationBucketName = bucketName // Optionally use the same bucket or a different one

  if (!key.endsWith('.zip')) {
    console.error('The uploaded file is not a ZIP file.')
    return
  }

  try {
    console.log(`Downloading ZIP file: ${key} from bucket: ${bucketName}`)

    // Fetch the ZIP file from S3
    const { Body } = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )

    if (!Body) {
      throw new Error('Failed to fetch ZIP file from S3: Body is undefined')
    }

    // Ensure the Body is a Readable stream
    const zipStream = toReadable(Body)

    console.log('Unzipping the file...')

    // Parse the ZIP file
    const unzipStream = zipStream.pipe(unzipper.Parse())

    unzipStream.on('entry', (entry) => {
      console.log(`Processing entry: ${entry.path}`)
    })
    unzipStream.on('error', (err) => {
      console.error('Unzip stream error:', err)
    })
    unzipStream.on('finish', () => {
      console.log('Unzip stream finished.')
    })
    unzipStream.on('close', () => {
      console.log('Unzip stream closed.')
    })

    console.log(`unzipStream: ${unzipStream}`)

    for await (const entry of unzipStream) {
      const { path, type } = entry

      if (type === 'File') {
        console.log(`Processing file: ${path}`)

        try {
          await pipeline(
            entry, // Source
            async function* (source) {
              for await (const chunk of source) {
                yield chunk
              }
            },
            Readable.from, // Convert AsyncIterable<any> to Readable
            async (stream) => {
              await s3Client.send(
                new PutObjectCommand({
                  Bucket: destinationBucketName,
                  Key: `unzipped/${path}`,
                  Body: stream as any,
                })
              )
            }
          )
          console.log(`Uploaded file: ${path}`)
        } catch (error) {
          console.error(`Failed to process file: ${path}, error: ${error}`)
          entry.autodrain() // Drain in case of an error
        }
      } else {
        console.log(`Skipping directory or unsupported entry: ${path}`)
        entry.autodrain()
      }
    }
    console.log('Done...')
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Unzip and upload successful',
      }),
    }
  } catch (error) {
    console.error('Error during unzipping or uploading:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error during unzip and upload',
        error: error,
      }),
    }
  }
}

// Helper function to convert various body types to a readable stream
// Convert Web Stream (ReadableStream) to Node.js Stream (Readable)
function toReadable(body: any): Readable {
  if (body instanceof Readable) {
    return body
  }
  if (body instanceof Blob) {
    // Convert Blob to a Web Stream and then to a Node.js Readable Stream
    return Readable.from(body.stream() as any)
  }
  if (body instanceof ReadableStream) {
    // Convert ReadableStream to Node.js Readable
    return Readable.from(
      (async function* () {
        const reader = body.getReader()
        let done = false
        while (!done) {
          const { value, done: readerDone } = await reader.read()
          if (value) yield value
          done = readerDone
        }
      })()
    )
  }
  throw new Error('Unsupported body type. Cannot convert to Readable stream.')
}
