import { createConsumer, KAFKA_TOPICS } from '@halalgo/kafka';
import { esClient } from '../elastic/client.js';
import { INDICES } from '../elastic/indices.js';
import type { KafkaEvent, StoreStatusChangedPayload } from '@halalgo/types';

export async function startSearchConsumer(): Promise<void> {
  await createConsumer(
    [KAFKA_TOPICS.STORE_STATUS_CHANGED],
    async (event: KafkaEvent<unknown>, raw) => {
      if (raw.topic === KAFKA_TOPICS.STORE_STATUS_CHANGED) {
        const payload = event.payload as StoreStatusChangedPayload;
        await esClient.update({
          index: INDICES.STORES,
          id:    payload.storeId,
          doc:   { isOpen: payload.isOpen, isVerified: payload.isVerified },
          doc_as_upsert: true,
        });
      }
    },
  );
}
