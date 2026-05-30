import { Kafka, Producer, Partitioners } from 'kafkajs';
import { randomUUID } from 'crypto';
import type { KafkaEvent } from '@halalgo/types';
import type { KafkaTopic } from './topics.js';

function createKafkaClient(): Kafka {
  const brokers = process.env['KAFKA_BOOTSTRAP_SERVERS'];
  const apiKey = process.env['KAFKA_API_KEY'];
  const apiSecret = process.env['KAFKA_API_SECRET'];

  if (!brokers || !apiKey || !apiSecret) {
    throw new Error('Missing Kafka environment variables: KAFKA_BOOTSTRAP_SERVERS, KAFKA_API_KEY, KAFKA_API_SECRET');
  }

  return new Kafka({
    clientId: 'halalgo',
    brokers: [brokers],
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: apiKey,
      password: apiSecret,
    },
  });
}

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  const kafka = createKafkaClient();
  producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
  });
  await producer.connect();
  return producer;
}

export async function publishEvent<T>(
  topic: KafkaTopic,
  payload: T,
  key?: string,
): Promise<void> {
  const p = await getProducer();
  const event: KafkaEvent<T> = {
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    payload,
  };

  await p.send({
    topic,
    messages: [
      {
        key: key ?? randomUUID(),
        value: JSON.stringify(event),
      },
    ],
  });
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
