import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import type { KafkaEvent } from '@halalgo/types';
import type { KafkaTopic } from './topics.js';

function createKafkaClient(): Kafka {
  const brokers = process.env['KAFKA_BOOTSTRAP_SERVERS'];
  const apiKey = process.env['KAFKA_API_KEY'];
  const apiSecret = process.env['KAFKA_API_SECRET'];
  const groupId = process.env['KAFKA_GROUP_ID'] ?? 'halalgo';

  if (!brokers || !apiKey || !apiSecret) {
    throw new Error('Missing Kafka environment variables');
  }

  return new Kafka({
    clientId: `halalgo-${groupId}`,
    brokers: [brokers],
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: apiKey,
      password: apiSecret,
    },
  });
}

export type EventHandler<T> = (event: KafkaEvent<T>, raw: EachMessagePayload) => Promise<void>;

export async function createConsumer<T>(
  topics: KafkaTopic[],
  handler: EventHandler<T>,
): Promise<Consumer> {
  const kafka = createKafkaClient();
  const groupId = process.env['KAFKA_GROUP_ID'] ?? 'halalgo';

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();

  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async (payload) => {
      const raw = payload.message.value?.toString();
      if (!raw) return;

      const event = JSON.parse(raw) as KafkaEvent<T>;
      await handler(event, payload);
    },
  });

  return consumer;
}
